import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/features/auth/auth-store";
import { useProfileCache } from "@/features/profiles/profile-cache";
import type { AttachmentRow, MessageRow, ReactionRow } from "@/lib/models";
import { requireSupabase } from "@/lib/supabase";

const SEARCH_SELECT = `
  id, channel_id, author_id, bot_id, content, created_at, edited_at,
  reply_to_id, pinned_at, pinned_by,
  author:profiles!messages_author_profile_fkey(
    id, username, display_name, avatar_url, accent_color, status, custom_status
  ),
  bot:bots(id, name, avatar_url),
  message_attachments(id, message_id, storage_path, mime, width, height, size_bytes),
  reactions(message_id, user_id, emoji)
`;

export interface SearchHit {
  id: string;
  channel_id: string;
  channel_name: string | null;
  server_id: string | null;
  content: string;
  created_at: string;
  author_name: string;
}

/** Full-text search across the channels the user can read. */
export function useSearchMessages(term: string, scope: { serverId?: string | null }) {
  const user = useCurrentUser();
  const normalized = term.trim();

  return useQuery({
    queryKey: ["search", normalized, scope.serverId ?? "all", user?.id],
    enabled: normalized.length >= 2 && Boolean(user?.id),
    staleTime: 15_000,
    queryFn: async (): Promise<SearchHit[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("messages")
        .select(
          `id, channel_id, content, created_at,
           author:profiles!messages_author_profile_fkey(display_name),
           channel:channels!inner(name, server_id)`,
        )
        .is("deleted_at", null)
        .textSearch("search", normalized, { type: "websearch", config: "simple" })
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<{
        id: string;
        channel_id: string;
        content: string;
        created_at: string;
        author: { display_name: string } | null;
        channel: { name: string | null; server_id: string | null } | null;
      }>;

      return rows
        .filter((row) =>
          scope.serverId ? row.channel?.server_id === scope.serverId : true,
        )
        .map((row) => ({
          id: row.id,
          channel_id: row.channel_id,
          channel_name: row.channel?.name ?? null,
          server_id: row.channel?.server_id ?? null,
          content: row.content,
          created_at: row.created_at,
          author_name: row.author?.display_name ?? "—",
        }));
    },
  });
}

export function usePinnedMessages(channelId: string | undefined) {
  const upsert = useProfileCache((state) => state.upsert);

  return useQuery({
    queryKey: ["pinned", channelId],
    enabled: Boolean(channelId),
    queryFn: async (): Promise<MessageRow[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("messages")
        .select(SEARCH_SELECT)
        .eq("channel_id", channelId!)
        .is("deleted_at", null)
        .not("pinned_at", "is", null)
        .order("pinned_at", { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as unknown as MessageRow[];
      upsert(rows.map((row) => row.author));
      return rows.map((row) => ({
        ...row,
        message_attachments: (row.message_attachments ?? []) as AttachmentRow[],
        reactions: (row.reactions ?? []) as ReactionRow[],
      }));
    },
  });
}

export function useTogglePin(channelId: string | undefined) {
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  return useMutation({
    mutationFn: async (input: { messageId: string; pinned: boolean }) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("messages")
        .update({
          pinned_at: input.pinned ? new Date().toISOString() : null,
          pinned_by: input.pinned ? user!.id : null,
        })
        .eq("id", input.messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pinned", channelId] });
      void queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
    },
  });
}

export interface MentionInboxItem {
  message_id: string;
  channel_id: string;
  channel_name: string | null;
  content: string;
  created_at: string;
  author_name: string;
}

export function useMentionInbox() {
  const user = useCurrentUser();

  return useQuery({
    queryKey: ["mention-inbox", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 20_000,
    queryFn: async (): Promise<MentionInboxItem[]> => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("message_mentions")
        .select(
          `message_id,
           message:messages!inner(
             id, channel_id, content, created_at, deleted_at,
             author:profiles!messages_author_profile_fkey(display_name),
             channel:channels!inner(name)
           )`,
        )
        .eq("user_id", user!.id)
        .order("message_id", { ascending: false })
        .limit(30);
      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<{
        message: {
          id: string;
          channel_id: string;
          content: string;
          created_at: string;
          deleted_at: string | null;
          author: { display_name: string } | null;
          channel: { name: string | null } | null;
        } | null;
      }>;

      return rows
        .filter((row) => row.message && !row.message.deleted_at)
        .map((row) => ({
          message_id: row.message!.id,
          channel_id: row.message!.channel_id,
          channel_name: row.message!.channel?.name ?? null,
          content: row.message!.content,
          created_at: row.message!.created_at,
          author_name: row.message!.author?.display_name ?? "—",
        }));
    },
  });
}

export function useStartGroupDm() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  return useMutation({
    mutationFn: async (input: { memberIds: string[]; name?: string }) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc("start_group_dm", {
        member_ids: input.memberIds,
        group_name: input.name ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dms", user?.id] });
    },
  });
}
