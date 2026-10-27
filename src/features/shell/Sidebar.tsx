import {
  Ban,
  ChevronDown,
  Hash,
  HashIcon,
  MessageSquare,
  Plus,
  Settings,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DmChannel, ServerSummary } from "@/lib/models";
import type { ChannelRow } from "@/lib/models";
import { useLiveStatus } from "@/features/realtime/realtime";
import { UserCard } from "@/features/shell/UserCard";
import { WorkspaceSwitcher } from "@/features/shell/WorkspaceSwitcher";
import { cn } from "@/lib/utils";

interface SidebarProps {
  servers: ServerSummary[];
  activeServer: ServerSummary | undefined;
  channels: ChannelRow[];
  activeChannelId: string | undefined;
  unread: Record<string, number>;
  dms: DmChannel[];
  online: boolean;
  onSelectServer: (serverId: string) => void;
  onAddServer: () => void;
  onJoinServer: () => void;
  onInvite: () => void;
  onServerSettings: () => void;
  onCreateChannel: () => void;
  onLeaveServer: () => void;
  onDeleteServer: () => void;
}

function DmRow({ dm, active }: { dm: DmChannel; active: boolean }) {
  const navigate = useNavigate();
  const other = dm.members[0];
  const status = useLiveStatus(other?.id ?? "", other?.status ?? "offline");

  if (!other) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/dm/${dm.id}`)}
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <div className="relative">
        <Avatar profile={other} size="xs" />
        <span
          className={cn(
            "absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-sidebar",
            status === "online" && "bg-status-online",
            status === "idle" && "bg-status-idle",
            status === "dnd" && "bg-status-dnd",
            status === "offline" && "bg-status-offline",
          )}
        />
      </div>
      <span className="truncate text-[13px] font-medium">
        {other.display_name}
      </span>
    </button>
  );
}

export function Sidebar({
  servers,
  activeServer,
  channels,
  activeChannelId,
  unread,
  dms,
  online,
  onSelectServer,
  onAddServer,
  onJoinServer,
  onInvite,
  onServerSettings,
  onCreateChannel,
  onLeaveServer,
  onDeleteServer,
}: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dmsOpen, setDmsOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);

  const isAdmin = activeServer?.role === "owner" || activeServer?.role === "admin";
  const isOwner = activeServer?.role === "owner";

  return (
    <aside className="flex w-[272px] shrink-0 flex-col border-r border-sidebar-border/70 bg-sidebar text-sidebar-foreground">
      <WorkspaceSwitcher
        servers={servers}
        activeServerId={activeServer?.id ?? null}
        onSelectServer={onSelectServer}
        onAddServer={onAddServer}
        onJoinServer={onJoinServer}
        online={online}
      />

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1 px-2 pt-2">
          {activeServer ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent/60"
                  >
                    <span className="truncate text-[13px] font-semibold">
                      {activeServer.name}
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onSelect={onInvite}>
                    <UserPlus className="mr-2 size-4" />
                    {t("invites.invitePeople")}
                  </DropdownMenuItem>
                  {isAdmin ? (
                    <>
                      <DropdownMenuItem onSelect={onCreateChannel}>
                        <HashIcon className="mr-2 size-4" />
                        {t("sidebar.createChannel")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={onServerSettings}>
                        <Settings className="mr-2 size-4" />
                        {t("servers.settings")}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  <DropdownMenuSeparator />
                  {isOwner ? (
                    <DropdownMenuItem variant="destructive" onSelect={onDeleteServer}>
                      <Ban className="mr-2 size-4" />
                      {t("servers.delete")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem variant="destructive" onSelect={onLeaveServer}>
                      <UserMinus className="mr-2 size-4" />
                      {t("servers.leave")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen}>
                <div className="flex items-center justify-between px-2 pt-2 pb-1">
                  <CollapsibleTrigger className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground">
                    <ChevronDown
                      className={cn(
                        "size-3 transition-transform",
                        !channelsOpen && "-rotate-90",
                      )}
                    />
                    {t("sidebar.textChannels")}
                  </CollapsibleTrigger>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={onCreateChannel}
                      aria-label={t("sidebar.createChannel")}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  ) : null}
                </div>
                <CollapsibleContent className="space-y-0.5">
                  {channels.map((channel) => {
                    const count = unread[channel.id] ?? 0;
                    const active = channel.id === activeChannelId;
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => navigate(`/s/${activeServer.id}/${channel.id}`)}
                        className={cn(
                          "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[13px] transition-colors",
                          active
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : count > 0
                              ? "font-medium text-sidebar-foreground hover:bg-sidebar-accent/60"
                              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                        )}
                      >
                        <Hash className="size-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{channel.name}</span>
                        {count > 0 ? (
                          <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                            {count > 99 ? "99+" : count}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                  {channels.length === 0 ? (
                    <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
                      {t("sidebar.noChannels")}
                    </p>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>

              <div className="mx-2 my-2 h-px bg-sidebar-border/70" />
            </>
          ) : null}

          <Collapsible open={dmsOpen} onOpenChange={setDmsOpen}>
            <div className="flex items-center justify-between px-2 pt-1 pb-1">
              <CollapsibleTrigger className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground">
                <ChevronDown
                  className={cn(
                    "size-3 transition-transform",
                    !dmsOpen && "-rotate-90",
                  )}
                />
                {t("dm.title")}
              </CollapsibleTrigger>
              <button
                type="button"
                onClick={() => navigate("/")}
                aria-label={t("friends.title")}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Users className="size-3.5" />
              </button>
            </div>
            <CollapsibleContent className="space-y-0.5">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                <Users className="size-3.5" />
                {t("friends.title")}
              </button>
              {dms.map((dm) => (
                <DmRow key={dm.id} dm={dm} active={dm.id === activeChannelId} />
              ))}
              {dms.length === 0 ? (
                <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
                  {t("dm.empty")}
                </p>
              ) : null}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      <div className="px-2 pb-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full justify-start gap-2 border-dashed text-[12px] text-muted-foreground"
          onClick={onInvite}
          disabled={!activeServer}
        >
          <MessageSquare className="size-3.5" />
          {t("invites.invitePeople")}
        </Button>
      </div>

      <UserCard />
    </aside>
  );
}
