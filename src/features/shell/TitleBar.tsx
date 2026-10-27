import { Copy, Minus, Search, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/features/app/app-store";
import { isTauri } from "@/lib/tauri";
import { cn } from "@/lib/utils";

async function windowAction(action: "minimize" | "toggleMaximize" | "close") {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  if (action === "minimize") await win.minimize();
  if (action === "toggleMaximize") await win.toggleMaximize();
  if (action === "close") await win.close();
}

function useIsMaximized() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      const sync = async () => {
        const value = await win.isMaximized();
        if (!disposed) setMaximized(value);
      };
      await sync();
      unlisten = await win.onResized(() => void sync());
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return maximized;
}

function WindowButton({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            "flex h-11 w-12 items-center justify-center text-muted-foreground transition-colors",
            destructive
              ? "hover:bg-destructive hover:text-white"
              : "hover:bg-accent hover:text-foreground",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function TitleBar() {
  const { t } = useTranslation();
  const maximized = useIsMaximized();
  const setPaletteOpen = useAppStore((state) => state.setPaletteOpen);

  return (
    <header
      data-tauri-drag-region
      className="relative z-40 flex h-11 shrink-0 items-center border-b border-border/70 bg-sidebar text-sidebar-foreground select-none"
    >
      <div className="flex min-w-0 items-center gap-2.5 px-3">
        <div className="brand-gradient flex size-6 items-center justify-center rounded-[7px] text-[12px] font-bold text-white shadow-sm">
          V
        </div>
        <span className="text-[13px] font-semibold tracking-tight">
          {t("app.name")}
        </span>
      </div>

      <div data-tauri-drag-region className="h-full flex-1" />

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="mr-2 hidden h-7 items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 text-[12px] text-muted-foreground transition-colors hover:border-border hover:text-foreground md:flex"
      >
        <Search className="size-3.5" />
        <span>{t("palette.trigger")}</span>
        <kbd className="ml-6 rounded border border-border/80 bg-muted px-1 font-sans text-[10px] tracking-wide">
          Ctrl K
        </kbd>
      </button>

      {isTauri() ? (
        <div className="flex h-full items-stretch">
          <WindowButton
            label={t("titlebar.minimize")}
            onClick={() => void windowAction("minimize")}
          >
            <Minus className="size-3.5" />
          </WindowButton>
          <WindowButton
            label={maximized ? t("titlebar.restore") : t("titlebar.maximize")}
            onClick={() => void windowAction("toggleMaximize")}
          >
            {maximized ? (
              <Copy className="size-3" />
            ) : (
              <Square className="size-3" />
            )}
          </WindowButton>
          <WindowButton
            label={t("titlebar.close")}
            onClick={() => void windowAction("close")}
            destructive
          >
            <X className="size-4" />
          </WindowButton>
        </div>
      ) : (
        <div className="w-2" />
      )}
    </header>
  );
}
