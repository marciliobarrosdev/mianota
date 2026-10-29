import { describe, expect, it } from "vitest";
import { buildOverviewAlerts, greeting, pctChange, previousPeriod } from "../src/lib/overview-rules";

const money = (c: number) => `R$${(c / 100).toFixed(2)}`;

describe("overview rules", () => {
  it("full month compares to previous full month", () => {
    expect(previousPeriod({ from: "2026-10-01", to: "2026-10-31" })).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });
  it("custom range compares to same-length range before it", () => {
    expect(previousPeriod({ from: "2026-10-11", to: "2026-10-20" })).toEqual({ from: "2026-10-01", to: "2026-10-10" });
  });
  it("percent change", () => {
    expect(pctChange(112, 100)).toBe(12);
    expect(pctChange(50, 0)).toBeNull();
  });
  it("greeting by hour", () => {
    expect(greeting(9)).toBe("Bom dia");
    expect(greeting(14)).toBe("Boa tarde");
    expect(greeting(20)).toBe("Boa noite");
  });
  it("alerts overdue bills and blown budgets, not paid ones", () => {
    const alerts = buildOverviewAlerts({
      today: "2026-10-29",
      money,
      leftoverCents: 100,
      upcoming: [
        { id: "a", description: "Luz", type: "despesa", amountCents: 15000, dueDate: "2026-10-20", status: "pendente" },
        { id: "b", description: "Água", type: "despesa", amountCents: 5000, dueDate: "2026-10-20", status: "pago" },
      ],
      budgets: [{ id: "x", name: "Mercado", limitCents: 50000, spentCents: 60000, percentage: 120 }],
    });
    expect(alerts.map((a) => a.key)).toEqual(["overdue", "budget-x"]);
    expect(alerts[0].title).toContain("R$150.00");
  });
});
