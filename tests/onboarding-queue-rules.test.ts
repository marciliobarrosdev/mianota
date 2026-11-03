import { describe, expect, it } from "vitest";
import { filterQueue, isWaitingTooLong, waitingHours } from "@/lib/master/onboarding-queue-rules";

const now = new Date("2026-11-03T12:00:00Z");
const rows = [
  { status: "sent", created_at: "2026-11-01T12:00:00Z", buyer_email: "ana@x.com", buyer_phone_masked: "(11) 9****-1234" },
  { status: "paired", created_at: "2026-10-01T12:00:00Z", buyer_name: "Bruno" },
];

describe("onboarding queue", () => {
  it("filters by 7-day period", () => {
    expect(filterQueue(rows, "", "7d", now)).toHaveLength(1);
  });
  it("searches by e-mail and phone digits", () => {
    expect(filterQueue(rows, "ana@", "all", now)).toHaveLength(1);
    expect(filterQueue(rows, "1234", "all", now)).toHaveLength(1);
  });
  it("flags waits of 24h or more, not linked ones", () => {
    expect(waitingHours(rows[0], now)).toBe(48);
    expect(isWaitingTooLong(rows[0], now)).toBe(true);
    expect(waitingHours(rows[1], now)).toBeNull();
  });
});
