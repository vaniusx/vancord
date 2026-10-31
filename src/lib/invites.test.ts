import { describe, expect, it } from "vitest";

import {
  extractInviteCode,
  inviteDeepLink,
  inviteLink,
  vanityLink,
} from "@/lib/invites";

describe("invite codes", () => {
  it("accepts a bare code", () => {
    expect(extractInviteCode("ates-orman-99")).toBe("ates-orman-99");
  });

  it("accepts an https link", () => {
    expect(extractInviteCode("https://vancord.vercel.app/ates-orman-99")).toBe(
      "ates-orman-99",
    );
  });

  it("accepts a deep link", () => {
    expect(extractInviteCode("vancord://join/ates-orman-99")).toBe("ates-orman-99");
  });

  it("ignores a trailing slash", () => {
    expect(extractInviteCode("https://vancord.vercel.app/ates-orman-99/")).toBe(
      "ates-orman-99",
    );
  });

  it("trims whitespace and stray slashes", () => {
    expect(extractInviteCode("  /ates-orman-99/  ")).toBe("ates-orman-99");
  });

  it("returns empty for blank input", () => {
    expect(extractInviteCode("   ")).toBe("");
  });

  it("builds both link forms", () => {
    expect(inviteLink("a-b-12")).toBe("https://vancord.vercel.app/a-b-12");
    expect(inviteDeepLink("a-b-12")).toBe("vancord://join/a-b-12");
    expect(vanityLink("vanius")).toBe("https://vancord.vercel.app/vanius");
  });
});
