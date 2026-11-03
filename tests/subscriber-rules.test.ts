import { describe, expect, it } from "vitest";
import { daysUntil, renewalBuckets, revenueStats, toCsv } from "../src/lib/master/subscriber-rules";

const NOW = new Date("2026-11-03T12:00:00Z").getTime();
const plus = (d: number) => new Date(NOW + d * 86_400_000).toISOString();
const sub = (status: string, end: number | null, cents = 2990, created = plus(-40)) => ({
  status,
  current_period_end: end === null ? null : plus(end),
  created_at: created,
  plan: { preco_cents: cents },
});

describe("subscriber rules", () => {
  it("counts days until a date", () => {
    expect(daysUntil(plus(3), NOW)).toBe(3);
    expect(daysUntil(null, NOW)).toBeNull();
  });
  it("splits renewals into expiring in 7 days and overdue", () => {
    const b = renewalBuckets([sub("active", 5), sub("active", 20), sub("active", -2), sub("past_due", 3), sub("trialing", 1)], NOW);
    expect(b.expiringSoon.length).toBe(1);
    expect(b.overdue.length).toBe(2);
  });
  it("MRR sums only active plans", () => {
    const s = revenueStats([sub("active", 5, 2990), sub("active", 5, 4990), sub("trialing", 5, 4990), sub("canceled", null)], NOW);
    expect(s.mrr).toBe(7980);
    expect(s.conversionPct).toBe(67);
  });
  it("escapes CSV fields", () => {
    expect(toCsv(["a"], [["x;y"]])).toBe('a\n"x;y"');
  });
});
