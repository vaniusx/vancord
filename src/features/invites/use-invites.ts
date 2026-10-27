import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requireSupabase } from "@/lib/supabase";

export interface InviteRow {
  code: string;
  server_id: string;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  created_at: string;
}

export const invitesKey = (serverId: string | undefined) =>
  ["invites", serverId] as const;

export function useInvites(serverId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: invitesKey(serverId),
    enabled: Boolean(serverId && enabled),
    queryFn: async (): Promise<InviteRow[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("invites")
        .select("code, server_id, expires_at, max_uses, uses, created_at")
        .eq("server_id", serverId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as InviteRow[];
    },
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      serverId: string;
      expiresInHours: number | null;
      maxUses: number | null;
    }) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc("create_invite", {
        target_server: input.serverId,
        expires_in_hours: input.expiresInHours,
        max_uses: input.maxUses,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_code, variables) => {
      void queryClient.invalidateQueries({
        queryKey: invitesKey(variables.serverId),
      });
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { code: string; serverId: string }) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("invites")
        .delete()
        .eq("code", input.code);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: invitesKey(variables.serverId),
      });
    },
  });
}
