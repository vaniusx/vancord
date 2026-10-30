import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";

import { useAuthStore, useCurrentUser } from "@/features/auth/auth-store";
import { useAppStore } from "@/features/app/app-store";
import { useProfile } from "@/features/profiles/use-profile";
import { useProfileCache } from "@/features/profiles/profile-cache";
import { useAllChannels } from "@/features/servers/use-servers";
import { useDms } from "@/features/dm/use-dms";
import type { MessageRow, PresenceStatus, ReactionRow } from "@/lib/models";
import { messagesKey } from "@/features/messages/use-messages";
import { supabase } from "@/lib/supabase";
import { isTauri } from "@/lib/tauri";
import { playCue } from "@/lib/sounds";

const PRESENCE_STATUSES: PresenceStatus[] = [
  "online",
  "idle",
  "dnd",
  "invisible",
  "offline",
];

interface PresenceState {
  statuses: Record<string, PresenceStatus>;
  setAll: (statuses: Record<string, PresenceStatus>) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  statuses: {},
  setAll: (statuses) => set({ statuses }),
}));

/**
 * Resolves the status shown next to a name.
 *
 * The presence channel is the only source of truth for other people. Falling
 * back to the profile column made every member look online forever: the column
 * defaults to 'online' and nothing writes it when a client disconnects, so
 * casting the fallback to 'offline' is what makes the dot honest.
 */
export function resolvePresence(
  live: PresenceStatus | undefined,
  userId: string | null | undefined,
  currentUserId: string | null | undefined,
  fallback: PresenceStatus = "offline",
): PresenceStatus {
  if (live === "invisible") return "offline";
  if (live) return live;

  // Before the first presence sync the local user keeps their chosen status so
  // the rail does not flash "offline" on launch.
  if (userId && userId === currentUserId) return fallback;
  return "offline";
}

export function useLiveStatus(userId: string, fallback: PresenceStatus = "offline") {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const live = usePresenceStore((state) => (userId ? state.statuses[userId] : undefined));
  return resolvePresence(live, userId, currentUserId, fallback);
}

type RealtimeChannel = ReturnType<NonNullable<typeof supabase>["channel"]>;

const TypingContext = createContext<{
  sendTyping: (channelId: string) => void;
}>({ sendTyping: () => {} });

export function useTypingSender() {
  return useContext(TypingContext);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { isPermissionGranted, requestPermission } = await import(
      "@tauri-apps/plugin-notification"
    );
    if (await isPermissionGranted()) return true;
    // On Android this triggers the POST_NOTIFICATIONS runtime prompt; on
    // Windows it is the app-level notification consent.
    return (await requestPermission()) === "granted";
  } catch {
    return false;
  }
}

let ownStatus: PresenceStatus = "online";

/**
 * Notifications respect the user's own presence: "Do not disturb" means quiet,
 * which is what the setting claims and what it did not do before — the check
 * only looked at the global switch.
 */
function notificationsAllowed(): boolean {
  const state = useAppStore.getState();
  if (!state.notificationsEnabled) return false;
  if (ownStatus === "dnd") return false;
  if (ownStatus === "invisible") return false;
  return true;
}

async function notify(title: string, body: string) {
  if (!isTauri()) return;
  if (!notificationsAllowed()) return;
  playCue("message");
  try {
    const { sendNotification } = await import(
      "@tauri-apps/plugin-notification"
    );
    const granted = await requestNotificationPermission();
    if (!granted) return;
    sendNotification({ title, body });
  } catch {
    // notifications are best-effort
  }
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  // Every server channel plus every DM. The realtime subscription is filtered to
  // this set: without a filter Postgres streams every message in the database to
  // every connected client, which is what made the app feel heavy.
  const { data: allChannels } = useAllChannels();
  const { data: dms } = useDms();

  const accessibleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const channel of allChannels ?? []) ids.add(channel.id);
    for (const dm of dms ?? []) ids.add(dm.id);
    return [...ids].sort();
  }, [allChannels, dms]);

  const channelFilterKey = accessibleIds.join(",");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const statusRef = useRef<PresenceStatus>("online");
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastTypingSent = useRef<Record<string, number>>({});
  const lastNotified = useRef<Record<string, number>>({});

  const sendTyping = useMemo(
    () => (channelId: string) => {
      const now = Date.now();
      if ((lastTypingSent.current[channelId] ?? 0) + 2500 > now) return;
      lastTypingSent.current[channelId] = now;
      void channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { channelId, userId: user?.id },
      });
    },
    [user?.id],
  );

  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;

    const upsertProfiles = useProfileCache.getState().upsert;
    const channel = client.channel("vancord-realtime", {
      config: {
        presence: { key: user.id },
        broadcast: { self: false },
      },
    });
    channelRef.current = channel;

    // Supabase supports a single eq/in filter per subscription, so every
    // accessible channel is listed in one `in.` expression.
    const channelFilter =
      accessibleIds.length > 0 ? `channel_id=in.(${accessibleIds.join(",")})` : null;

    type MessagesData = { messages: MessageRow[]; hasMore: boolean };

    // Realtime used to invalidate the whole message list on every event, which
    // refetched 40 messages (with four nested joins) for each chat line and made
    // busy channels stutter. The cache is now patched in place instead.
    const patchChannel = (
      channelId: string,
      mutate: (messages: MessageRow[]) => MessageRow[],
    ) => {
      queryClient.setQueryData<MessagesData>(messagesKey(channelId), (current) =>
        current ? { ...current, messages: mutate(current.messages) } : current,
      );
    };

    const removeEverywhere = (messageId: string) => {
      queryClient.setQueriesData<MessagesData>({ queryKey: ["messages"] }, (current) =>
        current
          ? {
              ...current,
              messages: current.messages.filter((message) => message.id !== messageId),
            }
          : current,
      );
    };

    const patchReaction = (
      messageId: string,
      userId: string,
      emoji: string,
      active: boolean,
    ) => {
      queryClient.setQueriesData<MessagesData>({ queryKey: ["messages"] }, (current) => {
        if (!current?.messages.some((message) => message.id === messageId)) return current;
        return {
          ...current,
          messages: current.messages.map((message) => {
            if (message.id !== messageId) return message;
            const without = message.reactions.filter(
              (reaction) => !(reaction.user_id === userId && reaction.emoji === emoji),
            );
            const reactions: ReactionRow[] = active
              ? [...without, { message_id: messageId, user_id: userId, emoji }]
              : without;
            return { ...message, reactions };
          }),
        };
      });
    };

    channel
      .on(
        "postgres_changes",
        channelFilter
          ? { event: "*", schema: "public", table: "messages", filter: channelFilter }
          : { event: "*", schema: "public", table: "messages", filter: "channel_id=eq.00000000-0000-0000-0000-000000000000" },
        (payload) => {
          void queryClient.invalidateQueries({ queryKey: ["unread"] });

          if (payload.eventType === "DELETE") {
            const removed = (payload.old as { id?: string } | null)?.id;
            if (removed) removeEverywhere(removed);
            return;
          }

          const row = payload.new as {
            id: string;
            channel_id: string;
            author_id: string | null;
            bot_id?: string | null;
            content?: string;
            created_at: string;
            edited_at?: string | null;
          };

          if (payload.eventType === "UPDATE") {
            patchChannel(row.channel_id, (messages) =>
              messages.map((message) =>
                message.id === row.id
                  ? {
                      ...message,
                      content: row.content ?? "",
                      edited_at: row.edited_at ?? null,
                    }
                  : message,
              ),
            );
            return;
          }

          const cachedAuthor = row.author_id
            ? (useProfileCache.getState().profiles[row.author_id] ?? null)
            : null;

          const buildMessage = (author: MessageRow["author"]): MessageRow => ({
            id: row.id,
            channel_id: row.channel_id,
            author_id: row.author_id,
            bot_id: row.bot_id ?? null,
            content: row.content ?? "",
            created_at: row.created_at,
            edited_at: row.edited_at ?? null,
            author,
            bot: null,
            message_attachments: [],
            reactions: [],
          });

          patchChannel(row.channel_id, (messages) =>
            messages.some((message) => message.id === row.id)
              ? messages
              : [...messages, buildMessage(cachedAuthor)],
          );

          if (!row.author_id || row.author_id === user.id) return;

          const state = useAppStore.getState();
          if (document.hasFocus() && state.activeChannelId === row.channel_id) {
            void client.rpc("mark_channel_read", {
              target_channel: row.channel_id,
            });
            return;
          }

          const throttleKey = row.channel_id;
          const now = Date.now();
          if ((lastNotified.current[throttleKey] ?? 0) + 4000 > now) return;
          lastNotified.current[throttleKey] = now;

          void (async () => {
            const cached = useProfileCache.getState().profiles;
            let authorName = cached[row.author_id!]?.display_name;
            if (!authorName) {
              const { data } = await client
                .from("profiles")
                .select("id, username, display_name, avatar_url, accent_color, status, custom_status")
                .eq("id", row.author_id!)
                .maybeSingle();
              if (data) {
                upsertProfiles([data as never]);
                authorName = (data as { display_name: string }).display_name;
                patchChannel(row.channel_id, (messages) =>
                  messages.map((message) =>
                    message.id === row.id
                      ? { ...message, author: data as never }
                      : message,
                  ),
                );
              }
            }
            await notify(
              authorName ?? "Vancord",
              (row.content ?? "").slice(0, 140) || "Yeni bir mesaj",
            );
          })();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        (payload) => {
          const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as {
            message_id?: string;
            user_id?: string;
            emoji?: string;
          } | null;
          if (!row?.message_id || !row?.user_id || !row?.emoji) return;
          patchReaction(
            row.message_id,
            row.user_id,
            row.emoji,
            payload.eventType !== "DELETE",
          );
        },
      )
.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["channels"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "server_members" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["members"] });
          void queryClient.invalidateQueries({ queryKey: ["servers"] });
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const data = payload as { channelId?: string; userId?: string };
        if (!data.channelId || !data.userId || data.userId === user.id) return;

        useAppStore.getState().setTyping(data.channelId, data.userId, true);
        const key = `${data.channelId}:${data.userId}`;
        clearTimeout(typingTimers.current[key]);
        typingTimers.current[key] = setTimeout(() => {
          useAppStore.getState().setTyping(data.channelId!, data.userId!, false);
        }, 4000);
      })
      .on("presence", { event: "sync" }, () => {
        const raw = channel.presenceState() as Record<
          string,
          Array<{ status?: string }>
        >;
        const statuses: Record<string, PresenceStatus> = {};
        for (const [userId, entries] of Object.entries(raw)) {
          const status = entries[0]?.status as PresenceStatus | undefined;
          if (status && PRESENCE_STATUSES.includes(status)) {
            statuses[userId] = status;
          }
        }
        usePresenceStore.getState().setAll(statuses);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({
            user_id: user.id,
            status: statusRef.current,
          });
        }
      });

    return () => {
      channelRef.current = null;
      Object.values(typingTimers.current).forEach(clearTimeout);
      typingTimers.current = {};
      void client.removeChannel(channel);
    };
    // channelFilterKey re-subscribes when a server or DM is added or removed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryClient, channelFilterKey]);

  useEffect(() => {
    statusRef.current = profile?.status ?? "online";
    ownStatus = statusRef.current;
    const channel = channelRef.current;
    if (!channel || !user) return;
    void channel.track({ user_id: user.id, status: statusRef.current });
  }, [profile?.status, user]);

  const value = useMemo(() => ({ sendTyping }), [sendTyping]);

  return (
    <TypingContext.Provider value={value}>{children}</TypingContext.Provider>
  );
}
