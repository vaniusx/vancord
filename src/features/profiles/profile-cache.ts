import { create } from "zustand";

import type { ProfileSummary } from "@/lib/models";

interface ProfileCacheState {
  profiles: Record<string, ProfileSummary>;
  upsert: (profiles: Array<ProfileSummary | null | undefined>) => void;
}

export const useProfileCache = create<ProfileCacheState>((set) => ({
  profiles: {},
  upsert: (incoming) =>
    set((state) => {
      let changed = false;
      const next = { ...state.profiles };
      for (const profile of incoming) {
        if (!profile?.id) continue;
        const previous = next[profile.id];
        if (
          !previous ||
          previous.display_name !== profile.display_name ||
          previous.avatar_url !== profile.avatar_url ||
          previous.status !== profile.status ||
          previous.custom_status !== profile.custom_status
        ) {
          next[profile.id] = profile;
          changed = true;
        }
      }
      return changed ? { profiles: next } : state;
    }),
}));

export function useCachedProfile(id: string | null | undefined) {
  return useProfileCache((state) => (id ? state.profiles[id] : undefined));
}
