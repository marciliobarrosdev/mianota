import { describe, expect, it } from "vitest";
import { releaseConfirmationError, releaseDays, releaseUntil } from "../src/lib/master/manual-release-rules";

const NOW = new Date("2026-11-03T12:00:00Z").getTime();

describe("manual release rules", () => {
  it("paid plan defaults to 30 days", () => expect(releaseDays({ is_free: false }, undefined)).toBe(30));
  it("paid plan caps at 365 days", () => expect(releaseDays({ is_free: false }, 900)).toBe(365));
  it("free plan uses its own day limit", () => expect(releaseDays({ is_free: true, free_days: 7 }, 60)).toBe(7));
  it("expired period counts from now", () =>
    expect(releaseUntil(30, "2026-10-01T00:00:00Z", NOW)).toBe("2026-12-03T12:00:00.000Z"));
  it("valid period is extended", () =>
    expect(releaseUntil(30, "2026-11-10T12:00:00Z", NOW)).toBe("2026-12-10T12:00:00.000Z"));
  it("requires confirmation", () => {
    expect(releaseConfirmationError(false)).not.toBeNull();
    expect(releaseConfirmationError(true)).toBeNull();
  });
});
