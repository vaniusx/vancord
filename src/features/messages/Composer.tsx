import { Loader2, Paperclip, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/features/app/app-store";
import { EmojiPicker } from "@/features/messages/EmojiPicker";
import { GifPickerButton } from "@/features/messages/GifPicker";
import { StickerPicker } from "@/features/stickers/StickerPicker";
import { stickerMessage, type StickerDef } from "@/features/stickers/catalog";
import { useSendMessage } from "@/features/messages/use-messages";
import { useTypingSender } from "@/features/realtime/realtime";
import { uploadAttachment, type UploadResult } from "@/lib/upload";
import { cn } from "@/lib/utils";

interface PendingFile {
  id: string;
  file: File;
  preview: string | null;
}

const MAX_FILES = 5;

export function Composer({
  channelId,
  placeholder,
  replyTo,
  onCancelReply,
  mentionables = [],
}: {
  channelId: string;
  placeholder: string;
  replyTo?: { id: string; author: string; excerpt: string } | null;
  onCancelReply?: () => void;
  mentionables?: Array<{ id: string; username: string; display_name: string }>;
}) {
  const { t } = useTranslation();
  const draft = useAppStore((state) => state.drafts[channelId] ?? "");
  const setDraft = useAppStore((state) => state.setDraft);
  const clearDraft = useAppStore((state) => state.clearDraft);
  const { sendTyping } = useTypingSender();
  const sendMessage = useSendMessage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const mentionMatches =
    mentionQuery === null
      ? []
      : mentionables
          .filter((member) => {
            const query = mentionQuery.toLowerCase();
            return (
              member.username.toLowerCase().startsWith(query) ||
              member.display_name.toLowerCase().startsWith(query)
            );
          })
          .slice(0, 6);

  const applyMention = (member: { username: string }) => {
    const value = draft;
    const at = value.lastIndexOf("@");
    const next = at >= 0 ? value.slice(0, at) + "@" + member.username + " " : value + "@" + member.username + " ";
    setDraft(channelId, next);
    setMentionQuery(null);
    setMentionIndex(0);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming).slice(0, MAX_FILES - files.length);
    const next = list.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    if (next.length) setFiles((current) => [...current, ...next]);
  };

  const removeFile = (id: string) => {
    setFiles((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return current.filter((item) => item.id !== id);
    });
  };

  const submit = async () => {
    const content = draft.trim();
    if ((!content && files.length === 0) || sending) return;

    setSending(true);
    try {
      const uploads: UploadResult[] = [];
      for (const item of files) {
        uploads.push(await uploadAttachment(crypto.randomUUID(), item.file));
      }

      await sendMessage.mutateAsync({
        channelId,
        content,
        attachments: uploads,
        replyToId: replyTo?.id ?? null,
      });

      clearDraft(channelId);
      onCancelReply?.();
      files.forEach((item) => item.preview && URL.revokeObjectURL(item.preview));
      setFiles([]);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.error");
      toast.error(message === "file-too-large" ? t("chat.fileTooLarge") : message);
    } finally {
      setSending(false);
    }
  };

  const canSend = Boolean(draft.trim()) || files.length > 0;

  const sendGif = async (url: string) => {
    if (sending) return;
    setSending(true);
    try {
      await sendMessage.mutateAsync({ channelId, content: url, attachments: [] });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const sendSticker = async (sticker: StickerDef) => {
    if (sending) return;
    setSending(true);
    try {
      await sendMessage.mutateAsync({
        channelId,
        content: stickerMessage(sticker.id),
        attachments: [],
      });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div
      className="relative px-4 pb-4"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
      }}
    >
      {dragging ? (
        <div className="pointer-events-none absolute inset-x-4 inset-y-2 z-10 flex items-center justify-center rounded-xl border border-dashed border-primary bg-background/90 text-[13px] font-medium text-primary">
          {t("chat.dropToAttach")}
        </div>
      ) : null}

      {replyTo ? (
        <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-border/70 bg-card/70 px-3 py-1.5 text-[12px]">
          <span className="shrink-0 text-muted-foreground">{t("chat.replyingTo")}</span>
          <span className="min-w-0 flex-1 truncate font-medium">{replyTo.author}</span>
          <span className="hidden min-w-0 flex-1 truncate text-muted-foreground sm:block">
            {replyTo.excerpt}
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label={t("common.cancel")}
            className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      {mentionMatches.length > 0 ? (
        <div className="mb-1.5 overflow-hidden rounded-xl border border-border/70 bg-popover shadow-lg">
          {mentionMatches.map((member, index) => (
            <button
              key={member.id}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                applyMention(member);
              }}
              className={
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition-colors " +
                (index === mentionIndex ? "bg-accent" : "hover:bg-accent/60")
              }
            >
              <span className="font-medium">@{member.username}</span>
              <span className="truncate text-muted-foreground">{member.display_name}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border border-border/70 bg-card transition-colors focus-within:border-primary/45">
        {files.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-b border-border/60 p-2">
            {files.map((item) => (
              <div
                key={item.id}
                className="group relative flex size-14 items-center justify-center overflow-hidden rounded-lg bg-secondary"
              >
                {item.preview ? (
                  <img src={item.preview} alt="" className="size-full object-cover" />
                ) : (
                  <span className="px-1 text-center text-[9px] break-all text-muted-foreground">
                    {item.file.name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(item.id)}
                  aria-label={t("common.remove")}
                  className="absolute top-0.5 right-0.5 rounded-full bg-background/90 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-end gap-0.5 p-1.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("chat.attach")}
            className="size-8 shrink-0 text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-4" />
          </Button>

          <Textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            placeholder={placeholder}
            onChange={(event) => {
              const value = event.target.value;
              setDraft(channelId, value);
              sendTyping(channelId);
              resize();

              const match = /(?:^|\s)@([a-zA-Z0-9_.]{0,32})$/.exec(value);
              setMentionQuery(match ? match[1] : null);
              setMentionIndex(0);
            }}
            onPaste={(event) => {
              const pasted = Array.from(event.clipboardData.files);
              if (pasted.length) {
                event.preventDefault();
                addFiles(pasted);
              }
            }}
            onKeyDown={(event) => {
              if (mentionMatches.length > 0) {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setMentionIndex((index) => (index + 1) % mentionMatches.length);
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setMentionIndex(
                    (index) => (index - 1 + mentionMatches.length) % mentionMatches.length,
                  );
                  return;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                  event.preventDefault();
                  applyMention(mentionMatches[mentionIndex]);
                  return;
                }
                if (event.key === "Escape") {
                  setMentionQuery(null);
                  return;
                }
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            className="max-h-[180px] min-h-8 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-[14.5px] shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
          />

          <GifPickerButton onSelect={sendGif} />

          <StickerPicker onSelect={sendSticker} />

          <EmojiPicker
            onSelect={(emoji) => {
              setDraft(channelId, draft + emoji);
              textareaRef.current?.focus();
            }}
            align="end"
          />

          <Button
            type="button"
            size="icon"
            aria-label={t("chat.send")}
            onClick={() => void submit()}
            disabled={sending || !canSend}
            className={cn("size-8 shrink-0", !canSend && "opacity-40")}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
