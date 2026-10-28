import { Loader2, Paperclip, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/features/app/app-store";
import { EmojiPicker } from "@/features/messages/EmojiPicker";
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
}: {
  channelId: string;
  placeholder: string;
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

      await sendMessage.mutateAsync({ channelId, content, attachments: uploads });

      clearDraft(channelId);
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
              setDraft(channelId, event.target.value);
              sendTyping(channelId);
              resize();
            }}
            onPaste={(event) => {
              const pasted = Array.from(event.clipboardData.files);
              if (pasted.length) {
                event.preventDefault();
                addFiles(pasted);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            className="max-h-[180px] min-h-8 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-[14.5px] shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
          />

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
