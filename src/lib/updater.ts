import { isTauri } from "@/lib/tauri";

/**
 * Update plumbing for the desktop builds.
 *
 * Policy: if a newer stable build exists when the app opens, it is installed
 * before the UI is shown. The user can turn this off in Settings → About, in
 * which case the app opens normally and only shows a notice.
 */

export const APP_VERSION: string = __APP_VERSION__;

export interface UpdateInfo {
  version: string;
  notes: string | null;
  currentVersion: string;
}

export type UpdatePhase =
  | "idle"
  | "checking"
  | "downloading"
  | "installing"
  | "error";

export interface UpdateProgress {
  phase: UpdatePhase;
  downloaded: number;
  total: number | null;
  version: string | null;
  message: string | null;
}

const GUARD_KEY = "vancord.update.guard";
const MAX_ATTEMPTS = 2;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
/** A slow or offline network must never hold the app hostage. */
export const CHECK_TIMEOUT_MS = 3000;

interface GuardState {
  version: string;
  attempts: number;
  blockedUntil: number | null;
}

function readGuard(): GuardState | null {
  try {
    const raw = localStorage.getItem(GUARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuardState;
    if (typeof parsed?.version !== "string") return null;
    return {
      version: parsed.version,
      attempts: Number(parsed.attempts) || 0,
      blockedUntil: typeof parsed.blockedUntil === "number" ? parsed.blockedUntil : null,
    };
  } catch {
    return null;
  }
}

function writeGuard(state: GuardState | null) {
  try {
    if (state) localStorage.setItem(GUARD_KEY, JSON.stringify(state));
    else localStorage.removeItem(GUARD_KEY);
  } catch {
    // storage unavailable: the guard simply does not apply
  }
}

/** True when this exact version already failed to install twice. */
export function isUpdateBlocked(version: string): boolean {
  const guard = readGuard();
  if (!guard || guard.version !== version) return false;
  if (guard.blockedUntil === null) return guard.attempts >= MAX_ATTEMPTS;
  return Date.now() < guard.blockedUntil;
}

export function recordUpdateFailure(version: string) {
  const guard = readGuard();
  const attempts =
    guard && guard.version === version ? guard.attempts + 1 : 1;
  writeGuard({
    version,
    attempts,
    blockedUntil: attempts >= MAX_ATTEMPTS ? Date.now() + COOLDOWN_MS : null,
  });
}

export function clearUpdateGuard() {
  writeGuard(null);
}

/** Pre-release versions are never auto-installed. */
export function isStableVersion(version: string): boolean {
  return !/-(alpha|beta|rc|dev|canary)/i.test(version);
}

export function canAutoUpdate(): boolean {
  return isTauri();
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isTauri()) return null;
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return null;
    return {
      version: update.version,
      notes: update.body ?? null,
      currentVersion: update.currentVersion ?? APP_VERSION,
    };
  } catch {
    return null;
  }
}

/** Resolves with the update, or null if the network does not answer quickly. */
export function checkForUpdateWithTimeout(
  timeoutMs = CHECK_TIMEOUT_MS,
): Promise<UpdateInfo | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, timeoutMs);

    void checkForUpdate()
      .then((info) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(info);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(null);
      });
  });
}

export interface InstallOptions {
  onProgress?: (progress: UpdateProgress) => void;
  signal?: AbortSignal;
}

/**
 * Downloads and installs the pending update. Returns false when there is
 * nothing to install or when the install failed.
 */
export async function downloadAndInstall(
  options: InstallOptions = {},
): Promise<boolean> {
  if (!isTauri()) return false;
  const report = (progress: UpdateProgress) => options.onProgress?.(progress);

  let version: string | null = null;
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return false;
    version = update.version;

    report({
      phase: "downloading",
      downloaded: 0,
      total: null,
      version,
      message: null,
    });

    let downloaded = 0;
    let total: number | null = null;

    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? null;
        report({ phase: "downloading", downloaded: 0, total, version, message: null });
        return;
      }
      if (event.event === "Progress") {
        downloaded += event.data.chunkLength ?? 0;
        report({ phase: "downloading", downloaded, total, version, message: null });
        return;
      }
      report({
        phase: "installing",
        downloaded: total ?? downloaded,
        total,
        version,
        message: null,
      });
    });

    clearUpdateGuard();
    report({ phase: "installing", downloaded, total, version, message: null });
    return true;
  } catch (error) {
    if (version) recordUpdateFailure(version);
    report({
      phase: "error",
      downloaded: 0,
      total: null,
      version,
      message: error instanceof Error ? error.message : "update_failed",
    });
    return false;
  }
}

export async function relaunchApp(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch {
    // nothing else to do: the user can close the window manually
  }
}

export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
