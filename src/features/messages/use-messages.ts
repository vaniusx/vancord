import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/features/auth/auth-store";
import { useProfileCache } from "@/features/profiles/profile-cache";
import { useProfile } from "@/features/profiles/use-profile";
import type {
  AttachmentRow,
  BotSummary,
  MessageRow,
  ProfileSummary,
  ReactionRow,
} from "@/lib/models";
import { requireSupabase } from "@/lib/supabase";
import type { UploadResult } from "@/lib/upload";

const PAGE_SIZE = 40;

const MESSAGE_SELECT = `
  id, channel_id, author_id, bot_id, content, created_at, edited_at,
  author:profiles!messages_author_profile_fkey(
    id, username, display_name, avatar_url, accent_color, status, custom_status
  ),
  bot:bots(id, name, avatar_url),
  message_attachments(id, message_id, storage_path, mime, width, height, size_bytes),
  reactions(message_id, user_id, emoji)
`;

export const messagesKey = (channelId: string | undefined) =>
  ["messages", channelId] as const;

type RawMessage = Omit<MessageRow, "author" | "bot"> & {
  author: ProfileSummary | ProfileSummary[] | null;
  bot: BotSummary | BotSummary[] | null;
};

function normalize(row: RawMessage): MessageRow {
  const author = Array.isArray(row.author) ? row.author[0] : row.author;
  const bot = Array.isArray(row.bot) ? row.bot[0] : row.bot;
  return {
    ...row,
    author: author ?? null,
    bot: bot ?? null,
    message_attachments: (row.message_attachments ?? []) as AttachmentRow[],
    reactions: (row.reactions ?? []) as ReactionRow[],
  };
}

export function useMessages(channelId: string | undefined) {
  const upsert = useProfileCache((state) => state.upsert);

  return useQuery({
    queryKey: messagesKey(channelId),
    enabled: Boolean(channelId),
    queryFn: async () => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("messages")
        .select(MESSAGE_SELECT)
        .eq("channel_id", channelId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const messages = ((data ?? []) as unknown as RawMessage[])
        .map(normalize)
        .reverse();

      upsert(messages.map((message) => message.author));
      return { messages, hasMore: messages.length === PAGE_SIZE };
    },
  });
}

export function useOlderMessages(channelId: string | undefined) {
  const queryClient = useQueryClient();
  const upsert = useProfileCache((state) => state.upsert);

  return useMutation({
    mutationFn: async (before: string) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("messages")
        .select(MESSAGE_SELECT)
        .eq("channel_id", channelId!)
        .is("deleted_at", null)
        .lt("created_at", before)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const messages = ((data ?? []) as unknown as RawMessage[])
        .map(normalize)
        .reverse();
      upsert(messages.map((message) => message.author));
      return { messages, hasMore: messages.length === PAGE_SIZE };
    },
    onSuccess: (result) => {
      queryClient.setQueryData<{ messages: MessageRow[]; hasMore: boolean }>(
        messagesKey(channelId),
        (current) =>
          current
            ? {
                messages: [...result.messages, ...current.messages],
                hasMore: result.hasMore,
              }
            : result,
      );
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (input: {
      channelId: string;
      content: string;
      attachments?: UploadResult[];
    }) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("messages")
        .insert({
          channel_id: input.channelId,
          author_id: user!.id,
          content: input.content,
        })
        .select("id")
        .single();

      if (error) throw error;
      const messageId = data.id as string;

      if (input.attachments?.length) {
        const { error: attachmentError } = await supabase
          .from("message_attachments")
          .insert(
            input.attachments.map((attachment) => ({
              message_id: messageId,
              storage_path: attachment.path,
              mime: attachment.mime,
              width: attachment.width,
              height: attachment.height,
              size_bytes: attachment.size,
            })),
          );
        if (attachmentError) throw attachmentError;
      }

      return messageId;
    },
    onSuccess: (messageId, variables) => {
      // Append locally so the message appears instantly; the realtime INSERT
      // arrives moments later and is de-duplicated by id.
      if (!user?.id) return;
      const optimistic: MessageRow = {
        id: messageId,
        channel_id: variables.channelId,
        author_id: user.id,
        bot_id: null,
        content: variables.content,
        created_at: new Date().toISOString(),
        edited_at: null,
        author:
          profile ??
          useProfileCache.getState().profiles[user.id] ??
          null,
        bot: null,
        message_attachments: [],
        reactions: [],
      };
      queryClient.setQueryData<{ messages: MessageRow[]; hasMore: boolean }>(
        messagesKey(variables.channelId),
        (current) =>
          current
            ? {
                ...current,
                messages: current.messages.some((message) => message.id === messageId)
                  ? current.messages
                  : [...current.messages, optimistic],
              }
            : current,
      );
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      messageId: string;
      channelId: string;
      content: string;
    }) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("messages")
        .update({ content: input.content })
        .eq("id", input.messageId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<{ messages: MessageRow[]; hasMore: boolean }>(
        messagesKey(variables.channelId),
        (current) =>
          current
            ? {
                ...current,
                messages: current.messages.map((message) =>
                  message.id === variables.messageId
                    ? { ...message, content: variables.content, edited_at: new Date().toISOString() }
                    : message,
                ),
              }
            : current,
      );
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { messageId: string; channelId: string }) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString(), content: "" })
        .eq("id", input.messageId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<{ messages: MessageRow[]; hasMore: boolean }>(
        messagesKey(variables.channelId),
        (current) =>
          current
            ? {
                ...current,
                messages: current.messages.filter(
                  (message) => message.id !== variables.messageId,
                ),
              }
            : current,
      );
    },
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  return useMutation({
    mutationFn: async (input: {
      messageId: string;
      channelId: string;
      emoji: string;
      active: boolean;
    }) => {
      const supabase = requireSupabase();
      if (input.active) {
        const { error } = await supabase.from("reactions").insert({
          message_id: input.messageId,
          user_id: user!.id,
          emoji: input.emoji,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("message_id", input.messageId)
          .eq("user_id", user!.id)
          .eq("emoji", input.emoji);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<{ messages: MessageRow[]; hasMore: boolean }>(
        messagesKey(variables.channelId),
        (current) =>
          current
            ? {
                ...current,
                messages: current.messages.map((message) => {
                  if (message.id !== variables.messageId) return message;
                  const without = message.reactions.filter(
                    (reaction) =>
                      !(
                        reaction.user_id === user!.id &&
                        reaction.emoji === variables.emoji
                      ),
                  );
                  return {
                    ...message,
                    reactions: variables.active
                      ? [
                          ...without,
                          {
                            message_id: variables.messageId,
                            user_id: user!.id,
                            emoji: variables.emoji,
                          },
                        ]
                      : without,
                  };
                }),
              }
            : current,
      );
    },
  });
}
