import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/features/auth/auth-store";
import type { DmChannel, ProfileSummary } from "@/lib/models";
import { requireSupabase } from "@/lib/supabase";

const PROFILE_FIELDS =
  "id, username, display_name, avatar_url, accent_color, status, custom_status";

export const dmsKey = (userId: string | undefined) => ["dms", userId] as const;

export function useDms() {
  const user = useCurrentUser();

  return useQuery({
    queryKey: dmsKey(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<DmChannel[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("channels")
        .select(
          `id, type,
           members:channel_members(user_id, profile:profiles!channel_members_profile_fkey(${PROFILE_FIELDS}))`,
        )
        .eq("type", "dm");

      if (error) throw error;

      const channels: DmChannel[] = (data ?? []).map((row) => {
        const members = (
          (row.members ?? []) as unknown as Array<{
            user_id: string;
            profile: ProfileSummary | null;
          }>
        )
          .map((member) => member.profile)
          .filter((profile): profile is ProfileSummary => Boolean(profile));

        return {
          id: row.id as string,
          members: members.filter((member) => member.id !== user!.id),
          lastMessageAt: null,
        };
      });

      return channels;
    },
  });
}

export function useStartDm() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc("start_dm", {
        other_user: otherUserId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dms", user?.id] });
    },
  });
}

export function useChannel(channelId: string | undefined) {
  return useQuery({
    queryKey: ["channel", channelId],
    enabled: Boolean(channelId),
    queryFn: async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("channels")
        .select("id, server_id, type, name, topic, position")
        .eq("id", channelId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useDmPartner(channelId: string | undefined, enabled: boolean) {
  const user = useCurrentUser();

  return useQuery({
    queryKey: ["dm-partner", channelId, user?.id],
    enabled: Boolean(channelId && enabled && user?.id),
    queryFn: async (): Promise<ProfileSummary | null> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("channel_members")
        .select(
          `user_id, profile:profiles!channel_members_profile_fkey(${PROFILE_FIELDS})`,
        )
        .eq("channel_id", channelId!)
        .neq("user_id", user!.id)
        .limit(1);

      if (error) throw error;
      const row = (data ?? [])[0] as unknown as
        | { profile: ProfileSummary | null }
        | undefined;
      return row?.profile ?? null;
    },
  });
}
