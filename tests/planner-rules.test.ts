import { describe, expect, it } from "vitest";
import { dailyProjection, filterPlannerItems, plannerTotals, toIcs } from "@/lib/finance/planner-rules";

const base = { time: null, kind: "conta" as const, recurring: false, category: null, paymentMethod: null, source: null, note: null };
const items = [
  { ...base, id: "1", date: "2026-10-01", title: "Salário", amountCents: 300000, type: "receita" as const, status: "pago" },
  { ...base, id: "2", date: "2026-10-05", title: "Aluguel", amountCents: 150000, type: "despesa" as const, status: "pendente" },
  { ...base, id: "3", date: "2026-10-20", title: "Cartão", amountCents: 200000, type: "despesa" as const, status: "pendente" },
];

describe("planner rules", () => {
  it("projeta saldo do fim do mês com realizado e pendente", () => {
    const t = plannerTotals(items, "2026-10-10");
    expect(t.toPayCents).toBe(350000);
    expect(t.overdueCount).toBe(1);
    expect(t.projectedCents).toBe(-50000);
  });
  it("aponta o primeiro dia de saldo negativo", () => {
    expect(dailyProjection(items).find((p) => p.balanceCents < 0)?.date).toBe("2026-10-20");
  });
  it("filtra vencidos", () => {
    expect(filterPlannerItems(items, "vencido", "2026-10-10").map((i) => i.id)).toEqual(["2"]);
  });
  it("exporta só contas pendentes no .ics", () => {
    const ics = toIcs(items);
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261005");
  });
});

import { canMoveItem, isValidReportRange, reportPeriod, shiftDate, weekDays } from "@/lib/finance/planner-rules";

describe("planejamento fase 2", () => {
  it("adiar 7 dias atravessa o mês", () => expect(shiftDate("2026-10-29", 7)).toBe("2026-11-05"));
  it("semana vai de domingo a sábado", () => {
    expect(weekDays("2026-10-29")).toEqual(["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]);
  });
  it("conta paga não pode ser arrastada", () => {
    expect(canMoveItem({ status: "pago", date: "2026-10-10" }, "2026-10-12")).toBe(false);
    expect(canMoveItem({ status: "pendente", date: "2026-10-10" }, "2026-10-10")).toBe(false);
    expect(canMoveItem({ status: "pendente", date: "2026-10-10" }, "2026-10-12")).toBe(true);
  });
  it("quinzena: 1–15 e 16–fim do mês", () => {
    expect(reportPeriod("quinzena", "2026-10-03")).toMatchObject({ from: "2026-10-01", to: "2026-10-15" });
    expect(reportPeriod("quinzena", "2026-02-20")).toMatchObject({ from: "2026-02-16", to: "2026-02-28" });
  });
  it("mês e dia", () => {
    expect(reportPeriod("mes", "2026-10-29")).toMatchObject({ from: "2026-10-01", to: "2026-10-31" });
    expect(reportPeriod("dia", "2026-10-29")).toMatchObject({ from: "2026-10-29", to: "2026-10-29", label: "29/10/2026" });
  });
  it("período personalizado: máximo de 366 dias", () => {
    expect(isValidReportRange("2026-01-01", "2026-12-31")).toBe(true);
    expect(isValidReportRange("2025-01-01", "2026-12-31")).toBe(false);
    expect(isValidReportRange("2026-02-30", "2026-03-01")).toBe(false);
  });
});
