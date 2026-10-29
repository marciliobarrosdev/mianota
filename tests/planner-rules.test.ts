import { describe, expect, it } from "vitest";
import { dailyProjection, filterPlannerItems, plannerTotals, toIcs } from "../src/lib/planner-rules";

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
