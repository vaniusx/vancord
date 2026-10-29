import { describe, expect, it } from "vitest";

import { canGroup, clockTime, dayLabel, initials } from "@/lib/format";
import {
  isStableVersion,
  isUpdateBlocked,
  recordUpdateFailure,
  clearUpdateGuard,
  formatBytes,
} from "@/lib/updater";

describe("initials", () => {
  it("uses two letters for a single name", () => {
    expect(initials("Enes")).toBe("EN");
  });

  it("uses the first letter of the first two words", () => {
    expect(initials("Enes Yılmaz")).toBe("EY");
  });

  it("survives empty input", () => {
    expect(initials("   ")).toBe("?");
  });
});

describe("canGroup", () => {
  it("groups messages under five minutes apart", () => {
    expect(canGroup("2026-01-01T10:00:00Z", "2026-01-01T10:04:00Z")).toBe(true);
  });

  it("breaks the group past five minutes", () => {
    expect(canGroup("2026-01-01T10:00:00Z", "2026-01-01T10:05:01Z")).toBe(false);
  });
});

describe("time helpers", () => {
  it("formats a clock time as HH:mm", () => {
    expect(clockTime("2026-01-01T09:07:00Z")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("labels today", () => {
    expect(dayLabel(new Date())).toBe("Bugün");
  });
});

describe("formatBytes", () => {
  it("scales units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("update guard", () => {
  it("treats pre-releases as unstable", () => {
    expect(isStableVersion("1.0.0")).toBe(true);
    expect(isStableVersion("1.0.0-beta.2")).toBe(false);
    expect(isStableVersion("1.0.0-rc1")).toBe(false);
  });

  it("blocks a version after two failures and clears on success", () => {
    clearUpdateGuard();
    expect(isUpdateBlocked("9.9.9")).toBe(false);

    recordUpdateFailure("9.9.9");
    expect(isUpdateBlocked("9.9.9")).toBe(false);

    recordUpdateFailure("9.9.9");
    expect(isUpdateBlocked("9.9.9")).toBe(true);
    expect(isUpdateBlocked("9.9.8")).toBe(false);

    clearUpdateGuard();
    expect(isUpdateBlocked("9.9.9")).toBe(false);
  });
});
