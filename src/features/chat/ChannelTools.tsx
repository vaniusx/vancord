import { Loader2, Pin, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  usePinnedMessages,
  useSearchMessages,
  useTogglePin,
} from "@/features/messages/use-chat-extras";
import type { MessageRow } from "@/lib/models";
import { clockTime, relativeTime } from "@/lib/format";

export function SearchDialog({
  open,
  onOpenChange,
  serverId,
  onJump,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId?: string | null;
  onJump: (hit: { channelId: string; serverId: string | null; messageId: string }) => void;
}) {
  const { t } = useTranslation();
  const [term, setTerm] = useState("");
  const search = useSearchMessages(term, { serverId });

  useEffect(() => {
    if (!open) setTerm("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px]">{t("chat.searchTitle")}</DialogTitle>
          <DialogDescription className="sr-only">{t("chat.searchTitle")}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t("chat.searchPlaceholder")}
            className="pl-8"
          />
        </div>

        <div className="scrollbar-thin max-h-[46vh] min-h-[120px] overflow-y-auto">
          {term.trim().length < 2 ? (
            <p className="py-6 text-center text-[12.5px] text-muted-foreground">
              {t("chat.searchHint")}
            </p>
          ) : search.isPending ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : (search.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-muted-foreground">
              {t("chat.searchEmpty")}
            </p>
          ) : (
            <div className="space-y-1">
              {(search.data ?? []).map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  onClick={() => {
                    onJump({
                      channelId: hit.channel_id,
                      serverId: hit.server_id,
                      messageId: hit.id,
                    });
                    onOpenChange(false);
                  }}
                  className="w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/60"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12.5px] font-medium">{hit.author_name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      #{hit.channel_name ?? "dm"} · {relativeTime(hit.created_at)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[12.5px] text-muted-foreground">{hit.content}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PinnedPanel({
  open,
  onOpenChange,
  channelId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
}) {
  const { t } = useTranslation();
  const pinned = usePinnedMessages(channelId);
  const togglePin = useTogglePin(channelId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(340px,calc(100vw-1rem))] gap-0 p-0 sm:max-w-[340px]">
        <SheetHeader className="border-b border-border/60 px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-[14px]">
            <Pin className="size-3.5" />
            {t("chat.pinnedTitle")}
          </SheetTitle>
        </SheetHeader>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
          {pinned.isPending ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : (pinned.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-[12.5px] text-muted-foreground">
              {t("chat.pinnedEmpty")}
            </p>
          ) : (
            (pinned.data ?? []).map((message: MessageRow) => (
              <div
                key={message.id}
                className="mb-1.5 rounded-lg border border-border/60 bg-card/60 p-2.5"
              >
                <div className="mb-1 flex items-center gap-2">
                  {message.author ? (
                    <Avatar profile={message.author} size="xs" />
                  ) : null}
                  <span className="text-[12.5px] font-medium">
                    {message.author?.display_name ?? t("common.unknownUser")}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground">
                    {clockTime(message.created_at)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-6 px-1.5 text-[11px]"
                    onClick={() =>
                      togglePin.mutate({ messageId: message.id, pinned: false })
                    }
                  >
                    {t("chat.unpin")}
                  </Button>
                </div>
                <p className="line-clamp-4 text-[12.5px] whitespace-pre-wrap">{message.content}</p>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function useJumpToMessage() {
  const navigate = useNavigate();
  return (hit: { channelId: string; serverId: string | null }) => {
    const path = hit.serverId ? `/s/${hit.serverId}/${hit.channelId}` : `/dm/${hit.channelId}`;
    navigate(path);
  };
}
