import { Compass, MessageCircle, Plus, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/avatar";
import { BrandMark } from "@/components/common/brand-mark";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/features/app/app-store";
import { useProfile } from "@/features/profiles/use-profile";
import { useLiveStatus } from "@/features/realtime/realtime";
import { StatusDot } from "@/features/shell/presence";
import { accentFor, initials } from "@/lib/format";
import type { ServerSummary } from "@/lib/models";
import { cn } from "@/lib/utils";

function RailButton({
  label,
  active,
  onClick,
  unread,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  unread?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex size-10 items-center justify-center overflow-hidden rounded-[13px] text-[13px] font-semibold transition-colors duration-150",
            active
              ? "bg-primary text-primary-foreground"
              : "bg-card/80 text-muted-foreground hover:bg-card hover:text-foreground dark:bg-white/[0.06] dark:hover:bg-white/[0.11]",
          )}
        >
          {children}
          {unread && !active ? (
            <span className="absolute right-1 bottom-1 size-1.5 rounded-full bg-signal" />
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function ServerRail({
  servers,
  activeServerId,
  unreadByServer,
  onSelectServer,
  onAddServer,
  onJoinServer,
  onSettings,
}: {
  servers: ServerSummary[];
  activeServerId: string | null;
  unreadByServer: Record<string, boolean>;
  onSelectServer: (serverId: string) => void;
  onAddServer: () => void;
  onJoinServer: () => void;
  onSettings: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openSettings = useAppStore((state) => state.openSettings);
  const { data: profile } = useProfile();
  const status = useLiveStatus(profile?.id ?? "", profile?.status ?? "offline");

  return (
    <nav
      aria-label={t("rail.servers")}
      className="flex w-14 shrink-0 flex-col items-center gap-1.5 border-r border-sidebar-border/60 bg-rail py-3"
    >
      <RailButton
        label={t("rail.home")}
        active={activeServerId === null}
        onClick={() => navigate("/")}
      >
        <MessageCircle className="size-[18px]" />
      </RailButton>

      <div className="my-1 h-px w-6 shrink-0 bg-sidebar-border" />

      <div className="scrollbar-none flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto">
        {servers.map((server) => (
          <RailButton
            key={server.id}
            label={server.name}
            active={activeServerId === server.id}
            unread={unreadByServer[server.id]}
            onClick={() => onSelectServer(server.id)}
          >
            {server.icon_url ? (
              <img src={server.icon_url} alt="" className="size-full object-cover" />
            ) : (
              <span
                style={
                  activeServerId === server.id
                    ? undefined
                    : { color: accentFor(server.id) }
                }
              >
                {initials(server.name)}
              </span>
            )}
          </RailButton>
        ))}

        <RailButton label={t("rail.addServer")} onClick={onAddServer}>
          <Plus className="size-[18px]" />
        </RailButton>
        <RailButton label={t("rail.joinServer")} onClick={onJoinServer}>
          <Compass className="size-[18px]" />
        </RailButton>
      </div>

      <div className="mt-1 flex shrink-0 flex-col items-center gap-1.5">
        <RailButton label={t("settings.title")} onClick={onSettings}>
          <Settings2 className="size-[18px]" />
        </RailButton>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={profile?.display_name ?? t("rail.profile")}
              onClick={() => openSettings("profile")}
              className="relative mt-0.5"
            >
              {profile ? (
                <Avatar profile={profile} size="sm" className="rounded-[9px]" />
              ) : (
                <BrandMark size={28} />
              )}
              <StatusDot
                status={status}
                className="absolute -right-0.5 -bottom-0.5 size-2.5"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {profile?.display_name ?? t("rail.profile")}
          </TooltipContent>
        </Tooltip>
      </div>
    </nav>
  );
}
