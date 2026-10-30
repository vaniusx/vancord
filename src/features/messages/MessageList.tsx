import { ArrowDown, Loader2, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  onReply,
  onPin,
}: {
  messages: MessageRow[];
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  canManage: boolean;
  ready: boolean;
  onReply?: (message: MessageRow) => void;
  onPin?: (message: MessageRow, pinned: boolean) => void;
}) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const lastCount = useRef(0);
  const byId = useMemo(() => {
    const map = new Map<string, MessageRow>();
    for (const message of messages) map.set(message.id, message);
    return map;
  }, [messages]);
  const lastChannel = useRef<string | null>(null);
  // Height captured before an "older messages" fetch. The scroll position is
  // corrected once the new rows are actually in the DOM; the old code adjusted
  // on the next animation frame, before the data arrived, so the view jumped.
  const pendingPrepend = useRef<number | null>(null);

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
      pendingPrepend.current = null;
      requestAnimationFrame(() => scrollToBottom("auto"));
      return;
    }

    const grew = messages.length > lastCount.current;

    if (grew && pendingPrepend.current !== null) {
      const delta = container.scrollHeight - pendingPrepend.current;
      pendingPrepend.current = null;
      if (delta > 0) container.scrollTop += delta;
    } else if (grew && atBottom) {
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

    if (
      container.scrollTop < 80 &&
      hasMore &&
      !loadingOlder &&
      pendingPrepend.current === null
    ) {
      pendingPrepend.current = container.scrollHeight;
      onLoadOlder();
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
        className="scrollbar-thin h-full overflow-y-auto overscroll-contain pb-2"
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
            <div key={message.id} className="chat-row">
              {newDay ? (
                <div className="flex items-center gap-3 px-4 pt-6 pb-1.5">
                  <span className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                    {dayLabel(message.created_at)}
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
              ) : null}
              <MessageItem
                message={message}
                grouped={grouped}
                canManage={canManage}
                replyPreview={(() => {
                  if (!message.reply_to_id) return null;
                  const target = byId.get(message.reply_to_id);
                  if (!target) return { author: t("chat.replyUnavailable"), excerpt: "" };
                  const author =
                    target.author?.display_name ??
                    target.bot?.name ??
                    t("common.unknownUser");
                  const excerpt = target.content.replace(/\s+/g, " ").slice(0, 90);
                  return { author, excerpt };
                })()}
                onReply={onReply ? () => onReply(message) : undefined}
                onPin={onPin ? (pinned) => onPin(message, pinned) : undefined}
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
