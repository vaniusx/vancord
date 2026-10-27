import { ChevronDown, Hash, Plus, Search, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { demoChannels, demoUser, DEMO_SERVER } from "@/features/shell/demo-data";
import { StatusDot, type PresenceStatus } from "@/features/shell/presence";
import { cn } from "@/lib/utils";

function ChannelItem({
  id,
  name,
  unread,
  mention,
  active,
  onSelect,
}: {
  id: string;
  name: string;
  unread: number;
  mention: number;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-[14px] transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Hash
        className={cn(
          "size-4 shrink-0",
          active ? "text-foreground" : "text-muted-foreground/70",
        )}
      />
      <span
        className={cn(
          "truncate",
          unread > 0 && !active && "font-semibold text-sidebar-foreground",
        )}
      >
        {name}
      </span>
      {mention > 0 ? (
        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {mention}
        </span>
      ) : unread > 0 ? (
        <span className="ml-auto size-2 rounded-full bg-foreground" />
      ) : null}
    </button>
  );
}

function UserPanel() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PresenceStatus>("online");

  return (
    <div className="flex items-center gap-2 border-t border-sidebar-border bg-sidebar px-2 py-1.5">
      <div className="relative">
        <div
          className="flex size-8 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: demoUser.color }}
        >
          {demoUser.name.slice(0, 1)}
        </div>
        <StatusDot
          status={status}
          className="absolute -right-0.5 -bottom-0.5"
        />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-semibold">{demoUser.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {demoUser.tag}
        </p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            aria-label={t("status.change")}
            onClick={() =>
              setStatus((current) => (current === "online" ? "idle" : "online"))
            }
          >
            <Users className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{t("status.change")}</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function ChannelSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ channelId?: string }>();

  const activeChannelId = params.channelId ?? demoChannels[0].id;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <button
        type="button"
        className="flex h-12 items-center justify-between border-b border-sidebar-border px-3 text-left transition-colors hover:bg-sidebar-accent/60"
      >
        <span className="truncate text-[14px] font-semibold">
          {DEMO_SERVER.name}
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-1.5 px-2 py-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            readOnly
            placeholder={t("common.search")}
            className="h-7 border-none bg-black/10 pl-7 text-xs placeholder:text-muted-foreground focus-visible:ring-0 dark:bg-black/20"
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              aria-label={t("sidebar.createChannel")}
            >
              <Plus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("sidebar.createChannel")}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="scrollbar-none flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        <div className="flex items-center gap-1 px-1 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          <ChevronDown className="size-3" />
          {t("sidebar.textChannels")}
        </div>
        {demoChannels.map((channel) => (
          <ChannelItem
            key={channel.id}
            id={channel.id}
            name={channel.name}
            unread={channel.unread}
            mention={channel.mention}
            active={channel.id === activeChannelId}
            onSelect={(id) => navigate(`/channels/${id}`)}
          />
        ))}
      </div>

      <UserPanel />
    </aside>
  );
}
