/**
 * Voice failures used to collapse into one message ("LiveKit is not
 * configured") for every cause, which hid microphone permissions, expired
 * sessions and blocked WebSockets behind a misleading label.
 *
 * This module classifies what actually happened. The UI translates the code, so
 * the user gets an action they can take instead of a dead end.
 */
export type VoiceErrorCode =
  | "voice_not_configured"
  | "voice_unauthenticated"
  | "voice_forbidden"
  | "voice_channel_unavailable"
  | "voice_mic_denied"
  | "voice_mic_busy"
  | "voice_no_device"
  | "voice_network"
  | "voice_websocket_blocked"
  | "voice_room_full"
  | "voice_connect_failed";

interface NamedError {
  name?: string;
  message?: string;
  code?: string | number;
  status?: number;
  context?: { status?: number };
}

function statusOf(error: NamedError): number | undefined {
  return error.status ?? error.context?.status;
}

/** Classifies anything thrown by the token call or LiveKit connect. */
export function classifyVoiceError(error: unknown): VoiceErrorCode {
  if (!error) return "voice_connect_failed";

  const named = error as NamedError;
  const name = named.name ?? "";
  const message = (named.message ?? "").toLowerCase();
  const status = statusOf(named);

  // The token function reports its own reasons as a plain string error.
  if (message.includes("livekit_not_configured") || status === 503) {
    return "voice_not_configured";
  }
  if (status === 401 || message.includes("unauthenticated")) {
    return "voice_unauthenticated";
  }
  if (status === 403 || message.includes("forbidden")) {
    return "voice_forbidden";
  }
  if (message.includes("not_a_callable_channel") || status === 400) {
    return "voice_channel_unavailable";
  }

  // Browser/WebView media errors.
  if (name === "NotAllowedError" || message.includes("permission") || message.includes("denied")) {
    return "voice_mic_denied";
  }
  if (name === "NotFoundError" || message.includes("no device") || message.includes("devices not found")) {
    return "voice_no_device";
  }
  if (name === "NotReadableError" || message.includes("could not start")) {
    return "voice_mic_busy";
  }
  if (name === "OverconstrainedError") {
    return "voice_no_device";
  }

  // LiveKit signalling.
  if (
    message.includes("websocket") ||
    message.includes("csp") ||
    message.includes("refused to connect") ||
    name === "ConnectionError"
  ) {
    return "voice_websocket_blocked";
  }
  if (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("failed to fetch") ||
    name === "TypeError"
  ) {
    return "voice_network";
  }
  if (message.includes("full") || message.includes("participant limit")) {
    return "voice_room_full";
  }

  return "voice_connect_failed";
}

/** True when retrying immediately cannot help. */
export function isPermanentVoiceError(code: VoiceErrorCode): boolean {
  return (
    code === "voice_not_configured" ||
    code === "voice_forbidden" ||
    code === "voice_channel_unavailable" ||
    code === "voice_websocket_blocked"
  );
}
