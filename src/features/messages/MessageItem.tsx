import { Check, Copy, Pencil, SmilePlus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Avatar } from "@/components/common/avatar";
import { Markdown } from "@/components/common/markdown";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/features/auth/auth-store";
import { EmojiPicker } from "@/features/messages/EmojiPicker";
import {
  useDeleteMessage,
  useEditMessage,
  useToggleReaction,
} from "@/features/messages/use-messages";
import { QUICK_REACTIONS } from "@/lib/emoji";
import { accentFor, clockTime, fullTime, initials } from "@/lib/format";
import type { AttachmentRow, MessageRow } from "@/lib/models";
import { publicUrl } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const GIF_URL = /^(https?:\/\/[^\s]+\.(?:gif|webp|mp4)(?:\?\S*)?)$/i;

function GifEmbed({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const isVideo = /\.mp4(\?|$)/i.test(url);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="mt-1.5 block max-w-sm overflow-hidden rounded-xl">
          {isVideo ? (
            <video src={url} autoPlay loop muted playsInline className="max-h-64 rounded-xl" />
          ) : (
            <img src={url} alt="" loading="lazy" className="max-h-64 rounded-xl object-cover" />
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">GIF</DialogTitle>
        {isVideo ? (
          <video src={url} autoPlay loop muted playsInline controls className="w-full rounded-xl" />
        ) : (
          <img src={url} alt="" className="max-h-[80vh] w-full rounded-xl object-contain" />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AttachmentView({ attachment }: { attachment: AttachmentRow }) {
  const [open, setOpen] = useState(false);
  const url = publicUrl("attachments", attachment.storage_path);
  const image = attachment.mime.startsWith("image/");

  if (!image) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground"
      >
        {attachment.storage_path.split("/").pop()}
      </a>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mt-1.5 block max-w-sm overflow-hidden rounded-xl border border-border/70"
        >
          <img
            src={url}
            alt=""
            loading="lazy"
            className="max-h-72 w-auto object-cover"
            style={{
              aspectRatio:
                attachment.width && attachment.height
                  ? `${attachment.width} / ${attachment.height}`
                  : undefined,
            }}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">attachment</DialogTitle>
        <img src={url} alt="" className="max-h-[80vh] w-full rounded-xl object-contain" />
      </DialogContent>
    </Dialog>
  );
}

function ReactionBar({
  message,
  onToggle,
}: {
  message: MessageRow;
  onToggle: (emoji: string, active: boolean) => void;
}) {
  const user = useCurrentUser();
  if (message.reactions.length === 0) return null;

  const groups = new Map<string, { count: number; mine: boolean }>();
  for (const reaction of message.reactions) {
    const entry = groups.get(reaction.emoji) ?? { count: 0, mine: false };
    entry.count += 1;
    if (reaction.user_id === user?.id) entry.mine = true;
    groups.set(reaction.emoji, entry);
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {[...groups.entries()].map(([emoji, info]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onToggle(emoji, !info.mine)}
          className={cn(
            "flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] transition-colors",
            info.mine
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-secondary/60 text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          <span className="text-[13px] leading-none">{emoji}</span>
          <span className="tabular-nums">{info.count}</span>
        </button>
      ))}
    </div>
  );
}

export function MessageItem({
  message,
  grouped,
  canManage,
}: {
  message: MessageRow;
  grouped: boolean;
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const isMine = message.author_id === user?.id;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copied, setCopied] = useState(false);

  const toggleReaction = useToggleReaction();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();

  const author = message.author ?? {
    id: message.author_id,
    username: "unknown",
    display_name: t("common.unknownUser"),
    avatar_url: null,
    accent_color: accentFor(message.author_id),
    status: "offline" as const,
    custom_status: null,
  };

  const react = (emoji: string) => {
    toggleReaction.mutate({
      messageId: message.id,
      channelId: message.channel_id,
      emoji,
      active: true,
    });
  };

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success(t("chat.copied"));
    setTimeout(() => setCopied(false), 1500);
  };

  const save = () => {
    const value = draft.trim();
    if (!value) return;
    editMessage.mutate(
      { messageId: message.id, channelId: message.channel_id, content: value },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "group relative flex gap-3 px-4 transition-colors hover:bg-accent/35",
            grouped ? "py-0.5" : "pt-3 pb-0.5",
          )}
        >
          <div className="w-9 shrink-0">
            {grouped ? (
              <span className="mt-1 hidden text-[10px] text-muted-foreground group-hover:block">
                {clockTime(message.created_at)}
              </span>
            ) : (
              <Avatar profile={author} size="md" className="mt-0.5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {!grouped ? (
              <div className="mb-0.5 flex items-baseline gap-2">
                <span className="text-[14px] font-semibold text-foreground">
                  {author.display_name}
                </span>
                <span className="text-[11.5px] text-muted-foreground tabular-nums">
                  {clockTime(message.created_at)}
                </span>
              </div>
            ) : null}

            {editing ? (
              <div className="space-y-2 py-1">
                <Textarea
                  value={draft}
                  autoFocus
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      save();
                    }
                    if (event.key === "Escape") setEditing(false);
                  }}
                  className="min-h-9 text-[14px]"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-7" onClick={save}>
                    <Check className="mr-1 size-3.5" />
                    {t("common.save")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    onClick={() => {
                      setDraft(message.content);
                      setEditing(false);
                    }}
                  >
                    <X className="mr-1 size-3.5" />
                    {t("common.cancel")}
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    {t("chat.editingHint")}
                  </span>
                </div>
              </div>
            ) : (
              <>
                {message.content ? (
                  GIF_URL.test(message.content.trim()) ? (
                    <GifEmbed url={message.content.trim()} />
                  ) : (
                    <Markdown content={message.content} />
                  )
                ) : null}
                {message.edited_at ? (
                  <span className="ml-1 align-baseline text-[10px] text-muted-foreground">
                    ({t("chat.edited")})
                  </span>
                ) : null}
                {message.message_attachments.map((attachment) => (
                  <AttachmentView key={attachment.id} attachment={attachment} />
                ))}
                <ReactionBar
                  message={message}
                  onToggle={(emoji, active) =>
                    toggleReaction.mutate({
                      messageId: message.id,
                      channelId: message.channel_id,
                      emoji,
                      active,
                    })
                  }
                />
              </>
            )}
          </div>

          {!editing ? (
            <div className="absolute top-0.5 right-3 hidden items-center gap-0.5 rounded-lg border border-border/80 bg-popover p-0.5 shadow-sm group-hover:flex">
              {QUICK_REACTIONS.slice(0, 3).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => react(emoji)}
                  aria-label={emoji}
                  className="flex size-6 items-center justify-center rounded text-[13px] transition-colors hover:bg-accent"
                >
                  {emoji}
                </button>
              ))}
              <EmojiPicker onSelect={react} align="end">
                <button
                  type="button"
                  aria-label={t("chat.addReaction")}
                  className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <SmilePlus className="size-4" />
                </button>
              </EmojiPicker>
              <button
                type="button"
                onClick={() => void copy()}
                aria-label={t("chat.copy")}
                className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
              {isMine ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(message.content);
                    setEditing(true);
                  }}
                  aria-label={t("chat.edit")}
                  className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </button>
              ) : null}
              {canManage || isMine ? (
                <button
                  type="button"
                  onClick={() =>
                    deleteMessage.mutate({
                      messageId: message.id,
                      channelId: message.channel_id,
                    })
                  }
                  aria-label={t("chat.delete")}
                  className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={() => void copy()}>
          <Copy className="mr-2 size-4" />
          {t("chat.copy")}
        </ContextMenuItem>
        {isMine ? (
          <ContextMenuItem
            onSelect={() => {
              setDraft(message.content);
              setEditing(true);
            }}
          >
            <Pencil className="mr-2 size-4" />
            {t("chat.edit")}
          </ContextMenuItem>
        ) : null}
        <ContextMenuSeparator />
        {QUICK_REACTIONS.slice(0, 3).map((emoji) => (
          <ContextMenuItem key={emoji} onSelect={() => react(emoji)}>
            <span className="mr-2 text-base leading-none">{emoji}</span>
            {t("chat.reactWith", { emoji })}
          </ContextMenuItem>
        ))}
        {canManage || isMine ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              onSelect={() =>
                deleteMessage.mutate({
                  messageId: message.id,
                  channelId: message.channel_id,
                })
              }
            >
              <Trash2 className="mr-2 size-4" />
              {t("chat.delete")}
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function MessageMeta({ message }: { message: MessageRow }) {
  const author = message.author;
  return (
    <span title={fullTime(message.created_at)}>
      {author?.display_name ?? initials(message.author_id)}
    </span>
  );
}
