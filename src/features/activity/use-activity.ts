import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useCurrentUser } from "@/features/auth/auth-store";
import { profileQueryKey } from "@/features/profiles/use-profile";
import type { ActivityState } from "@/lib/models";
import { requireSupabase } from "@/lib/supabase";
import { isTauri } from "@/lib/tauri";

interface DetectedGame {
  appId: number;
  name: string;
  process: string;
}

async function detectGame(): Promise<DetectedGame | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<DetectedGame | null>("detect_running_game");
  } catch {
    return null;
  }
}

export async function listSteamLibrary(): Promise<Array<{ appId: number; name: string }>> {
  if (!isTauri()) return [];
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<Array<{ appId: number; name: string }>>("steam_library");
  } catch {
    return [];
  }
}

/**
 * Watches the local machine for a running Steam title and mirrors it into the
 * profile so friends see "playing now". Polling is deliberately slow: the value
 * is cosmetic and a tighter loop would waste battery.
 */
export function useGameActivity({
  enabled,
  manual,
  visible,
}: {
  enabled: boolean;
  manual: string | null;
  visible: boolean;
}) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const current = useRef<ActivityState | null>(null);
  const save = useMutation({
    mutationFn: async (activity: ActivityState | null) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("profiles")
        .update({ activity })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileQueryKey(user?.id) });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });

  useEffect(() => {
    if (!user?.id) return;

    const push = (next: ActivityState | null) => {
      const same =
        current.current?.name === next?.name &&
        current.current?.appId === next?.appId;
      if (same) return;
      current.current = next;
      save.mutate(next);
    };

    if (!enabled || !visible) {
      push(manual ? { type: "game", name: manual, startedAt: new Date().toISOString() } : null);
      return;
    }

    let cancelled = false;

    const tick = async () => {
      const game = await detectGame();
      if (cancelled) return;
      if (game) {
        push({
          type: "game",
          name: game.name,
          appId: game.appId,
          startedAt: current.current?.startedAt ?? new Date().toISOString(),
        });
        return;
      }
      push(manual ? { type: "game", name: manual, startedAt: new Date().toISOString() } : null);
    };

    void tick();
    const timer = setInterval(() => void tick(), 45_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, enabled, manual, visible]);

  const clear = () => {
    current.current = null;
    save.mutate(null);
  };

  return { clear, saving: save.isPending };
}
