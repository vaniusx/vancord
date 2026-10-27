import { Compass, MessageSquare, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ServerSummary } from "@/lib/models";
import { accentFor, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface WorkspaceSwitcherProps {
  servers: ServerSummary[];
  activeServerId: string | null;
  onSelectServer: (serverId: string) => void;
  onAddServer: () => void;
  onJoinServer: () => void;
  online: boolean;
}

export function WorkspaceSwitcher({
  servers,
  activeServerId,
  onSelectServer,
  onAddServer,
  onJoinServer,
  online,
}: WorkspaceSwitcherProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-2 border-b border-sidebar-border/70 px-2 py-2">
      <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label={t("rail.home")}
              className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-primary/10 text-primary transition-colors hover:bg-primary/15"
            >
              <MessageSquare className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("rail.home")}</TooltipContent>
        </Tooltip>

        {servers.map((server) => (
          <Tooltip key={server.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onSelectServer(server.id)}
                aria-label={server.name}
                aria-current={activeServerId === server.id ? "page" : undefined}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] text-[11px] font-semibold transition-all duration-150",
                  activeServerId === server.id
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : "bg-secondary text-secondary-foreground hover:bg-accent",
                )}
                style={
                  server.icon_url
                    ? undefined
                    : {
                        backgroundImage:
                          activeServerId === server.id
                            ? undefined
                            : `linear-gradient(140deg, ${accentFor(server.id)}33, ${accentFor(server.id)}12)`,
                      }
                }
              >
                {server.icon_url ? (
                  <img
                    src={server.icon_url}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  initials(server.name)
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{server.name}</TooltipContent>
          </Tooltip>
        ))}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onAddServer}
              aria-label={t("rail.addServer")}
              className="size-9 shrink-0 rounded-[11px] border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
            >
              <Plus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("rail.addServer")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onJoinServer}
              aria-label={t("rail.joinServer")}
              className="size-9 shrink-0 rounded-[11px] text-muted-foreground hover:text-primary"
            >
              <Compass className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("rail.joinServer")}</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1.5 px-1">
        <span
          className={cn(
            "size-1.5 rounded-full",
            online ? "bg-status-online" : "bg-status-offline",
          )}
        />
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {online ? t("common.connected") : t("common.reconnecting")}
        </span>
      </div>
    </div>
  );
}

export function ServerAvatar({ server }: { server: ServerSummary }) {
  return (
    <Avatar
      profile={{
        id: server.id,
        display_name: server.name,
        avatar_url: server.icon_url,
        accent_color: accentFor(server.id),
      }}
      size="sm"
      className="rounded-lg"
    />
  );
}
