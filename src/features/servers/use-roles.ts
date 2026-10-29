import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/features/auth/auth-store";
import type {
  ChannelRow,
  ProfileSummary,
  ShopItem,
  RoleDefinition,
  ChannelOverride,
  EconomyState,
} from "@/lib/models";
import { requireSupabase } from "@/lib/supabase";

export const rolesKey = (serverId: string | undefined) =>
  ["roles", serverId] as const;

export function useRoles(serverId: string | undefined) {
  return useQuery({
    queryKey: rolesKey(serverId),
    enabled: Boolean(serverId),
    queryFn: async (): Promise<RoleDefinition[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("server_roles")
        .select("id, server_id, name, color, permissions, position, is_default")
        .eq("server_id", serverId!)
        .order("position", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RoleDefinition[];
    },
  });
}

export function useCreateRole(serverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color: string | null; permissions: string[] }) => {
      const supabase = requireSupabase();
      const { error } = await supabase.from("server_roles").insert({
        server_id: serverId!,
        name: input.name,
        color: input.color,
        permissions: input.permissions,
        position: 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rolesKey(serverId) });
    },
  });
}

export function useUpdateRole(serverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      color?: string | null;
      permissions?: string[];
      position?: number;
    }) => {
      const supabase = requireSupabase();
      const { id, ...patch } = input;
      const { error } = await supabase.from("server_roles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rolesKey(serverId) });
    },
  });
}

export function useDeleteRole(serverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roleId: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase.from("server_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rolesKey(serverId) });
    },
  });
}

export const memberRolesKey = (serverId: string | undefined) =>
  ["member-roles", serverId] as const;

export function useMemberRoles(serverId: string | undefined) {
  return useQuery({
    queryKey: memberRolesKey(serverId),
    enabled: Boolean(serverId),
    queryFn: async (): Promise<Array<{ user_id: string; role_id: string }>> => {
      const supabase = requireSupabase();
      const roles = await supabase
        .from("server_roles")
        .select("id")
        .eq("server_id", serverId!);
      if (roles.error) throw roles.error;
      const ids = (roles.data ?? []).map((row) => row.id);
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("member_roles")
        .select("user_id, role_id")
        .in("role_id", ids);
      if (error) throw error;
      return (data ?? []) as Array<{ user_id: string; role_id: string }>;
    },
  });
}

export function useAssignRole(serverId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; roleId: string; active: boolean }) => {
      const supabase = requireSupabase();
      if (input.active) {
        const { error } = await supabase
          .from("member_roles")
          .insert({ user_id: input.userId, role_id: input.roleId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("member_roles")
          .delete()
          .eq("user_id", input.userId)
          .eq("role_id", input.roleId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberRolesKey(serverId) });
      void queryClient.invalidateQueries({ queryKey: ["members", serverId] });
    },
  });
}

export const overridesKey = (channelId: string | undefined) =>
  ["overrides", channelId] as const;

export function useChannelOverrides(channelId: string | undefined) {
  return useQuery({
    queryKey: overridesKey(channelId),
    enabled: Boolean(channelId),
    queryFn: async (): Promise<ChannelOverride[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("channel_permission_overrides")
        .select("id, channel_id, role_id, user_id, allow, deny")
        .eq("channel_id", channelId!);
      if (error) throw error;
      return (data ?? []) as ChannelOverride[];
    },
  });
}

export function useSetOverride(channelId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      roleId: string | null;
      userId: string | null;
      allow: string[];
      deny: string[];
    }) => {
      const supabase = requireSupabase();
      if (input.allow.length === 0 && input.deny.length === 0) {
        const query = supabase
          .from("channel_permission_overrides")
          .delete()
          .eq("channel_id", channelId!);
        const { error } = input.roleId
          ? await query.eq("role_id", input.roleId)
          : await query.eq("user_id", input.userId!);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("channel_permission_overrides").upsert(
        {
          channel_id: channelId!,
          role_id: input.roleId,
          user_id: input.userId,
          allow: input.allow,
          deny: input.deny,
        },
        { onConflict: input.roleId ? "channel_id,role_id" : "channel_id,user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: overridesKey(channelId) });
    },
  });
}

// ------------------------------------------------------------------ economy

export const economyKey = (userId: string | undefined) =>
  ["economy", userId] as const;

export function useEconomy() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: economyKey(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 20_000,
    queryFn: async (): Promise<EconomyState> => {
      const supabase = requireSupabase();
      const [balance, membership, cosmetics, history] = await Promise.all([
        supabase.from("point_balances").select("balance").maybeSingle(),
        supabase.from("memberships").select("tier, expires_at").maybeSingle(),
        supabase.from("cosmetics").select("sku"),
        supabase
          .from("point_events")
          .select("amount, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      return {
        balance: (balance.data?.balance as number | undefined) ?? 0,
        membership: membership.data
          ? {
              tier: membership.data.tier as "plus" | "ultra",
              expiresAt: membership.data.expires_at as string,
            }
          : null,
        cosmetics: (cosmetics.data ?? []).map((row) => row.sku as string),
        history: (history.data ?? []).map((row) => ({
          amount: row.amount as number,
          reason: row.reason as string,
          createdAt: row.created_at as string,
        })),
      };
    },
  });
}

export function useShop() {
  return useQuery({
    queryKey: ["shop"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ShopItem[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("shop_items")
        .select("sku, kind, name_tr, name_en, description_tr, description_en, price, duration_days, metadata, sort")
        .order("sort");
      if (error) throw error;
      return (data ?? []) as ShopItem[];
    },
  });
}

function useInvalidateEconomy() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  return () => {
    void queryClient.invalidateQueries({ queryKey: economyKey(user?.id) });
  };
}

export function usePurchase() {
  const invalidate = useInvalidateEconomy();
  return useMutation({
    mutationFn: async (sku: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc("purchase_item", { target_sku: sku });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useBoostServer() {
  const invalidate = useInvalidateEconomy();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (serverId: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc("boost_server", { target_server: serverId });
      if (error) throw error;
    },
    onSuccess: (_data, serverId) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["server", serverId] });
      void queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function useClaimDaily() {
  const invalidate = useInvalidateEconomy();
  return useMutation({
    mutationFn: async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc("claim_daily");
      if (error) throw error;
      return (data as number) ?? 0;
    },
    onSuccess: invalidate,
  });
}

export function useMentionCounts() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["mentions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Record<string, number>> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc("mention_counts");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of (data ?? []) as Array<{ channel_id: string; count: number }>) {
        map[row.channel_id] = row.count;
      }
      return map;
    },
  });
}

export function useServerMembers(serverId: string | undefined) {
  return useQuery({
    queryKey: ["members", serverId],
    enabled: Boolean(serverId),
    queryFn: async (): Promise<Array<{ user_id: string; role: string; profile: ProfileSummary }>> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("server_members")
        .select(
          "user_id, role, profile:profiles!server_members_user_id_fkey(id, username, display_name, avatar_url, accent_color, status, custom_status)",
        )
        .eq("server_id", serverId!);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        user_id: row.user_id as string,
        role: row.role as string,
        profile: row.profile as unknown as ProfileSummary,
      }));
    },
  });
}

export type { ChannelRow };

export function useBoostLevel(serverId: string | undefined) {
  return useQuery({
    queryKey: ["boost-level", serverId],
    enabled: Boolean(serverId),
    staleTime: 30_000,
    queryFn: async (): Promise<{ level: number; count: number }> => {
      const supabase = requireSupabase();
      const [level, count] = await Promise.all([
        supabase.rpc("boost_level", { target_server: serverId }),
        supabase.rpc("active_boost_count", { target_server: serverId }),
      ]);
      return {
        level: (level.data as number) ?? 0,
        count: (count.data as number) ?? 0,
      };
    },
  });
}
