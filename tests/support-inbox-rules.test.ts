import { describe, expect, it } from "vitest";
import { dayLabel, isNearBottom, startsNewDay } from "@/lib/whatsapp/support-inbox-rules";

const now = new Date(2026, 10, 3, 12);

describe("support inbox rules", () => {
  it("labels today and yesterday", () => {
    expect(dayLabel(new Date(2026, 10, 3, 8).toISOString(), now)).toBe("Hoje");
    expect(dayLabel(new Date(2026, 10, 2, 8).toISOString(), now)).toBe("Ontem");
    expect(dayLabel(new Date(2026, 9, 30, 8).toISOString(), now)).toBe("30/10");
  });
  it("detects day changes", () => {
    expect(startsNewDay(undefined, now.toISOString())).toBe(true);
    expect(startsNewDay(new Date(2026, 10, 3, 1).toISOString(), now.toISOString())).toBe(false);
  });
  it("only auto-scrolls near the bottom", () => {
    expect(isNearBottom(900, 100, 1000)).toBe(true);
    expect(isNearBottom(100, 100, 1000)).toBe(false);
  });
});
