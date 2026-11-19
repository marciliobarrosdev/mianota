import { describe, expect, it } from "vitest";
import {
  buildDashboardSnapshot,
  monthBounds,
  nextOccurrence,
  plannerItemsFromRows,
  timeOf,
} from "@/lib/finance/finance-dashboard-rules";

const rows = (data: unknown[]) => ({ data: data as any[] });

describe("painel financeiro (regras puras)", () => {
  const snapshot = buildDashboardSnapshot(
    {
      transactions: rows([
        { id: "1", tipo: "receita", valor_cents: 500000, status: "pago", competencia: "2026-11-05", categoria_id: null },
        { id: "2", tipo: "despesa", valor_cents: 120000, status: "pago", competencia: "2026-11-06", categoria_id: "mercado" },
        { id: "3", tipo: "despesa", valor_cents: 30000, status: "pendente", competencia: "2026-11-20", categoria_id: "luz" },
        { id: "4", tipo: "receita", valor_cents: 10000, status: "atrasado", competencia: "2026-11-21", categoria_id: null },
      ]),
      upcomingRows: rows([]),
      accounts: rows([{ id: "c", nome: "Conta", saldo_cents: 250000 }]),
      categories: rows([{ id: "mercado", nome: "Mercado", cor: "#111" }]),
      budgets: rows([{ id: "b", categoria_id: "mercado", limite_cents: 100000 }]),
      cards: rows([]),
      invoices: rows([]),
      goals: rows([{ id: "g", nome: "Viagem", objetivo_cents: 1000, acumulado_cents: 2500 }]),
    },
    "2026-11-01",
    "2026-11-30",
    "2026-11",
  );

  it("soma entradas e saídas pagas, a receber e a pagar", () => {
    expect(snapshot.totals).toEqual({
      balanceCents: 250000,
      receivedCents: 500000,
      spentCents: 120000,
      netCents: 380000,
      pendingIncomeCents: 10000,
      pendingExpenseCents: 30000,
      projectedCents: 230000, // saldo + a receber − a pagar
      leftoverCents: 360000, // líquido + a receber − a pagar
    });
  });

  it("categoria líder, orçamento estourado e meta limitada a 100%", () => {
    expect(snapshot.categories[0]).toMatchObject({ name: "Mercado", amountCents: 120000, share: 100 });
    expect(snapshot.insight.tone).toBe("attention");
    expect(snapshot.budgets[0]).toMatchObject({ spentCents: 120000, percentage: 120 });
    expect(snapshot.goals[0].percentage).toBe(100);
    expect(snapshot.cashflow).toHaveLength(30);
    expect(snapshot.cashflow[4]).toMatchObject({ date: "2026-11-05", incomeCents: 500000 });
  });

  it("recorrência mensal aparece no período, sem repetir a data já lançada", () => {
    const items = plannerItemsFromRows(
      {
        entries: rows([
          { id: "e1", descricao: "Aluguel", valor_cents: 150000, tipo: "despesa", status: "pago", pago_em: "2026-11-05", competencia: "2026-11-05", recorrencia_id: "r1", vencimento: "2026-11-05", metadata: null },
        ]),
        recurrences: rows([
          { id: "r1", descricao: "Aluguel", valor_cents: 150000, tipo: "despesa", proxima_data: "2026-10-05", frequencia: "mensal", termina_em: null },
        ]),
        categories: rows([]),
      },
      "2026-11-01",
      "2026-12-31",
    );
    expect(items.map((i) => `${i.kind}:${i.date}`)).toEqual(["movimentacao:2026-11-05", "recorrencia:2026-12-05"]);
  });

  it("datas e horas auxiliares", () => {
    expect(nextOccurrence("2026-01-31", "semanal")).toBe("2026-02-07");
    expect(nextOccurrence("2026-02-10", "anual")).toBe("2027-02-10");
    expect(monthBounds(new Date(2026, 1, 15))).toEqual({ key: "2026-02", start: "2026-02-01", end: "2026-02-28" });
    expect(timeOf("2026-11-05T12:00:00Z")).toBeNull(); // sem hora real: não inventa
  });
});
