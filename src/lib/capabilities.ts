import { useEffect, useState } from "react";

import { isTauri, usePlatform, type Platform } from "@/lib/tauri";

/**
 * What this build can actually do, derived from the platform rather than from a
 * CSS breakpoint. Screens ask for a capability, not for a viewport width, so a
 * narrow desktop window keeps desktop behaviour and a wide tablet keeps touch
 * behaviour.
 */
export interface Capabilities {
  platform: Platform;
  /** Native shell (Tauri) rather than a browser tab. */
  native: boolean;
  touch: boolean;
  /** Pointer sits far from the screen; enables hover-only affordances. */
  hover: boolean;
  /** Narrow layout: sheet instead of a docked panel. */
  compact: boolean;
  /** Full call UI with video and the screen-share control. */
  callUi: boolean;
  screenShare: boolean;
  /** In-app updater. */
  updater: boolean;
  deepLink: boolean;
  /** Window chrome drawn by us (custom title bar). */
  customChrome: boolean;
  notifications: boolean;
}

const MOBILE: Platform[] = ["android", "ios"];

function readMedia(query: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

export function useCapabilities(): Capabilities {
  const platform = usePlatform();
  const [pointerCoarse, setPointerCoarse] = useState(() => readMedia("(pointer: coarse)"));
  const [hover, setHover] = useState(() => readMedia("(hover: hover)"));
  const [compactViewport, setCompactViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const coarse = window.matchMedia("(pointer: coarse)");
    const hoverMedia = window.matchMedia("(hover: hover)");
    const onCoarse = (event: MediaQueryListEvent) => setPointerCoarse(event.matches);
    const onHover = (event: MediaQueryListEvent) => setHover(event.matches);

    coarse.addEventListener("change", onCoarse);
    hoverMedia.addEventListener("change", onHover);

    const onResize = () => setCompactViewport(window.innerWidth < 768);
    window.addEventListener("resize", onResize);

    return () => {
      coarse.removeEventListener("change", onCoarse);
      hoverMedia.removeEventListener("change", onHover);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const mobile = MOBILE.includes(platform);
  const native = isTauri();

  return {
    platform,
    native,
    touch: mobile || pointerCoarse,
    hover: hover && !mobile,
    compact: compactViewport || mobile,
    callUi: true,
    screenShare: !mobile,
    updater: platform === "windows" || platform === "macos" || platform === "linux",
    deepLink: native,
    customChrome: platform === "windows" || platform === "linux",
    notifications: native,
  };
}

/** Cheap read for code paths that cannot call a hook (e.g. voice internals). */
export function hasScreenShare(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function"
  );
}
