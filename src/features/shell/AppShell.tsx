import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { CommandPalette } from "@/features/shell/CommandPalette";
import { Sidebar } from "@/features/shell/Sidebar";
import { TitleBar } from "@/features/shell/TitleBar";
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
  useChannels,
  useMembers,
  useServers,
  useUnreadCounts,
} from "@/features/servers/use-servers";
import { SettingsDialog } from "@/features/settings/SettingsDialog";
import { isTauri } from "@/lib/tauri";

type DialogName = "createServer" | "joinServer" | "invite" | "serverSettings" | "createChannel" | null;

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
  useTrayEvents();
  useShortcuts();
  const online = useOnline();

  const { data: servers } = useServers();
  const { data: dms } = useDms();
  const { data: unread } = useUnreadCounts();

  const lastServerId = useAppStore((state) => state.lastServerId);
  const setLastServerId = useAppStore((state) => state.setLastServerId);

  const serverMatch = location.pathname.match(/^\/s\/([^/]+)/);
  const routeServerId = serverMatch?.[1];
  const activeServerId = routeServerId ?? lastServerId ?? servers?.[0]?.id;

  useEffect(() => {
    if (routeServerId) setLastServerId(routeServerId);
  }, [routeServerId, setLastServerId]);

  const activeServer = servers?.find((server) => server.id === activeServerId);
  const { data: channels } = useChannels(activeServerId);
  const { data: members } = useMembers(activeServerId);

  const channelMatch =
    location.pathname.match(/^\/s\/[^/]+\/([^/]+)/) ??
    location.pathname.match(/^\/dm\/([^/]+)/);
  const activeChannelId = channelMatch?.[1];

  const [dialog, setDialog] = useState<DialogName>(null);

  const canManage =
    activeServer?.role === "owner" || activeServer?.role === "admin";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          servers={servers ?? []}
          activeServer={activeServer}
          channels={channels ?? []}
          activeChannelId={activeChannelId}
          unread={unread ?? {}}
          dms={dms ?? []}
          online={online}
          onSelectServer={(serverId) => navigate(`/s/${serverId}`)}
          onAddServer={() => setDialog("createServer")}
          onJoinServer={() => setDialog("joinServer")}
          onInvite={() => setDialog("invite")}
          onServerSettings={() => setDialog("serverSettings")}
          onCreateChannel={() => setDialog("createChannel")}
          onLeaveServer={() => setDialog("serverSettings")}
          onDeleteServer={() => setDialog("serverSettings")}
        />
        <Outlet />
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
