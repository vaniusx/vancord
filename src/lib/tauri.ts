import { useEffect, useState } from "react";

export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export type Platform = "android" | "ios" | "windows" | "macos" | "linux" | "web";

const MOBILE: Platform[] = ["android", "ios"];

let cached: Platform | null = null;

function guess(): Platform {
  if (!isTauri()) {
    return /Android/i.test(navigator.userAgent) ? "android" : /iPhone|iPad/i.test(navigator.userAgent) ? "ios" : "web";
  }
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return "windows";
}

/** Resolves the host platform once, so the shell can branch without a flash. */
export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>(cached ?? guess());

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    void (async () => {
      try {
        const os = await import("@tauri-apps/plugin-os");
        const value = os.platform() as Platform;
        cached = value;
        if (!cancelled) setPlatform(value);
      } catch {
        cached = platform;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return platform;
}

export function useIsMobile(): boolean {
  return MOBILE.includes(usePlatform());
}
