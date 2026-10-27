import { ArrowDown, Loader2, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/common/empty-state";
import { MessageItem } from "@/features/messages/MessageItem";
import type { MessageRow } from "@/lib/models";
import { canGroup, dayLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MessageList({
  messages,
  hasMore,
  loadingOlder,
  onLoadOlder,
  canManage,
  ready,
}: {
  messages: MessageRow[];
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  canManage: boolean;
  ready: boolean;
}) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const lastCount = useRef(0);
  const lastChannel = useRef<string | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const channelId = messages[0]?.channel_id ?? null;

    if (lastChannel.current !== channelId) {
      lastChannel.current = channelId;
      lastCount.current = messages.length;
      requestAnimationFrame(() => scrollToBottom("auto"));
      return;
    }

    if (messages.length > lastCount.current && atBottom) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    }
    lastCount.current = messages.length;
  }, [messages, atBottom]);

  const onScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const distance =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setAtBottom(distance < 120);

    if (container.scrollTop < 80 && hasMore && !loadingOlder) {
      const previousHeight = container.scrollHeight;
      onLoadOlder();
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight - previousHeight + 80;
      });
    }
  };

  if (ready && messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <EmptyState
          icon={<MessageCircle className="size-5" />}
          title={t("chat.emptyTitle")}
          description={t("chat.emptyBody")}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="scrollbar-thin h-full overflow-y-auto overscroll-contain pb-4"
      >
        {loadingOlder ? (
          <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            {t("chat.loadingOlder")}
          </div>
        ) : null}

        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const newDay =
            !previous ||
            new Date(previous.created_at).toDateString() !==
              new Date(message.created_at).toDateString();
          const grouped =
            !newDay &&
            Boolean(previous) &&
            previous.author_id === message.author_id &&
            canGroup(previous.created_at, message.created_at);

          return (
            <div key={message.id}>
              {newDay ? (
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <div className="h-px flex-1 bg-border/70" />
                  <span className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {dayLabel(message.created_at)}
                  </span>
                  <div className="h-px flex-1 bg-border/70" />
                </div>
              ) : null}
              <MessageItem
                message={message}
                grouped={grouped}
                canManage={canManage}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <button
        type="button"
        onClick={() => scrollToBottom()}
        aria-label={t("chat.jumpToBottom")}
        className={cn(
          "absolute right-4 bottom-3 flex items-center gap-1.5 rounded-full border border-border bg-popover px-3 py-1.5 text-[11px] text-muted-foreground shadow-md transition-all",
          atBottom
            ? "pointer-events-none translate-y-2 opacity-0"
            : "translate-y-0 opacity-100 hover:text-foreground",
        )}
      >
        <ArrowDown className="size-3.5" />
        {t("chat.jumpToBottom")}
      </button>
    </div>
  );
}
