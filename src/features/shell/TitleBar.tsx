import { Copy, Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isTauri } from "@/lib/tauri";
import { cn } from "@/lib/utils";

type WindowAction = "minimize" | "toggleMaximize" | "close";

async function performWindowAction(action: WindowAction) {
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

interface WindowButtonProps {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}

function WindowButton({
  label,
  onClick,
  destructive,
  children,
}: WindowButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            "flex h-9 w-12 items-center justify-center text-muted-foreground transition-colors",
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

  return (
    <header
      data-tauri-drag-region
      className="relative z-50 flex h-9 shrink-0 items-center border-b border-sidebar-border bg-sidebar text-sidebar-foreground select-none"
    >
      <div
        data-tauri-drag-region
        className="pointer-events-none flex min-w-0 flex-1 items-center gap-2 px-3"
      >
        <div className="brand-gradient flex size-5 items-center justify-center rounded-[6px] text-[11px] font-bold text-white">
          V
        </div>
        <span className="truncate text-[13px] font-semibold tracking-tight">
          {t("app.name")}
        </span>
      </div>

      {isTauri() ? (
        <div className="flex h-full items-stretch">
          <WindowButton
            label={t("titlebar.minimize")}
            onClick={() => void performWindowAction("minimize")}
          >
            <Minus className="size-3.5" />
          </WindowButton>
          <WindowButton
            label={
              maximized ? t("titlebar.restore") : t("titlebar.maximize")
            }
            onClick={() => void performWindowAction("toggleMaximize")}
          >
            {maximized ? (
              <Copy className="size-3" />
            ) : (
              <Square className="size-3" />
            )}
          </WindowButton>
          <WindowButton
            label={t("titlebar.close")}
            onClick={() => void performWindowAction("close")}
            destructive
          >
            <X className="size-4" />
          </WindowButton>
        </div>
      ) : null}
    </header>
  );
}
