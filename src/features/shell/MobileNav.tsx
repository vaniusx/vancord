import { Compass, Hash, MessageCircle, Plus, Search, Settings2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/avatar";
import { useAppStore } from "@/features/app/app-store";
import { useProfile } from "@/features/profiles/use-profile";
import { useLiveStatus } from "@/features/realtime/realtime";
import { StatusDot } from "@/features/shell/presence";
import type { ServerSummary } from "@/lib/models";
import { accentFor } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MobileNav({
  servers,
  activeServerId,
  unreadByServer,
  unreadDm,
  onAddServer,
  onJoinServer,
  onOpenChannels,
}: {
  servers: ServerSummary[];
  activeServerId: string | null;
  unreadByServer: Record<string, boolean>;
  unreadDm: boolean;
  onSelectServer: (serverId: string) => void;
  onAddServer: () => void;
  onJoinServer: () => void;
  onOpenChannels: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openSettings = useAppStore((state) => state.openSettings);
  const setPaletteOpen = useAppStore((state) => state.setPaletteOpen);
  const { data: profile } = useProfile();
  const status = useLiveStatus(profile?.id ?? "", profile?.status ?? "offline");

  const activeServer = servers.find((server) => server.id === activeServerId);
  const hasUnreadServer = servers.some((server) => unreadByServer[server.id]);
  const accent = activeServer ? activeServer.accent_color || accentFor(activeServer.id) : undefined;

  const itemClass =
    "relative flex h-full flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors";

  return (
    <nav
      className="panel mx-2 mb-2 flex h-14 shrink-0 items-stretch gap-0.5 px-1 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <button
        type="button"
        onClick={() => navigate("/")}
        className={cn(itemClass, activeServerId ? "text-muted-foreground" : "text-primary")}
      >
        <MessageCircle className="size-[19px]" />
        {t("rail.home")}
        {unreadDm ? (
          <span className="absolute top-2 right-4 size-1.5 rounded-full bg-signal" />
        ) : null}
      </button>

      <button
        type="button"
        onClick={onOpenChannels}
        className={cn(itemClass, activeServerId ? "text-foreground" : "text-muted-foreground")}
        style={activeServerId && accent ? { color: accent } : undefined}
      >
        <Hash className="size-[19px]" />
        {activeServer ? activeServer.name.slice(0, 8) : t("sidebar.channels")}
        {hasUnreadServer ? (
          <span className="absolute top-2 right-4 size-1.5 rounded-full bg-signal" />
        ) : null}
      </button>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className={cn(itemClass, "text-muted-foreground")}
      >
        <Search className="size-[19px]" />
        {t("common.search")}
      </button>

      <button
        type="button"
        onClick={onJoinServer}
        className={cn(itemClass, "text-muted-foreground")}
      >
        <Compass className="size-[19px]" />
        {t("rail.joinServer")}
      </button>

      <button
        type="button"
        onClick={() => onAddServer()}
        className={cn(itemClass, "text-muted-foreground")}
      >
        <Plus className="size-[19px]" />
        {t("rail.addServer")}
      </button>

      <button
        type="button"
        onClick={() => openSettings("profile")}
        className={cn(itemClass, "text-muted-foreground")}
      >
        {profile ? (
          <span className="relative">
            <Avatar profile={profile} size="xs" />
            <StatusDot
              status={status}
              className="absolute -right-0.5 -bottom-0.5 size-2"
            />
          </span>
        ) : (
          <Users className="size-[19px]" />
        )}
        {t("settings.title")}
      </button>

      <button
        type="button"
        onClick={() => openSettings("appearance")}
        aria-label={t("settings.appearance.theme")}
        className="hidden"
      >
        <Settings2 />
      </button>
    </nav>
  );
}
