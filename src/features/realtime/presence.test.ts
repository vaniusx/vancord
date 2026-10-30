import { describe, expect, it } from "vitest";

import { resolvePresence } from "@/features/realtime/realtime";

describe("resolvePresence", () => {
  it("shows a live status when presence has one", () => {
    expect(resolvePresence("online", "u1", "me")).toBe("online");
    expect(resolvePresence("idle", "u1", "me")).toBe("idle");
    expect(resolvePresence("dnd", "u1", "me")).toBe("dnd");
  });

  it("hides an invisible user as offline", () => {
    expect(resolvePresence("invisible", "u1", "me")).toBe("offline");
  });

  it("treats a member with no presence entry as offline", () => {
    // This is the bug: the stored profile status defaulted to "online", so every
    // member looked online forever.
    expect(resolvePresence(undefined, "u2", "me", "online")).toBe("offline");
  });

  it("keeps the local user's chosen status before the first sync", () => {
    expect(resolvePresence(undefined, "me", "me", "online")).toBe("online");
    expect(resolvePresence(undefined, "me", "me", "idle")).toBe("idle");
  });

  it("defaults the local user to offline when nothing is known", () => {
    expect(resolvePresence(undefined, "me", "me")).toBe("offline");
  });

  it("handles a missing user id", () => {
    expect(resolvePresence(undefined, null, "me")).toBe("offline");
  });
});
