import { ChevronDown, Hash, Plus, Search, Users, Volume2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/avatar";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
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
import { accentFor, initials } from "@/lib/format";
import type { ChannelRow, DmChannel, ServerSummary } from "@/lib/models";
import { cn } from "@/lib/utils";

export type SidebarMode = "friends" | "server" | "dm";

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
    <div className="flex items-center gap-1 pb-0.5">
      <button
        type="button"
        onClick={onToggle}
        className="-ml-1 flex min-h-7 items-center gap-1 rounded-md px-1 text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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

function ChannelButton({
  channel,
  active,
  unread,
  accent,
  onClick,
}: {
  channel: ChannelRow;
  active: boolean;
  unread: number;
  accent: string;
  onClick: () => void;
}) {
  const isVoice = channel.type === "voice";
  const Icon = isVoice ? Volume2 : Hash;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-8.5 w-full items-center gap-2 rounded-lg pr-2.5 pl-3 text-left text-[13.5px] transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active
          ? "bg-accent font-medium text-foreground"
          : unread > 0
            ? "font-medium text-foreground hover:bg-accent/55"
            : "text-muted-foreground hover:bg-accent/55 hover:text-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 left-1 w-[3px] -translate-y-1/2 rounded-full transition-all duration-150",
          active ? "h-4 opacity-100" : "h-0 opacity-0",
        )}
        style={{ backgroundColor: accent }}
      />
      <Icon
        className={cn("size-4 shrink-0", active ? "" : "opacity-60")}
        style={active ? { color: accent } : undefined}
      />
      <span className="truncate">{channel.name}</span>
      {unread > 0 && !active && !isVoice ? (
        <span
          className="ml-auto rounded-full px-1.5 text-[10.5px] font-semibold text-white tabular-nums"
          style={{ backgroundColor: accent }}
        >
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
  accent,
}: {
  dm: DmChannel;
  active: boolean;
  unread: number;
  accent: string;
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
        "flex h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-left transition-colors",
        active ? "bg-accent" : "hover:bg-accent/60",
      )}
    >
      <div className="relative">
        <Avatar profile={other} size="sm" />
        <StatusDot status={status} className="absolute -right-0.5 -bottom-0.5 size-2.5" />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13.5px] font-medium">{other.display_name}</p>
        <p className="truncate text-[11.5px] text-muted-foreground">
          {other.custom_status || `@${other.username}`}
        </p>
      </div>
      {unread > 0 && !active ? (
        <span
          className="shrink-0 rounded-full px-1.5 text-[10.5px] font-semibold text-white tabular-nums"
          style={{ backgroundColor: accent }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </button>
  );
}

interface ChannelPanelProps {
  activeServer: ServerSummary | undefined;
  channels: ChannelRow[];
  activeChannelId: string | undefined;
  unread: Record<string, number>;
  dms: DmChannel[];
  mode: SidebarMode;
  onInvite: () => void;
  onServerSettings: () => void;
  onCreateChannel: () => void;
  onLeaveServer: () => void;
  onDeleteServer: () => void;
  onClose: () => void;
}

export function ChannelPanel({
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
  onClose,
}: ChannelPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setPaletteOpen = useAppStore((state) => state.setPaletteOpen);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(true);

  const accent = activeServer?.accent_color || accentFor(activeServer?.id ?? "home");
  const isAdmin = activeServer?.role === "owner" || activeServer?.role === "admin";
  const isOwner = activeServer?.role === "owner";

  const textChannels = channels.filter((channel) => channel.type === "text");
  const voiceChannels = channels.filter((channel) => channel.type === "voice");
  const showDms = mode !== "server";

  return (
    <aside className="panel flex h-full w-[262px] shrink-0 flex-col overflow-hidden">
      <div className="flex h-[52px] shrink-0 items-center gap-2 px-2.5">
        {mode === "server" && activeServer ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-accent/60"
              >
                <div
                  className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[8px] text-[11px] font-semibold text-white"
                  style={{ backgroundColor: accent }}
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

        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronDown className="size-4 rotate-90" />
        </button>
      </div>

      <div className="px-2.5 pb-2">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex h-8 w-full items-center gap-2 rounded-xl bg-background/70 px-2.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-background dark:bg-black/20 dark:hover:bg-black/30"
        >
          <Search className="size-3.5" />
          <span>{t("palette.trigger")}</span>
          <kbd className="ml-auto font-sans text-[10px] tracking-wide opacity-70">Ctrl K</kbd>
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
                        className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
                    <ChannelButton
                      key={channel.id}
                      channel={channel}
                      active={channel.id === activeChannelId}
                      unread={unread[channel.id] ?? 0}
                      accent={accent}
                      onClick={() => navigate(`/s/${activeServer.id}/${channel.id}`)}
                    />
                  ))}
                  {textChannels.length === 0 ? (
                    <p className="px-3 py-1.5 text-[12.5px] text-muted-foreground">
                      {t("sidebar.noChannels")}
                    </p>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>

              {voiceChannels.length > 0 ? (
                <Collapsible open={voiceOpen} onOpenChange={setVoiceOpen}>
                  <SectionLabel
                    open={voiceOpen}
                    onToggle={() => setVoiceOpen((value) => !value)}
                  >
                    {t("sidebar.voiceChannels")}
                  </SectionLabel>
                  <CollapsibleContent className="space-y-0.5">
                    {voiceChannels.map((channel) => (
                      <ChannelButton
                        key={channel.id}
                        channel={channel}
                        active={channel.id === activeChannelId}
                        unread={0}
                        accent={accent}
                        onClick={() => navigate(`/s/${activeServer.id}/${channel.id}`)}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
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
                    className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
                  className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-[13.5px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
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
                    accent={accent}
                  />
                ))}
                {dms.length === 0 ? (
                  <p className="px-3 py-1.5 text-[12.5px] text-muted-foreground">
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
