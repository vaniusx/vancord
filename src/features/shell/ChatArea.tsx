import { Hash, Send, Smile, Paperclip } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  demoChannels,
  demoMessages,
  DEMO_SERVER,
  type DemoMessage,
} from "@/features/shell/demo-data";
import { cn } from "@/lib/utils";

function MessageRow({ message }: { message: DemoMessage }) {
  return (
    <div className="group relative flex gap-3 px-4 py-0.5 hover:bg-accent/40">
      <div
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: message.color }}
      >
        {message.author.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] font-semibold text-foreground">
            {message.author}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {message.time}
          </span>
        </div>
        <p className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap text-foreground/90 select-text">
          {message.content}
        </p>
      </div>
    </div>
  );
}

function Composer({ channelName }: { channelName: string }) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  const notice = () => {
    toast.info(t("dev.phaseNotice"));
  };

  return (
    <div className="px-4 pt-1 pb-4">
      <div className="flex items-end gap-1 rounded-xl bg-secondary/70 p-1.5 ring-1 ring-border/60 focus-within:ring-brand/50">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground"
          aria-label={t("chat.attach")}
          onClick={notice}
        >
          <Paperclip className="size-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            resize();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              notice();
            }
          }}
          placeholder={t("chat.placeholder", { channel: channelName })}
          className="max-h-44 min-h-9 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[14.5px] shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground"
          aria-label={t("chat.emoji")}
          onClick={notice}
        >
          <Smile className="size-4" />
        </Button>
        <Button
          size="icon"
          className={cn("size-9 shrink-0", value.trim().length === 0 && "opacity-50")}
          aria-label={t("chat.send")}
          onClick={notice}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function ChatArea() {
  const { t } = useTranslation();
  const { channelId } = useParams<{ channelId: string }>();

  const channel = useMemo(
    () => demoChannels.find((item) => item.id === channelId) ?? demoChannels[0],
    [channelId],
  );

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <Hash className="size-5 text-muted-foreground" />
        <h1 className="text-[15px] font-semibold">{channel.name}</h1>
        <span className="ml-2 hidden truncate text-[12px] text-muted-foreground md:inline">
          {t("chat.welcomeBody", {
            channel: channel.name,
            server: DEMO_SERVER.name,
          })}
        </span>
      </header>

      <div className="scrollbar-none flex min-h-0 flex-1 flex-col justify-end overflow-y-auto py-4">
        <div className="px-4 pb-4">
          <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-secondary">
            <Hash className="size-9 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("chat.welcomeTitle", { channel: channel.name })}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("chat.welcomeBody", {
              channel: channel.name,
              server: DEMO_SERVER.name,
            })}
          </p>
        </div>

        <div className="border-t border-border/60 pt-3">
          {demoMessages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
        </div>
      </div>

      <Composer channelName={channel.name} />
    </section>
  );
}
