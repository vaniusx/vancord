import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/features/auth/auth-store";
import type { FriendEdge, ProfileSummary } from "@/lib/models";
import { requireSupabase } from "@/lib/supabase";

const PROFILE_FIELDS =
  "id, username, display_name, avatar_url, accent_color, status, custom_status";

export const friendsKey = (userId: string | undefined) =>
  ["friendships", userId] as const;

export function useFriendships() {
  const user = useCurrentUser();

  return useQuery({
    queryKey: friendsKey(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<FriendEdge[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("friendships")
        .select(
          `requester_id, addressee_id, status, created_at,
           requester:profiles!friendships_requester_profile_fkey(${PROFILE_FIELDS}),
           addressee:profiles!friendships_addressee_profile_fkey(${PROFILE_FIELDS})`,
        )
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row) => ({
        requester_id: row.requester_id as string,
        addressee_id: row.addressee_id as string,
        status: row.status as FriendEdge["status"],
        created_at: row.created_at as string,
        requester: (row.requester as unknown as ProfileSummary) ?? null,
        addressee: (row.addressee as unknown as ProfileSummary) ?? null,
      }));
    },
  });
}

export function useSearchUsers(query: string) {
  const user = useCurrentUser();

  return useQuery({
    queryKey: ["user-search", query, user?.id],
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
    queryFn: async (): Promise<ProfileSummary[]> => {
      const supabase = requireSupabase();
      const term = `%${query.trim()}%`;
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_FIELDS)
        .or(`username.ilike.${term},display_name.ilike.${term}`)
        .neq("id", user!.id)
        .limit(8);

      if (error) throw error;
      return (data ?? []) as ProfileSummary[];
    },
  });
}

export function useFriendMutations() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["friendships"] });
  };

  const sendRequest = useMutation({
    mutationFn: async (targetId: string) => {
      const supabase = requireSupabase();
      // The RPC resolves the awkward cases server side: a mutual request becomes
      // an acceptance, a repeat is a no-op, a block is refused.
      const { data, error } = await supabase.rpc("send_friend_request", {
        target_user: targetId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidate,
  });

  const respond = useMutation({
    mutationFn: async (input: {
      requesterId: string;
      status: "accepted" | "blocked";
    }) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("friendships")
        .update({ status: input.status })
        .eq("requester_id", input.requesterId)
        .eq("addressee_id", user!.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (input: { otherId: string }) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("friendships")
        .delete()
        .or(
          `and(requester_id.eq.${user!.id},addressee_id.eq.${input.otherId}),and(requester_id.eq.${input.otherId},addressee_id.eq.${user!.id})`,
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { sendRequest, respond, remove };
}
