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

const RAIL_BUTTON =
  "group relative flex size-10 shrink-0 items-center justify-center rounded-[12px] text-[13px] font-semibold transition-[border-radius,background-color,color,transform] duration-150 hover:rounded-[14px] active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none";

/**
 * The active pill sits in the rail gutter, not on the icon, so the icon keeps its
 * full fill and the marker reads at a glance without adding another border.
 */
function Indicator({ active, accent }: { active?: boolean; accent?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -left-2 w-[3px] rounded-full transition-all duration-200",
        active ? "h-5 opacity-100" : "h-0 opacity-0",
      )}
      style={{ backgroundColor: accent ?? "var(--primary)" }}
    />
  );
}

function RailButton({
  label,
  active,
  onClick,
  unread,
  accent,
  children,
  className,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  unread?: boolean;
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const activeFill = accent ?? "var(--primary)";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={cn(
            RAIL_BUTTON,
            active
              ? "text-white shadow-sm ring-1 ring-black/15 ring-inset"
              : "bg-secondary/60 text-foreground/80 hover:bg-secondary hover:text-foreground",
            !active && unread && "text-foreground",
            className,
          )}
          style={active ? { backgroundColor: activeFill } : undefined}
        >
          <Indicator active={active} accent={activeFill} />
          {children}
          {unread && !active ? (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-background"
              style={{ backgroundColor: accent ?? "var(--signal)" }}
            />
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
      className="hidden w-14 shrink-0 flex-col items-center gap-1.5 py-1 md:flex"
    >
      <RailButton
        label={t("rail.home")}
        active={activeServerId === null}
        onClick={() => navigate("/")}
      >
        <MessageCircle className="size-[18px]" />
      </RailButton>

      <div className="my-1 h-px w-6 shrink-0 bg-border/70" />

      <div className="scrollbar-none flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto">
        {servers.map((server) => {
          const accent = server.accent_color || accentFor(server.id);
          const active = activeServerId === server.id;
          return (
            <RailButton
              key={server.id}
              label={server.name}
              active={active}
              accent={accent}
              unread={unreadByServer[server.id]}
              onClick={() => onSelectServer(server.id)}
            >
              {server.icon_url ? (
                <img
                  src={server.icon_url}
                  alt=""
                  className="size-full rounded-[inherit] object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center rounded-[inherit]">
                  {initials(server.name)}
                </span>
              )}
            </RailButton>
          );
        })}

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
              className="relative mt-0.5 rounded-[10px] transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
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
