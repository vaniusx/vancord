import { isTauri } from "@/lib/tauri";

export interface UpdateInfo {
  version: string;
  notes: string | null;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isTauri()) return null;
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return null;
    return { version: update.version, notes: update.body ?? null };
  } catch {
    return null;
  }
}

export async function installUpdate(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return false;
    await update.downloadAndInstall();
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
    return true;
  } catch {
    return false;
  }
}
