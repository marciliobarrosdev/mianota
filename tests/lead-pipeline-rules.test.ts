import { describe, expect, it } from "vitest";
import { pipelineMetrics, positionBetween, shouldAutoLose, trialDaysLeft } from "@/lib/master/lead-pipeline-rules";

const now = new Date("2026-11-06T12:00:00Z");
const base = { id: "1", nome: "A", created_at: "2026-11-01T00:00:00Z" };

describe("lead pipeline", () => {
  it("places a card between neighbours", () => {
    expect(positionBetween(10, 20)).toBe(15);
    expect(positionBetween(null, null)).toBe(1000);
  });
  it("loses free leads only 7+ days after trial ends", () => {
    expect(shouldAutoLose({ ...base, stage: "experimental", trial_ate: "2026-10-30T12:00:00Z" }, now)).toBe(true);
    expect(shouldAutoLose({ ...base, stage: "experimental", trial_ate: "2026-11-02T12:00:00Z" }, now)).toBe(false);
    expect(shouldAutoLose({ ...base, stage: "convertido", trial_ate: "2026-10-01T12:00:00Z" }, now)).toBe(false);
  });
  it("counts trial days left", () => {
    expect(trialDaysLeft("2026-11-08T12:00:00Z", now)).toBe(2);
  });
  it("conversion rate uses closed leads only", () => {
    const m = pipelineMetrics([
      { ...base, stage: "convertido", valor_cents: 2990 },
      { ...base, id: "2", stage: "perdido" },
      { ...base, id: "3", stage: "novo" },
    ], now);
    expect(m.conversionRate).toBe(50);
    expect(m.convertedCents).toBe(2990);
  });
});
