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

import { useCurrentUser } from "@/features/auth/auth-store";
import { useAppStore } from "@/features/app/app-store";
import { useProfile } from "@/features/profiles/use-profile";
import { useProfileCache } from "@/features/profiles/profile-cache";
import type { PresenceStatus } from "@/lib/models";
import { supabase } from "@/lib/supabase";
import { isTauri } from "@/lib/tauri";

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

export function useLiveStatus(userId: string, fallback: PresenceStatus) {
  const live = usePresenceStore((state) => state.statuses[userId]);
  if (live === "invisible") return "offline";
  return live ?? fallback;
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
    return (await requestPermission()) === "granted";
  } catch {
    return false;
  }
}

async function notify(title: string, body: string) {
  if (!isTauri()) return;
  if (!useAppStore.getState().notificationsEnabled) return;
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

    const invalidateMessages = () => {
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
      void queryClient.invalidateQueries({ queryKey: ["unread"] });
    };

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          invalidateMessages();

          if (payload.eventType !== "INSERT") return;
          const row = payload.new as {
            id: string;
            channel_id: string;
            author_id: string;
            content: string;
          };
          if (row.author_id === user.id) return;

          const state = useAppStore.getState();
          if (document.hasFocus() && state.activeChannelId === row.channel_id) {
            void client.rpc("mark_channel_read", {
              target_channel: row.channel_id,
            });
            void queryClient.invalidateQueries({ queryKey: ["unread"] });
            return;
          }

          const throttleKey = row.channel_id;
          const now = Date.now();
          if ((lastNotified.current[throttleKey] ?? 0) + 4000 > now) return;
          lastNotified.current[throttleKey] = now;

          void (async () => {
            const cached = useProfileCache.getState().profiles;
            let authorName = cached[row.author_id]?.display_name;
            if (!authorName) {
              const { data } = await client
                .from("profiles")
                .select("id, username, display_name, avatar_url, accent_color, status, custom_status")
                .eq("id", row.author_id)
                .maybeSingle();
              if (data) {
                upsertProfiles([data as never]);
                authorName = (data as { display_name: string }).display_name;
              }
            }
            await notify(
              authorName ?? "Vancord",
              row.content.slice(0, 140) || "Yeni bir mesaj",
            );
          })();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["messages"] });
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
  }, [user, queryClient]);

  useEffect(() => {
    statusRef.current = profile?.status ?? "online";
    const channel = channelRef.current;
    if (!channel || !user) return;
    void channel.track({ user_id: user.id, status: statusRef.current });
  }, [profile?.status, user]);

  const value = useMemo(() => ({ sendTyping }), [sendTyping]);

  return (
    <TypingContext.Provider value={value}>{children}</TypingContext.Provider>
  );
}
