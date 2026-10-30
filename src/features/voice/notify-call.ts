import i18n from "@/lib/i18n";
import { isTauri } from "@/lib/tauri";
import type { IncomingCall } from "@/features/voice/call-store";

/**
 * A system notification for an incoming call.
 *
 * Android cannot install a foreground service in this build, so the notification
 * is the only way the user hears about a call while the app is backgrounded. The
 * call UI still takes over when the app is in front.
 */
export async function sendCallNotification(call: IncomingCall): Promise<void> {
  if (!isTauri()) return;
  try {
    const { isPermissionGranted, requestPermission, sendNotification } = await import(
      "@tauri-apps/plugin-notification"
    );

    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
    if (!granted) return;

    const title = i18n.t(call.video ? "calls.incomingVideo" : "calls.incoming");
    sendNotification({
      title: `${title} - ${call.callername}`,
      body: i18n.t("calls.ringing"),
    });
  } catch {
    // A missing notification must never block the call itself.
  }
}
