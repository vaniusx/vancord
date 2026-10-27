import { Loader2, Paperclip, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/features/app/app-store";
import { EmojiPicker } from "@/features/messages/EmojiPicker";
import { useSendMessage } from "@/features/messages/use-messages";
import { useTypingSender } from "@/features/realtime/realtime";
import { cn } from "@/lib/utils";
import { uploadAttachment, type UploadResult } from "@/lib/upload";

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
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
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
      });

      clearDraft(channelId);
      files.forEach((item) => item.preview && URL.revokeObjectURL(item.preview));
      setFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("common.error");
      toast.error(
        message === "file-too-large" ? t("chat.fileTooLarge") : message,
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="px-4 pb-4"
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
      <div
        className={cn(
          "rounded-xl border border-border/80 bg-card/80 shadow-sm transition-colors focus-within:border-primary/50",
          dragging && "border-primary bg-primary/5",
        )}
      >
        {files.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-b border-border/60 p-2">
            {files.map((item) => (
              <div
                key={item.id}
                className="group relative flex size-16 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary"
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
                  className="absolute top-0.5 right-0.5 rounded-full bg-background/90 p-0.5 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-end gap-1 p-1.5">
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
            className="size-9 shrink-0 text-muted-foreground"
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
            className="max-h-[200px] min-h-9 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[14px] shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
          />

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
            disabled={sending || (!draft.trim() && files.length === 0)}
            className="size-9 shrink-0"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <p className="mt-1.5 px-1 text-[10.5px] text-muted-foreground">
        {t("chat.composerHint")}
      </p>
    </div>
  );
}
