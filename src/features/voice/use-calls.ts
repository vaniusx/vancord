import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useCurrentUser } from "@/features/auth/auth-store";
import { useCallStore, type CallInvitation, type IncomingCall } from "@/features/voice/call-store";
import { useProfileCache } from "@/features/profiles/profile-cache";
import { requireSupabase, supabase } from "@/lib/supabase";
import { playCue } from "@/lib/sounds";
import { sendCallNotification } from "@/features/voice/notify-call";

const RING_INTERVAL_MS = 2500;

// A random suffix, not a counter: during hot reload the module is re-evaluated
  // and a counter restarts at 1, which makes the new subscription collide with
  // the still-open one and Supabase answers 409.
const nextChannelName = (prefix: string) =>
  `${prefix}:${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;

/**
 * Incoming-call detection.
 *
 * A ringing invitation arrives over realtime, but the table is also queried once
 * on mount so a call placed while the app was closed is still offered when it
 * opens. Anything older than the 45 second window is ignored.
 */
export function useCallSignals() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const setIncoming = useCallStore((state) => state.setIncoming);
  const ringTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop the ring as soon as the incoming call clears.
  const incomingId = useCallStore((state) => state.incoming?.id ?? null);

  useEffect(() => {
    if (!incomingId) {
      if (ringTimer.current) {
        clearInterval(ringTimer.current);
        ringTimer.current = null;
      }
      return;
    }
    playCue("call-ring");
    ringTimer.current ??= setInterval(() => playCue("call-ring"), RING_INTERVAL_MS);
    return () => {
      if (ringTimer.current) {
        clearInterval(ringTimer.current);
        ringTimer.current = null;
      }
    };
  }, [incomingId]);

  useEffect(() => {
    const client = supabase;
    if (!client || !user?.id) return;

    const present = async (row: CallInvitation) => {
      // Ignore a call that has already expired before it reaches the UI.
      if (Date.now() - new Date(row.created_at).getTime() > 45_000) return;

      const cached = useProfileCache.getState().profiles[row.caller_id];
      let caller = cached;

      if (!caller) {
        const { data } = await client
          .from("profiles")
          .select("id, username, display_name, avatar_url, accent_color, status, custom_status")
          .eq("id", row.caller_id)
          .maybeSingle();
        if (data) {
          caller = data as never;
          useProfileCache.getState().upsert([data as never]);
        }
      }

      const { data: channel } = await client
        .from("channels")
        .select("name")
        .eq("id", row.channel_id)
        .maybeSingle();

      const call: IncomingCall = {
        ...row,
        callername: caller?.display_name ?? "Vancord",
        callerAvatar: caller?.avatar_url ?? null,
        channelName: (channel?.name as string | null) ?? null,
      };
      setIncoming(call);
      // Android has no foreground service here, so the system notification is
      // what reaches the user when the app is in the background.
      void sendCallNotification(call);
    };

    // Catch up on anything that rang while the window was closed.
    void (async () => {
      const { data } = await client
        .from("call_invitations")
        .select(
          "id, channel_id, caller_id, callee_id, status, video, created_at, answered_at, ended_at",
        )
        .eq("callee_id", user.id)
        .eq("status", "ringing")
        .order("created_at", { ascending: false })
        .limit(1);

      const row = (data ?? [])[0] as CallInvitation | undefined;
      if (row) void present(row);
    })();

    const channel = client
      .channel(nextChannelName(`calls:${user.id}`))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_invitations",
          filter: `callee_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as CallInvitation;
          if (row.status === "ringing") void present(row);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_invitations",
          filter: `callee_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as CallInvitation;
          const current = useCallStore.getState().incoming;
          if (!current || current.id !== row.id) return;
          if (row.status !== "ringing") setIncoming(null);
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [user?.id, setIncoming]);

  // Caller side: watch their own outgoing invitation for an answer.
  useEffect(() => {
    const client = supabase;
    if (!client || !user?.id) return;

    const channel = client
      .channel(nextChannelName(`outgoing:${user.id}`))
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_invitations",
          filter: `caller_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as CallInvitation;
          const store = useCallStore.getState();
          if (!store.outgoing || store.outgoing.id !== row.id) return;

          if (row.status === "accepted") {
            store.setOutgoing({ ...store.outgoing, status: "accepted" });
            store.setStartedAt(Date.now());
            playCue("call-connect");
            return;
          }
          if (row.status !== "ringing") {
            store.setOutgoing(null);
            playCue("call-end");
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [user?.id]);

  // Refresh call history/UI caches when a call closes.
  useEffect(() => {
    const client = supabase;
    if (!client || !user?.id) return;
    return () => {
      void queryClient.invalidateQueries({ queryKey: ["call-history"] });
    };
  }, [user?.id, queryClient]);
}

export function useStartCall() {
  const setOutgoing = useCallStore((state) => state.setOutgoing);

  return useMutation({
    mutationFn: async (input: { channelId: string; video: boolean }) => {
      const client = requireSupabase();
      const { data, error } = await client.rpc("start_call", {
        target_channel: input.channelId,
        with_video: input.video,
      });
      if (error) throw error;

      const callId = data as string;
      const { data: row } = await client
        .from("call_invitations")
        .select(
          "id, channel_id, caller_id, callee_id, status, video, created_at, answered_at, ended_at",
        )
        .eq("id", callId)
        .maybeSingle();

      if (row) {
        setOutgoing(row as CallInvitation);
        playCue("call-dial");
      }
      return callId;
    },
    meta: { handled: true },
  });
}

export function useAnswerCall() {
  const setIncoming = useCallStore((state) => state.setIncoming);
  const setStartedAt = useCallStore((state) => state.setStartedAt);

  return useMutation({
    mutationFn: async (input: { callId: string; accept: boolean }) => {
      const client = requireSupabase();
      const { error } = await client.rpc("answer_call", {
        target_call: input.callId,
        accept: input.accept,
      });
      if (error) throw error;
      return input.accept;
    },
    onSuccess: (accepted) => {
      setIncoming(null);
      if (accepted) setStartedAt(Date.now());
      playCue(accepted ? "call-connect" : "call-end");
    },
    meta: { handled: true },
  });
}

export function useEndCall() {
  const clear = useCallStore((state) => state.clear);

  return useMutation({
    mutationFn: async (callId: string) => {
      const client = requireSupabase();
      const { error } = await client.rpc("end_call", { target_call: callId });
      if (error) throw error;
    },
    onSuccess: () => {
      clear();
      playCue("call-end");
    },
    meta: { handled: true },
  });
}

/** Duration label for an answered call. */
export function formatCallDuration(startedAt: number | null, now: number): string {
  if (!startedAt) return "00:00";
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
