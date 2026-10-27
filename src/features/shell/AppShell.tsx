import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
import { CommandPalette } from "@/features/shell/CommandPalette";
import { ServerRail } from "@/features/shell/ServerRail";
import { Sidebar } from "@/features/shell/Sidebar";
import { TitleBar } from "@/features/shell/TitleBar";
import { WifiOff } from "lucide-react";
import { isTauri } from "@/lib/tauri";

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
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setPaletteOpen, openSettings]);
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

  const [dialog, setDialog] = useState<DialogName>(null);

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

  const canManage =
    activeServer?.role === "owner" || activeServer?.role === "admin";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />

      {!online ? (
        <div className="flex items-center justify-center gap-2 bg-destructive/10 px-4 py-1.5 text-[12.5px] text-destructive">
          <WifiOff className="size-3.5" />
          {t("common.offlineBanner")}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <ServerRail
          servers={servers ?? []}
          activeServerId={activeServerId}
          unreadByServer={unreadByServer}
          onSelectServer={(serverId) => navigate(`/s/${serverId}`)}
          onAddServer={() => setDialog("createServer")}
          onJoinServer={() => setDialog("joinServer")}
          onSettings={() => useAppStore.getState().openSettings("appearance")}
        />

        <Sidebar
          activeServer={activeServer}
          channels={activeServer ? channels : []}
          activeChannelId={activeChannelId}
          unread={unread ?? {}}
          dms={dms ?? []}
          onInvite={() => setDialog("invite")}
          onServerSettings={() => setDialog("serverSettings")}
          onCreateChannel={() => setDialog("createChannel")}
          onLeaveServer={() => setDialog("serverSettings")}
          onDeleteServer={() => setDialog("serverSettings")}
        />

        <main className="flex min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

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
