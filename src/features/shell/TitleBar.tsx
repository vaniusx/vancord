import { Copy, Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { BrandMark } from "@/components/common/brand-mark";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isTauri, useIsMobile } from "@/lib/tauri";
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
            "flex h-10 w-11 items-center justify-center text-muted-foreground transition-colors",
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
  const mobile = useIsMobile();

  // Android and iOS draw their own status bar; a fake window chrome would only
  // waste vertical space.
  if (mobile) return null;

  return (
    <header
      data-tauri-drag-region
      className="relative z-40 flex h-10 shrink-0 items-center bg-transparent pt-[env(safe-area-inset-top)] select-none"
    >
      <div className="flex items-center gap-2 pl-3">
        <BrandMark size={18} />
        <span className="text-[13px] font-semibold tracking-tight text-foreground/80">
          {t("app.name")}
        </span>
      </div>

      <div data-tauri-drag-region className="h-full flex-1" />

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
            {maximized ? <Copy className="size-3" /> : <Square className="size-3" />}
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
