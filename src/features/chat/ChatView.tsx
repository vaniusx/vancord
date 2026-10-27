import { Hash, Search, Users } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/features/app/app-store";
import { TypingIndicator } from "@/features/chat/TypingIndicator";
import { useChannel, useDmPartner } from "@/features/dm/use-dms";
import { MemberList } from "@/features/members/MemberList";
import { Composer } from "@/features/messages/Composer";
import { MessageList } from "@/features/messages/MessageList";
import {
  useMessages,
  useOlderMessages,
} from "@/features/messages/use-messages";
import { useLiveStatus } from "@/features/realtime/realtime";
import {
  useMarkRead,
  useMembers,
  useServer,
} from "@/features/servers/use-servers";
import { StatusDot } from "@/features/shell/presence";
import { cn } from "@/lib/utils";

export function ChatView({ channelId }: { channelId: string }) {
  const { t } = useTranslation();
  const { serverId } = useParams<{ serverId?: string }>();
  const { data: channel, isLoading: channelLoading } = useChannel(channelId);
  const server = useServer(serverId);
  const members = useMembers(serverId);
  const messages = useMessages(channelId);
  const older = useOlderMessages(channelId);
  const markRead = useMarkRead();
  const membersOpen = useAppStore((state) => state.membersOpen);
  const setMembersOpen = useAppStore((state) => state.setMembersOpen);
  const toggleMembers = useAppStore((state) => state.toggleMembers);
  const setActiveChannelId = useAppStore((state) => state.setActiveChannelId);

  const isDm = channel?.type === "dm";
  const { data: partner } = useDmPartner(channelId, Boolean(isDm));
  const partnerStatus = useLiveStatus(
    partner?.id ?? "",
    partner?.status ?? "offline",
  );

  useEffect(() => {
    setActiveChannelId(channelId);
    markRead.mutate(channelId);
    return () => setActiveChannelId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  useEffect(() => {
    const onFocus = () => markRead.mutate(channelId);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  const isAdmin =
    server?.role === "owner" || server?.role === "admin" || Boolean(isDm);

  const title = isDm
    ? (partner?.display_name ?? t("dm.title"))
    : (channel?.name ?? "");

  if (channelLoading) {
    return (
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[52px] items-center gap-3 border-b border-border/60 px-4">
          <Skeleton className="size-7 rounded-lg" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex-1 space-y-4 p-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-center text-[13.5px] text-muted-foreground">
        {t("chat.channelNotFound")}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border/60 px-4">
        {isDm && partner ? (
          <div className="relative">
            <Avatar profile={partner} size="sm" />
            <StatusDot
              status={partnerStatus}
              className="absolute -right-0.5 -bottom-0.5 size-2.5"
            />
          </div>
        ) : (
          <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Hash className="size-4" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
          <h1 className="truncate text-[14.5px] font-semibold">
            {title}
          </h1>
          <p className="hidden truncate text-[12.5px] text-muted-foreground md:block">
            {isDm
              ? `@${partner?.username ?? ""}`
              : channel.topic || t("chat.noTopic")}
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("palette.title")}
                className="size-8 text-muted-foreground"
                onClick={() => useAppStore.getState().setPaletteOpen(true)}
              >
                <Search className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("palette.title")}</TooltipContent>
          </Tooltip>

          {!isDm ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("sidebar.members")}
                    onClick={toggleMembers}
                    className={cn(
                      "size-8 text-muted-foreground",
                      membersOpen && "bg-accent text-foreground",
                    )}
                  >
                    <Users className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("sidebar.members")}</TooltipContent>
              </Tooltip>
            </>
          ) : null}
        </div>
      </header>

      <MessageList
        messages={messages.data?.messages ?? []}
        hasMore={messages.data?.hasMore ?? false}
        loadingOlder={older.isPending}
        onLoadOlder={() => {
          const first = messages.data?.messages[0];
          if (first) older.mutate(first.created_at);
        }}
        canManage={isAdmin}
        ready={messages.isSuccess}
      />

      <TypingIndicator channelId={channelId} />

      <Composer
        channelId={channelId}
        placeholder={
          isDm
            ? t("chat.placeholderDm", { name: title })
            : t("chat.placeholder", { channel: title })
        }
      />

      {!isDm ? (
        <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
          <SheetContent
            side="right"
            className="w-[300px] max-w-[300px] gap-0 border-l border-border/60 bg-sidebar p-0 data-[side=right]:w-[300px] data-[side=right]:sm:max-w-[300px]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{t("sidebar.members")}</SheetTitle>
            </SheetHeader>
            <MemberList members={members.data ?? []} />
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
