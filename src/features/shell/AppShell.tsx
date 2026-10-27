import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";
import { toast } from "sonner";

import { ChannelSidebar } from "@/features/shell/ChannelSidebar";
import { MemberList } from "@/features/shell/MemberList";
import { ServerRail } from "@/features/shell/ServerRail";
import { TitleBar } from "@/features/shell/TitleBar";
import { isTauri } from "@/lib/tauri";

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
        const label = t(`status.${key}` as const, { defaultValue: key });
        toast.info(label);
      });

      const onSettings = await listen("tray://settings", () => {
        toast.info(t("dev.phaseNotice"));
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

export function AppShell() {
  const location = useLocation();
  const showMembers = location.pathname.startsWith("/channels/");

  useTrayEvents();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <ServerRail />
        <ChannelSidebar />
        <Outlet />
        {showMembers ? <MemberList /> : null}
      </div>
    </div>
  );
}
