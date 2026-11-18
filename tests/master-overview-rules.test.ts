import { describe, expect, it } from "vitest";
import { conversionPercent, localDate, presetLabel, PRESETS } from "@/lib/master/overview-rules";

describe("Visão geral do Master", () => {
  it("atalhos de período são 7, 30, 90 dias e 1 ano", () => {
    expect([...PRESETS]).toEqual([7, 30, 90, 365]);
    expect(PRESETS.map(presetLabel)).toEqual(["7d", "30d", "90d", "1 ano"]);
  });
  it("30 dias começam 29 dias antes de hoje", () => {
    const now = new Date(2026, 10, 18, 22, 0);
    expect(localDate(0, now)).toBe("2026-11-18");
    expect(localDate(29, now)).toBe("2026-10-20");
  });
  it("conversão arredonda ativas sobre o total e é 0 sem base", () => {
    expect(conversionPercent({ total: 3, ativas: 2 })).toBe(67);
    expect(conversionPercent({ total: 0, ativas: 0 })).toBe(0);
    expect(conversionPercent(null)).toBe(0);
  });
});
