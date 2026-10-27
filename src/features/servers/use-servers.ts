import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCurrentUser } from "@/features/auth/auth-store";
import { useProfileCache } from "@/features/profiles/profile-cache";
import type {
  ChannelRow,
  ProfileSummary,
  ServerSummary,
} from "@/lib/models";
import { requireSupabase } from "@/lib/supabase";

export const serversKey = (userId: string | undefined) =>
  ["servers", userId] as const;

export function useServers() {
  const user = useCurrentUser();

  return useQuery({
    queryKey: serversKey(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<ServerSummary[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("server_members")
        .select("role, joined_at, servers!inner(id, name, icon_url, owner_id)")
        .eq("user_id", user!.id)
        .order("joined_at", { ascending: true });

      if (error) throw error;

      return (data ?? [])
        .map((row) => {
          const server = row.servers as unknown as {
            id: string;
            name: string;
            icon_url: string | null;
            owner_id: string;
          } | null;
          if (!server) return null;
          return {
            id: server.id,
            name: server.name,
            icon_url: server.icon_url,
            owner_id: server.owner_id,
            role: row.role as ServerSummary["role"],
          } satisfies ServerSummary;
        })
        .filter((item): item is ServerSummary => item !== null);
    },
  });
}

export function useServer(serverId: string | undefined) {
  const { data: servers } = useServers();
  return servers?.find((server) => server.id === serverId);
}

export function useCreateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc("create_server", {
        server_name: name,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
      await queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
    onError: () => {
      toast.error("Sunucu oluşturulamadı.");
    },
  });
}

export function useJoinServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc("join_server", {
        invite_code: code.trim(),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
      await queryClient.invalidateQueries({ queryKey: ["channels"] });
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Sunucuya katıldın.");
    },
  });
}

export function useUpdateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { serverId: string; name: string }) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("servers")
        .update({ name: input.name.trim() })
        .eq("id", input.serverId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function useDeleteServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverId: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("servers")
        .delete()
        .eq("id", serverId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
      await queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export function useLeaveServer() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  return useMutation({
    mutationFn: async (serverId: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("server_members")
        .delete()
        .eq("server_id", serverId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
      await queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export function useChannels(serverId: string | undefined) {
  return useQuery({
    queryKey: ["channels", serverId],
    enabled: Boolean(serverId),
    queryFn: async (): Promise<ChannelRow[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("channels")
        .select("id, server_id, type, name, topic, position")
        .eq("server_id", serverId!)
        .eq("type", "text")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as ChannelRow[];
    },
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      serverId: string;
      name: string;
      topic?: string;
    }) => {
      const supabase = requireSupabase();
      const slug = input.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "")
        .slice(0, 100);

      if (!slug) throw new Error("invalid-name");

      const { data: position, error: positionError } = await supabase.rpc(
        "next_channel_position",
        { target_server: input.serverId },
      );
      if (positionError) throw positionError;

      const { data, error } = await supabase
        .from("channels")
        .insert({
          server_id: input.serverId,
          type: "text",
          name: slug,
          topic: input.topic?.trim() || null,
          position: (position as number) ?? 0,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_id, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["channels", variables.serverId],
      });
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { channelId: string; serverId: string }) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("channels")
        .delete()
        .eq("id", input.channelId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["channels", variables.serverId],
      });
    },
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      channelId: string;
      serverId: string;
      name?: string;
      topic?: string | null;
    }) => {
      const supabase = requireSupabase();
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.topic !== undefined) patch.topic = input.topic;

      const { error } = await supabase
        .from("channels")
        .update(patch)
        .eq("id", input.channelId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["channels", variables.serverId],
      });
    },
  });
}

export function useMembers(serverId: string | undefined) {
  const upsert = useProfileCache((state) => state.upsert);

  return useQuery({
    queryKey: ["members", serverId],
    enabled: Boolean(serverId),
    queryFn: async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("server_members")
        .select(
          "user_id, role, joined_at, profiles!inner(id, username, display_name, avatar_url, accent_color, status, custom_status)",
        )
        .eq("server_id", serverId!)
        .order("joined_at", { ascending: true });

      if (error) throw error;

      const rows = (data ?? []).map((row) => {
        const profile = row.profiles as unknown as {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          accent_color: string;
          status: string;
          custom_status: string | null;
        };
        return {
          user_id: row.user_id as string,
          role: row.role as "owner" | "admin" | "member",
          joined_at: row.joined_at as string,
          profile: {
            ...profile,
            status: profile.status as ProfileSummary["status"],
          },
        };
      });

      upsert(rows.map((row) => row.profile));
      return rows;
    },
  });
}

export function useUnreadCounts() {
  const user = useCurrentUser();

  return useQuery({
    queryKey: ["unread", user?.id],
    enabled: Boolean(user?.id),
    refetchInterval: 60_000,
    queryFn: async (): Promise<Record<string, number>> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc("unread_counts");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of (data ?? []) as Array<{
        channel_id: string;
        unread: number;
      }>) {
        map[row.channel_id] = Number(row.unread);
      }
      return map;
    },
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  return useMutation({
    mutationFn: async (channelId: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc("mark_channel_read", {
        target_channel: channelId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["unread", user?.id] });
    },
  });
}

export function useAllChannels() {
  return useQuery({
    queryKey: ["all-channels"],
    queryFn: async (): Promise<ChannelRow[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("channels")
        .select("id, server_id, type, name, topic, position")
        .eq("type", "text")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChannelRow[];
    },
  });
}
