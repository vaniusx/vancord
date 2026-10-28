import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { WifiOff } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useGameActivity } from "@/features/activity/use-activity";
import { useAppStore } from "@/features/app/app-store";
import { useDms } from "@/features/dm/use-dms";
import { RealtimeProvider } from "@/features/realtime/realtime";
import {
  CreateChannelDialog,
  CreateServerDialog,
  InviteDialog,
  JoinServerDialog,
  ServerSettingsDialog,
} from "@/features/servers/ServerDialogs";
import {
  useAllChannels,
  useMembers,
  useServers,
  useUnreadCounts,
} from "@/features/servers/use-servers";
import { SettingsDialog } from "@/features/settings/SettingsDialog";
import { ChannelPanel, type SidebarMode } from "@/features/shell/ChannelPanel";
import { CommandPalette } from "@/features/shell/CommandPalette";
import { MobileNav } from "@/features/shell/MobileNav";
import { ServerRail } from "@/features/shell/ServerRail";
import { TitleBar } from "@/features/shell/TitleBar";
import { VoiceBar } from "@/features/voice/VoiceBar";
import { isTauri } from "@/lib/tauri";
import { accentFor } from "@/lib/format";

type DialogName =
  | "createServer"
  | "joinServer"
  | "invite"
  | "serverSettings"
  | "createChannel"
  | null;

function useTrayEvents() {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isTauri()) return;

    let disposed = false;
    const unlisteners: Array<() => void> = [];

    void (async () => {
      const { listen } = await import("@tauri-apps/api/event");

      const onStatus = await listen<string>("tray://status", (event) => {
        const key = event.payload;
        toast.info(t(`status.${key}` as const, { defaultValue: key }));
      });
      const onSettings = await listen("tray://settings", () => {
        useAppStore.getState().openSettings("profile");
      });

      if (disposed) {
        onStatus();
        onSettings();
        return;
      }
      unlisteners.push(onStatus, onSettings);
    })();

    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [t]);
}

function useShortcuts() {
  const setPaletteOpen = useAppStore((state) => state.setPaletteOpen);
  const openSettings = useAppStore((state) => state.openSettings);
  const toggleChannels = useAppStore((state) => state.toggleChannels);
  const toggleMembers = useAppStore((state) => state.toggleMembers);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (mod && event.key === ",") {
        event.preventDefault();
        openSettings("profile");
      }
      if (mod && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleChannels();
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleMembers();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setPaletteOpen, openSettings, toggleChannels, toggleMembers]);
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}

function ShellLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  useTrayEvents();
  useShortcuts();
  const online = useOnline();

  const { data: servers } = useServers();
  const { data: dms } = useDms();
  const { data: unread } = useUnreadCounts();
  const { data: allChannels } = useAllChannels();

  const serverMatch = location.pathname.match(/^\/s\/([^/]+)/);
  const activeServerId = serverMatch?.[1] ?? null;

  const activeServer = servers?.find((server) => server.id === activeServerId);
  const { data: members } = useMembers(activeServerId ?? undefined);

  const channelMatch =
    location.pathname.match(/^\/s\/[^/]+\/([^/]+)/) ??
    location.pathname.match(/^\/dm\/([^/]+)/);
  const activeChannelId = channelMatch?.[1];

  const sidebarMode: SidebarMode = activeServerId
    ? "server"
    : location.pathname.startsWith("/dm/")
      ? "dm"
      : "friends";

  const [dialog, setDialog] = useState<DialogName>(null);
  const [mobileChannels, setMobileChannels] = useState(false);

  const gameDetection = useAppStore((state) => state.gameDetection);
  const manualGame = useAppStore((state) => state.manualGame);
  useGameActivity({
    enabled: gameDetection,
    manual: manualGame,
    visible: true,
  });

  const channelsOpen = useAppStore((state) => state.channelsOpen);
  const setChannelsOpen = useAppStore((state) => state.setChannelsOpen);

  const unreadByServer: Record<string, boolean> = {};
  if (unread && allChannels) {
    for (const channel of allChannels) {
      if (!channel.server_id) continue;
      if ((unread[channel.id] ?? 0) > 0) unreadByServer[channel.server_id] = true;
    }
  }

  const channels = (allChannels ?? []).filter(
    (channel) => channel.server_id === activeServerId,
  );
  const unreadDm = (dms ?? []).some((dm) => (unread?.[dm.id] ?? 0) > 0);

  const canManage =
    activeServer?.role === "owner" || activeServer?.role === "admin";

  const accent = activeServer?.accent_color || accentFor(activeServer?.id ?? "home");

  const panelProps = {
    activeServer,
    channels: activeServer ? channels : [],
    activeChannelId,
    unread: unread ?? {},
    dms: dms ?? [],
    mode: sidebarMode,
    onInvite: () => setDialog("invite"),
    onServerSettings: () => setDialog("serverSettings"),
    onCreateChannel: () => setDialog("createChannel"),
    onLeaveServer: () => setDialog("serverSettings"),
    onDeleteServer: () => setDialog("serverSettings"),
    onClose: () => setChannelsOpen(false),
  };

  return (
    <div
      className="stage flex h-[100dvh] flex-col overflow-hidden text-foreground"
      style={{
        ["--server-accent" as string]: accent,
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <TitleBar />

      {!online ? (
        <div className="mx-2 mb-1 flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-1.5 text-[12px] text-destructive">
          <WifiOff className="size-3.5" />
          {t("common.offlineBanner")}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-2 px-2 pt-1 pb-2">
        <ServerRail
          servers={servers ?? []}
          activeServerId={activeServerId}
          unreadByServer={unreadByServer}
          onSelectServer={(serverId) => navigate(`/s/${serverId}`)}
          onAddServer={() => setDialog("createServer")}
          onJoinServer={() => setDialog("joinServer")}
          onSettings={() => useAppStore.getState().openSettings("appearance")}
        />

        {channelsOpen ? (
          <div className="hidden md:flex">
            <ChannelPanel {...panelProps} />
          </div>
        ) : null}

        <main className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <Outlet />
          </div>
          <VoiceBar />
        </main>
      </div>

      <MobileNav
        servers={servers ?? []}
        activeServerId={activeServerId}
        unreadByServer={unreadByServer}
        unreadDm={unreadDm}
        onSelectServer={(serverId) => navigate(`/s/${serverId}`)}
        onAddServer={() => setDialog("createServer")}
        onJoinServer={() => setDialog("joinServer")}
        onOpenChannels={() => setMobileChannels(true)}
      />

      <Sheet open={mobileChannels} onOpenChange={setMobileChannels}>
        <SheetContent
          side="left"
          className="w-[286px] max-w-[86vw] border-none bg-transparent p-0 shadow-none"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t("sidebar.channels")}</SheetTitle>
          </SheetHeader>
          <div className="h-full p-2">
            <ChannelPanel
              {...panelProps}
              onClose={() => setMobileChannels(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <CreateServerDialog
        open={dialog === "createServer"}
        onOpenChange={(open) => setDialog(open ? "createServer" : null)}
      />
      <JoinServerDialog
        open={dialog === "joinServer"}
        onOpenChange={(open) => setDialog(open ? "joinServer" : null)}
      />
      <InviteDialog
        open={dialog === "invite"}
        onOpenChange={(open) => setDialog(open ? "invite" : null)}
        server={activeServer}
        canManage={Boolean(canManage)}
      />
      <CreateChannelDialog
        open={dialog === "createChannel"}
        onOpenChange={(open) => setDialog(open ? "createChannel" : null)}
        serverId={activeServer?.id}
      />
      <ServerSettingsDialog
        open={dialog === "serverSettings"}
        onOpenChange={(open) => setDialog(open ? "serverSettings" : null)}
        server={activeServer}
        memberCount={members?.length ?? 0}
      />

      <SettingsDialog />
      <CommandPalette />
    </div>
  );
}

export function AppShell() {
  return (
    <RealtimeProvider>
      <ShellLayout />
    </RealtimeProvider>
  );
}
