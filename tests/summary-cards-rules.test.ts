import { describe, expect, it } from "vitest";
import { computeSummaryCards, plusOneMonth, type SummaryEntry } from "@/lib/finance/summary-cards-rules";

const today = "2026-11-03";
const paid = (type: string, amountCents: number, paidDate: string): SummaryEntry => ({ type, status: "pago", amountCents, paidDate });
const open = (type: string, amountCents: number, dueDate: string): SummaryEntry => ({ type, status: "pendente", amountCents, dueDate });

describe("summary cards", () => {
  it("saldo do mês = sobra do mês anterior + entrou − saiu (mês até hoje)", () => {
    const c = computeSummaryCards([
      paid("receita", 50000, "2026-10-05"), paid("despesa", 40000, "2026-10-20"), // sobra R$ 100
      paid("receita", 320000, "2026-11-01"), paid("despesa", 52044, "2026-11-02"),
    ], today);
    expect(c.previousCarryCents).toBe(10000);
    expect(c.receivedMtdCents).toBe(320000);
    expect(c.spentMtdCents).toBe(52044);
    expect(c.monthBalanceCents).toBe(277956);
  });

  it("entrou/saiu ignoram datas futuras do mês e pendentes", () => {
    const c = computeSummaryCards([paid("receita", 1000, "2026-11-10"), open("despesa", 500, "2026-11-01")], today);
    expect(c.receivedMtdCents).toBe(0);
    expect(c.spentMtdCents).toBe(0);
  });

  it("saldo dos últimos 30 dias inclui hoje e exclui o 31º dia", () => {
    const c = computeSummaryCards([paid("receita", 1000, "2026-10-05"), paid("receita", 2000, "2026-10-04"), paid("despesa", 300, today)], today);
    expect(c.last30BalanceCents).toBe(700);
  });

  it("conta vencida ontem vai para Atrasadas e não para A pagar", () => {
    const c = computeSummaryCards([open("despesa", 3000, "2026-11-02")], today);
    expect(c.overdueOpenCents).toBe(3000);
    expect(c.toPayCents).toBe(0);
  });

  it("A pagar/A receber contam de hoje até 1 mês à frente", () => {
    const c = computeSummaryCards([
      open("despesa", 100, today), open("despesa", 200, "2026-12-03"), open("despesa", 999, "2026-12-13"),
      open("receita", 400, "2026-11-20"), paid("receita", 999, "2026-11-20"),
    ], today);
    expect(c.toPayCents).toBe(300);
    expect(c.toReceiveCents).toBe(400);
  });

  it("um mês à frente respeita fim de mês", () => {
    expect(plusOneMonth("2026-01-31")).toBe("2026-02-28");
  });
});
