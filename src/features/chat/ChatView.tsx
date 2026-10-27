import { Hash, PanelRight, Users } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/features/app/app-store";
import { TypingIndicator } from "@/features/chat/TypingIndicator";
import { useChannel, useDmPartner } from "@/features/dm/use-dms";
import { DetailContent } from "@/features/members/DetailsPanel";
import { Composer } from "@/features/messages/Composer";
import { MessageList } from "@/features/messages/MessageList";
import {
  useMessages,
  useOlderMessages,
} from "@/features/messages/use-messages";
import { useLiveStatus } from "@/features/realtime/realtime";
import { useMarkRead, useMembers, useServer } from "@/features/servers/use-servers";
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
  const detailsOpen = useAppStore((state) => state.detailsOpen);
  const toggleDetails = useAppStore((state) => state.toggleDetails);
  const setActiveChannelId = useAppStore((state) => state.setActiveChannelId);

  const isDm = channel?.type === "dm";
  const { data: partner } = useDmPartner(channelId, Boolean(isDm));
  const liveStatus = useLiveStatus(
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
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-3 border-b border-border px-5">
          <Skeleton className="size-8 rounded-lg" />
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
      </section>
    );
  }

  if (!channel) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
        {t("chat.channelNotFound")}
      </section>
    );
  }

  return (
    <section className="flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-5">
          {isDm && partner ? (
            <div className="relative">
              <Avatar profile={partner} size="sm" />
              <StatusDot
                status={liveStatus}
                className="absolute -right-0.5 -bottom-0.5 size-2.5"
              />
            </div>
          ) : (
            <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <Hash className="size-4" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[14px] font-semibold">
              {isDm ? title : `#${title}`}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {isDm
                ? `@${partner?.username ?? ""}`
                : channel.topic || t("chat.noTopic")}
            </p>
          </div>

          {!isDm ? (
            <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
              <Users className="size-3.5" />
              {members.data?.length ?? 0}
            </span>
          ) : null}

          {!isDm ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("sidebar.members")}
              onClick={toggleDetails}
              className={cn(
                "size-8 text-muted-foreground",
                detailsOpen && "bg-accent text-foreground",
              )}
            >
              <PanelRight className="size-4" />
            </Button>
          ) : null}
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
      </div>

      {!isDm && detailsOpen ? (
        <div className="hidden w-[280px] shrink-0 border-l border-border bg-sidebar/40 xl:block">
          <DetailContent
            serverName={server?.name}
            channel={channel}
            members={members.data ?? []}
          />
        </div>
      ) : null}
    </section>
  );
}
