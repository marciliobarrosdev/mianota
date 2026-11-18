import { describe, expect, it } from "vitest";
import { formatTxDayHeader } from "@/lib/finance/transactions-rules";

describe("formatTxDayHeader", () => {
  it("marca o dia de hoje", () => {
    expect(formatTxDayHeader("2026-11-18", "2026-11-18").startsWith("Hoje · ")).toBe(true);
  });
  it("marca ontem, inclusive na virada do mês", () => {
    expect(formatTxDayHeader("2026-10-31", "2026-11-01").startsWith("Ontem · ")).toBe(true);
  });
  it("não prefixa dias mais antigos", () => {
    const h = formatTxDayHeader("2026-11-10", "2026-11-18");
    expect(h.startsWith("Hoje") || h.startsWith("Ontem")).toBe(false);
  });
});
