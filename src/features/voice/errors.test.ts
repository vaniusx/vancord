import { describe, expect, it } from "vitest";

import { classifyVoiceError, isPermanentVoiceError } from "@/features/voice/errors";

describe("classifyVoiceError", () => {
  it("marks a missing server configuration as permanent", () => {
    const code = classifyVoiceError(new Error("livekit_not_configured"));
    expect(code).toBe("voice_not_configured");
    expect(isPermanentVoiceError(code)).toBe(true);
  });

  it("detects an expired session from the token endpoint", () => {
    expect(classifyVoiceError({ message: "", status: 401 })).toBe("voice_unauthenticated");
  });

  it("detects a forbidden channel", () => {
    expect(classifyVoiceError({ message: "", status: 403 })).toBe("voice_forbidden");
  });

  it("explains a denied microphone instead of a generic error", () => {
    const error = Object.assign(new Error("Permission denied"), { name: "NotAllowedError" });
    expect(classifyVoiceError(error)).toBe("voice_mic_denied");
  });

  it("detects a missing microphone", () => {
    const error = Object.assign(new Error("Requested device not found"), {
      name: "NotFoundError",
    });
    expect(classifyVoiceError(error)).toBe("voice_no_device");
  });

  it("detects a microphone held by another app", () => {
    const error = Object.assign(new Error("Could not start audio source"), {
      name: "NotReadableError",
    });
    expect(classifyVoiceError(error)).toBe("voice_mic_busy");
  });

  it("detects a blocked websocket, which is what the CSP caused", () => {
    const code = classifyVoiceError(new Error("WebSocket connection failed: CSP"));
    expect(code).toBe("voice_websocket_blocked");
    expect(isPermanentVoiceError(code)).toBe(true);
  });

  it("detects a network failure", () => {
    const error = new TypeError("Failed to fetch");
    expect(classifyVoiceError(error)).toBe("voice_network");
  });

  it("falls back without throwing on unknown input", () => {
    expect(classifyVoiceError(null)).toBe("voice_connect_failed");
    expect(classifyVoiceError(undefined)).toBe("voice_connect_failed");
    expect(classifyVoiceError("weird")).toBe("voice_connect_failed");
  });

  it("does not treat a microphone denial as permanent", () => {
    expect(isPermanentVoiceError("voice_mic_denied")).toBe(false);
  });
});
