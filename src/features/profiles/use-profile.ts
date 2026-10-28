import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/features/auth/auth-store";
import { useProfileCache } from "@/features/profiles/profile-cache";
import type { ProfileSummary } from "@/lib/models";
import { requireSupabase } from "@/lib/supabase";

export type Profile = ProfileSummary & {
  created_at: string;
  updated_at: string;
};

export const profileQueryKey = (userId: string | undefined) =>
  ["profile", userId] as const;

export function useProfile() {
  const user = useCurrentUser();
  const upsert = useProfileCache((state) => state.upsert);

  return useQuery({
    queryKey: profileQueryKey(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Profile | null> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, accent_color, status, custom_status, bio, banner_color, banner_url, animated_avatar, activity, activity_visible, created_at, updated_at",
        )
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;
      if (data) upsert([data as unknown as ProfileSummary]);
      return (data as unknown as Profile) ?? null;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const upsert = useProfileCache((state) => state.upsert);

  return useMutation({
    mutationFn: async (patch: Partial<{
      display_name: string;
      status: ProfileSummary["status"];
      custom_status: string | null;
      accent_color: string;
      avatar_url: string;
      bio: string | null;
      banner_color: string;
      banner_url: string;
      animated_avatar: boolean;
    }>) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user!.id)
        .select(
          "id, username, display_name, avatar_url, accent_color, status, custom_status, bio, banner_color, banner_url, animated_avatar, activity, activity_visible",
        )
        .single();

      if (error) throw error;
      upsert([data as unknown as ProfileSummary]);
      return data as unknown as ProfileSummary;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: profileQueryKey(user?.id),
      });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
