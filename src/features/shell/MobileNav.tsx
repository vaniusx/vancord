import { Compass, Hash, Inbox, MessageCircle, Plus, Search, Users } from "lucide-react";
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

/**
 * Bottom navigation for phones.
 *
 * The desktop server rail is hidden below `md`, so this bar is the only way to
 * change servers on a phone. The second slot opens the full server list instead
 * of showing a single server, which is what made servers look missing on Android.
 */
export function MobileNav({
  servers,
  activeServerId,
  unreadByServer,
  unreadDm,
  mentionCount,
  onOpenChannels,
  onOpenServers,
}: {
  servers: ServerSummary[];
  activeServerId: string | null;
  unreadByServer: Record<string, boolean>;
  unreadDm: boolean;
  mentionCount: number;
  onSelectServer: (serverId: string) => void;
  onAddServer: () => void;
  onJoinServer: () => void;
  onOpenChannels: () => void;
  onOpenServers: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openSettings = useAppStore((state) => state.openSettings);
  const setPaletteOpen = useAppStore((state) => state.setPaletteOpen);
  const { data: profile } = useProfile();
  const status = useLiveStatus(profile?.id ?? "", profile?.status ?? "offline");

  const activeServer = servers.find((server) => server.id === activeServerId);
  const hasUnreadServer = servers.some((server) => unreadByServer[server.id]);
  const accent = activeServer
    ? activeServer.accent_color || accentFor(activeServer.id)
    : undefined;

  const itemClass =
    "relative flex h-full flex-1 items-center justify-center gap-1 text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

  const badge = (count: number) => (
    <span
      aria-hidden="true"
      className="absolute top-1.5 right-[22%] min-w-3.5 rounded-full bg-[var(--signal)] px-1 text-center text-[9.5px] leading-3.5 font-semibold text-white"
    >
      {count > 9 ? "9+" : count}
    </span>
  );

  return (
    <nav
      aria-label={t("rail.servers")}
      className="panel mx-2 mb-2 flex h-14 shrink-0 items-stretch gap-0.5 px-1 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <button
        type="button"
        onClick={() => navigate("/")}
        aria-label={t("rail.home")}
        className={cn(itemClass, activeServerId ? "text-muted-foreground" : "text-primary")}
      >
        <MessageCircle className="size-[19px]" />
        {t("rail.home")}
        {unreadDm ? (
          <span className="absolute top-2 right-[22%] size-1.5 rounded-full bg-[var(--signal)]" />
        ) : null}
      </button>

      <button
        type="button"
        onClick={onOpenServers}
        aria-label={t("rail.servers")}
        className={cn(itemClass, activeServerId ? "text-foreground" : "text-muted-foreground")}
        style={activeServerId && accent ? { color: accent } : undefined}
      >
        {activeServer ? (
          <span
            className="flex size-[19px] items-center justify-center overflow-hidden rounded-[6px] text-[9px] font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            {activeServer.icon_url ? (
              <img src={activeServer.icon_url} alt="" className="size-full object-cover" />
            ) : (
              activeServer.name.slice(0, 2).toUpperCase()
            )}
          </span>
        ) : (
          <Users className="size-[19px]" />
        )}
        {t("rail.servers")}
        {hasUnreadServer ? (
          <span className="absolute top-2 right-[22%] size-1.5 rounded-full bg-[var(--signal)]" />
        ) : null}
      </button>

      <button
        type="button"
        onClick={onOpenChannels}
        aria-label={t("sidebar.channels")}
        className={cn(itemClass, "text-muted-foreground")}
      >
        <Hash className="size-[19px]" />
        {t("sidebar.channels")}
      </button>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label={t("common.search")}
        className={cn(itemClass, "text-muted-foreground")}
      >
        <Search className="size-[19px]" />
        {t("common.search")}
        {mentionCount > 0 ? badge(mentionCount) : null}
      </button>

      <button
        type="button"
        onClick={() => openSettings("profile")}
        aria-label={t("settings.title")}
        className={cn(itemClass, "text-muted-foreground")}
      >
        {profile ? (
          <span className="relative">
            <Avatar profile={profile} size="xs" />
            <StatusDot status={status} className="absolute -right-0.5 -bottom-0.5 size-2" />
          </span>
        ) : (
          <Inbox className="size-[19px]" />
        )}
        {t("settings.title")}
      </button>
    </nav>
  );
}

/** Server switcher for phones: every server, plus add and join. */
export function MobileServerList({
  servers,
  activeServerId,
  unreadByServer,
  onSelect,
  onAdd,
  onJoin,
  onClose,
}: {
  servers: ServerSummary[];
  activeServerId: string | null;
  unreadByServer: Record<string, boolean>;
  onSelect: (serverId: string) => void;
  onAdd: () => void;
  onJoin: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-1 p-2 pt-4">
      <button
        type="button"
        onClick={() => {
          navigate("/");
          onClose();
        }}
        className={cn(
          "flex h-12 items-center gap-3 rounded-xl px-3 text-left text-[14px] font-medium transition-colors",
          activeServerId === null ? "bg-accent" : "hover:bg-accent/60",
        )}
      >
        <span className="flex size-9 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
          <MessageCircle className="size-4" />
        </span>
        {t("rail.home")}
      </button>

      <p className="px-2 pt-3 pb-1 text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {t("rail.servers")}
      </p>

      {servers.map((server) => {
        const accent = server.accent_color || accentFor(server.id);
        const active = activeServerId === server.id;
        return (
          <button
            key={server.id}
            type="button"
            onClick={() => {
              onSelect(server.id);
              onClose();
            }}
            className={cn(
              "flex h-12 items-center gap-3 rounded-xl px-3 text-left transition-colors",
              active ? "bg-accent" : "hover:bg-accent/60",
            )}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] text-[11px] font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {server.icon_url ? (
                <img src={server.icon_url} alt="" className="size-full object-cover" />
              ) : (
                server.name.slice(0, 2).toUpperCase()
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{server.name}</span>
              <span className="block truncate text-[11.5px] text-muted-foreground">
                {t(`servers.roles.${server.role}`)}
              </span>
            </span>
            {unreadByServer[server.id] ? (
              <span className="size-2 rounded-full bg-[var(--signal)]" />
            ) : null}
          </button>
        );
      })}

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => {
            onAdd();
            onClose();
          }}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border/70 text-[13px] font-medium hover:bg-accent/60"
        >
          <Plus className="size-4" />
          {t("rail.addServer")}
        </button>
        <button
          type="button"
          onClick={() => {
            onJoin();
            onClose();
          }}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border/70 text-[13px] font-medium hover:bg-accent/60"
        >
          <Compass className="size-4" />
          {t("rail.joinServer")}
        </button>
      </div>
    </div>
  );
}
