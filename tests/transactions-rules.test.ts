import { describe, expect, it } from "vitest";
import { EMPTY_TX_FILTERS, filterTx, groupTxByDay, learnCategoryRule, sortTx, txStatus, txToCsv, txTotals, type TxLike } from "@/lib/finance/transactions-rules";

const tx = (p: Partial<TxLike>): TxLike => ({
  id: Math.random().toString(), date: "2026-10-10", type: "despesa", description: "x", merchant: null, category: null,
  amountCents: 1000, paymentMethod: null, source: "manual", hasAttachment: false, status: "pago", dueDate: null, ...p,
});
const today = "2026-10-29";

describe("transactions rules", () => {
  it("pending bill with past due date is vencido", () => {
    expect(txStatus({ status: "pendente", dueDate: "2026-10-26", date: "2026-10-26" }, today)).toBe("vencido");
    expect(txStatus({ status: "pendente", dueDate: "2026-10-30", date: "2026-10-30" }, today)).toBe("pendente");
  });
  it("filters by status and source", () => {
    const items = [tx({ status: "pendente", dueDate: "2026-10-01" }), tx({ source: "whatsapp" }), tx({ hasAttachment: true, source: "whatsapp" })];
    expect(filterTx(items, { ...EMPTY_TX_FILTERS, status: "vencido" }, today)).toHaveLength(1);
    expect(filterTx(items, { ...EMPTY_TX_FILTERS, source: "whatsapp" }, today)).toHaveLength(1);
    expect(filterTx(items, { ...EMPTY_TX_FILTERS, source: "foto" }, today)).toHaveLength(1);
  });
  it("totals: balance = income - expense, pending counts unpaid", () => {
    const t = txTotals([tx({ type: "receita", amountCents: 320000 }), tx({ amountCents: 52044 }), tx({ amountCents: 5000, status: "pendente" })]);
    expect(t.balanceCents).toBe(320000 - 52044 - 5000);
    expect(t.pendingCents).toBe(5000);
    expect(t.pendingCount).toBe(1);
  });
  it("sorts by amount and groups by day with net", () => {
    const items = [tx({ amountCents: 100 }), tx({ amountCents: 900 }), tx({ date: "2026-10-11", type: "receita", amountCents: 500 })];
    expect(sortTx(items, "amount_desc")[0].amountCents).toBe(900);
    const g = groupTxByDay(sortTx(items, "date_desc"));
    expect(g[0]).toMatchObject({ date: "2026-10-11", netCents: 500 });
    expect(g[1].netCents).toBe(-1000);
  });
  it("csv uses semicolon and Brazilian decimal", () => {
    expect(txToCsv([tx({ description: "Mercado; bairro", amountCents: 8490 })], today)).toContain('"Mercado; bairro"');
    expect(txToCsv([tx({ amountCents: 8490 })], today)).toContain("10/10/2026;Saída");
    expect(txToCsv([tx({ amountCents: 8490 })], today)).toContain("-84,90");
  });
  it("learning a category replaces the same merchant keyword", () => {
    const r = learnCategoryRule([{ keyword: "padaria", categoryId: "a" }], "Padaria", "b");
    expect(r).toEqual([{ keyword: "padaria", categoryId: "b" }]);
    expect(learnCategoryRule([], "ab", "x")).toEqual([]);
  });
});
