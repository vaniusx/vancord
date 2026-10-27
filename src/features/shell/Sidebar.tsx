import { ChevronDown, Hash, Plus, Search, Users, Volume2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/avatar";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/features/app/app-store";
import { useLiveStatus } from "@/features/realtime/realtime";
import { StatusDot } from "@/features/shell/presence";
import { UserCard } from "@/features/shell/UserCard";
import type { ChannelRow, DmChannel, ServerSummary } from "@/lib/models";
import { accentFor, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

function SectionLabel({
  open,
  onToggle,
  children,
  action,
}: {
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 px-1 pb-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={cn("size-3 transition-transform duration-150", !open && "-rotate-90")}
        />
        {children}
      </button>
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}

function ChannelRowButton({
  channel,
  active,
  unread,
  onClick,
}: {
  channel: ChannelRow;
  active: boolean;
  unread: number;
  onClick: () => void;
}) {
  const isVoice = channel.type === "voice";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[14px] transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : unread > 0
            ? "font-medium text-sidebar-foreground hover:bg-sidebar-accent/60"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      {active ? (
        <span className="absolute top-1.5 bottom-1.5 -left-2 w-[2px] rounded-full bg-primary" />
      ) : null}
      {isVoice ? (
        <Volume2 className="size-4 shrink-0 opacity-60" />
      ) : (
        <Hash className="size-4 shrink-0 opacity-60" />
      )}
      <span className="truncate">{channel.name}</span>
      {unread > 0 && !isVoice ? (
        <span className="ml-auto rounded-full bg-signal/15 px-1.5 text-[11px] font-semibold text-signal tabular-nums">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </button>
  );
}

function DmRow({
  dm,
  active,
  unread,
}: {
  dm: DmChannel;
  active: boolean;
  unread: number;
}) {
  const navigate = useNavigate();
  const other = dm.members[0];
  const status = useLiveStatus(other?.id ?? "", other?.status ?? "offline");

  if (!other) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/dm/${dm.id}`)}
      className={cn(
        "relative flex h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60",
      )}
    >
      <div className="relative">
        <Avatar profile={other} size="sm" />
        <StatusDot status={status} className="absolute -right-0.5 -bottom-0.5 size-2.5" />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[14px] font-medium">{other.display_name}</p>
        <p className="truncate text-[12px] text-muted-foreground">
          {other.custom_status || `@${other.username}`}
        </p>
      </div>
      {unread > 0 && !active ? (
        <span className="size-2 shrink-0 rounded-full bg-signal" />
      ) : null}
    </button>
  );
}

interface SidebarProps {
  activeServer: ServerSummary | undefined;
  channels: ChannelRow[];
  activeChannelId: string | undefined;
  unread: Record<string, number>;
  dms: DmChannel[];
  mode: "friends" | "server" | "dm";
  onInvite: () => void;
  onServerSettings: () => void;
  onCreateChannel: () => void;
  onLeaveServer: () => void;
  onDeleteServer: () => void;
}

export function Sidebar({
  activeServer,
  channels,
  activeChannelId,
  unread,
  dms,
  mode,
  onInvite,
  onServerSettings,
  onCreateChannel,
  onLeaveServer,
  onDeleteServer,
}: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setPaletteOpen = useAppStore((state) => state.setPaletteOpen);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);

  const isAdmin = activeServer?.role === "owner" || activeServer?.role === "admin";
  const isOwner = activeServer?.role === "owner";

  const textChannels = channels.filter((channel) => channel.type === "text");
  const voiceChannels = channels.filter((channel) => channel.type === "voice");

  const showDms = mode !== "server";

  return (
    <aside className="flex w-[272px] shrink-0 flex-col border-r border-sidebar-border/60 bg-sidebar text-sidebar-foreground">
      <div className="flex h-[52px] shrink-0 items-center gap-2 px-2.5">
        {mode === "server" && activeServer ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-sidebar-accent/70"
              >
                <div
                  className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[8px] text-[11px] font-semibold text-white"
                  style={{ backgroundColor: accentFor(activeServer.id) }}
                >
                  {activeServer.icon_url ? (
                    <img src={activeServer.icon_url} alt="" className="size-full object-cover" />
                  ) : (
                    initials(activeServer.name)
                  )}
                </div>
                <span className="truncate text-[14px] font-semibold">{activeServer.name}</span>
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onSelect={onInvite}>
                <Users className="mr-2 size-4" />
                {t("invites.invitePeople")}
              </DropdownMenuItem>
              {isAdmin ? (
                <>
                  <DropdownMenuItem onSelect={onCreateChannel}>
                    <Plus className="mr-2 size-4" />
                    {t("sidebar.createChannel")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onServerSettings}>
                    <ChevronDown className="mr-2 size-4" />
                    {t("servers.settings")}
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuSeparator />
              {isOwner ? (
                <DropdownMenuItem variant="destructive" onSelect={onDeleteServer}>
                  {t("servers.delete")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant="destructive" onSelect={onLeaveServer}>
                  {t("servers.leave")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5">
            <span className="truncate text-[14px] font-semibold">
              {mode === "dm" ? t("dm.title") : t("friends.title")}
            </span>
          </div>
        )}
      </div>

      <div className="px-2.5 pb-2">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex h-8 w-full items-center gap-2 rounded-lg bg-background/70 px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-background dark:bg-black/20 dark:hover:bg-black/30"
        >
          <Search className="size-3.5" />
          <span>{t("palette.trigger")}</span>
          <kbd className="ml-auto font-sans text-[10.5px] tracking-wide opacity-70">Ctrl K</kbd>
        </button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 px-2.5 pb-3">
          {mode === "server" && activeServer ? (
            <>
              <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen}>
                <SectionLabel
                  open={channelsOpen}
                  onToggle={() => setChannelsOpen((value) => !value)}
                  action={
                    isAdmin ? (
                      <button
                        type="button"
                        onClick={onCreateChannel}
                        aria-label={t("sidebar.createChannel")}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    ) : null
                  }
                >
                  {t("sidebar.textChannels")}
                </SectionLabel>
                <CollapsibleContent className="space-y-0.5">
                  {textChannels.map((channel) => (
                    <ChannelRowButton
                      key={channel.id}
                      channel={channel}
                      active={channel.id === activeChannelId}
                      unread={unread[channel.id] ?? 0}
                      onClick={() => navigate(`/s/${activeServer.id}/${channel.id}`)}
                    />
                  ))}
                  {textChannels.length === 0 ? (
                    <p className="px-2.5 py-1.5 text-[13px] text-muted-foreground">
                      {t("sidebar.noChannels")}
                    </p>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>

              {voiceChannels.length > 0 ? (
                <div>
                  <SectionLabel open onToggle={() => {}}>
                    {t("sidebar.voiceChannels")}
                  </SectionLabel>
                  <div className="space-y-0.5">
                    {voiceChannels.map((channel) => (
                      <ChannelRowButton
                        key={channel.id}
                        channel={channel}
                        active={channel.id === activeChannelId}
                        unread={0}
                        onClick={() => navigate(`/s/${activeServer.id}/${channel.id}`)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {showDms ? (
            <Collapsible open={dmsOpen} onOpenChange={setDmsOpen}>
              <SectionLabel
                open={dmsOpen}
                onToggle={() => setDmsOpen((value) => !value)}
                action={
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    aria-label={t("friends.title")}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                  >
                    <Users className="size-3.5" />
                  </button>
                }
              >
                {t("dm.title")}
              </SectionLabel>
              <CollapsibleContent className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-[14px] text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                >
                  <Users className="size-4 opacity-60" />
                  {t("friends.title")}
                </button>
                {dms.map((dm) => (
                  <DmRow
                    key={dm.id}
                    dm={dm}
                    active={dm.id === activeChannelId}
                    unread={unread[dm.id] ?? 0}
                  />
                ))}
                {dms.length === 0 ? (
                  <p className="px-2.5 py-1.5 text-[13px] text-muted-foreground">
                    {t("dm.empty")}
                  </p>
                ) : null}
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </div>
      </ScrollArea>

      <UserCard />
    </aside>
  );
}
