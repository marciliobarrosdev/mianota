import { describe, expect, it } from "vitest";
import { expensesByCategory, filterTx, EMPTY_TX_FILTERS, groupTxByDay, normalizeTags, validateSplits, type TxLike } from "@/lib/finance/transactions-rules";
import { markDuplicates, parseCsv, parseOfx, parseStatementAmount, parseStatementDate } from "@/lib/finance/bank-statement-rules";
import { summarizeMonth } from "@/lib/finance/monthly-report-rules";

const tx = (p: Partial<TxLike>): TxLike => ({ id: Math.random().toString(), date: "2026-10-29", type: "despesa", description: "x", merchant: null, category: "Alimentação", amountCents: 0, paymentMethod: null, source: "manual", hasAttachment: false, status: "pago", dueDate: null, ...p });

describe("saldo por dia", () => {
  it("resultado do dia só conta o dia; saldo até aqui acumula o período (caso 29/10)", () => {
    const items = [
      tx({ date: "2026-10-29", type: "receita", amountCents: 320000 }),
      tx({ date: "2026-10-29", amountCents: 17690 }),
      tx({ date: "2026-10-20", amountCents: 34354 }),
    ];
    const g = groupTxByDay(items);
    const today = g.find((x) => x.date === "2026-10-29")!;
    expect(today.netCents).toBe(302310);
    expect(today.runningCents).toBe(267956);
    expect(g.find((x) => x.date === "2026-10-20")!.runningCents).toBe(-34354);
  });
});

describe("divisão", () => {
  it("exige soma igual ao total", () => {
    expect(validateSplits(8490, [{ amountCents: 6000 }, { amountCents: 2490 }])).toBeNull();
    expect(validateSplits(8490, [{ amountCents: 6000 }, { amountCents: 2000 }])).not.toBeNull();
    expect(validateSplits(8490, [{ amountCents: 8490 }])).not.toBeNull();
  });
  it("conta cada parte na sua categoria (gráfico, filtro e relatório)", () => {
    const i = tx({ amountCents: 8490, category: "Alimentação", splits: [{ categoryId: "a", category: "Alimentação", amountCents: 6000 }, { categoryId: "b", category: "Limpeza", amountCents: 2490 }] });
    expect(expensesByCategory([i])).toEqual([{ name: "Alimentação", cents: 6000 }, { name: "Limpeza", cents: 2490 }]);
    expect(filterTx([i], { ...EMPTY_TX_FILTERS, category: "Limpeza" }, "2026-10-29")).toHaveLength(1);
    const s = summarizeMonth([{ tipo: "despesa", status: "pago", valor_cents: 8490, categoria: "Alimentação", splits: [{ categoria: "Alimentação", valor_cents: 6000 }, { categoria: "Limpeza", valor_cents: 2490 }] }]);
    expect(s.categories.map((c) => c.cents)).toEqual([6000, 2490]);
  });
});

describe("tags", () => {
  it("normaliza e filtra", () => {
    expect(normalizeTags(["#Viagem", "viagem", " trabalho "])).toEqual(["viagem", "trabalho"]);
    const i = tx({ tags: ["viagem"] });
    expect(filterTx([i, tx({})], { ...EMPTY_TX_FILTERS, tag: "viagem" }, "2026-10-29")).toHaveLength(1);
  });
});

describe("extrato", () => {
  it("lê datas e valores brasileiros", () => {
    expect(parseStatementDate("29/10/2026")).toBe("2026-10-29");
    expect(parseStatementDate("20261029120000[-3:BRT]")).toBe("2026-10-29");
    expect(parseStatementAmount("R$ -1.234,56")).toBe(-123456);
    expect(parseStatementAmount("1,234.56")).toBe(123456);
  });
  it("lê OFX", () => {
    const r = parseOfx("<OFX><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261029<TRNAMT>-84.90<FITID>abc<MEMO>Mercado</STMTTRN><STMTTRN><DTPOSTED>20261029<TRNAMT>3200.00<FITID>def<MEMO>Salário</STMTTRN>");
    expect(r).toEqual([
      { date: "2026-10-29", description: "Mercado", amountCents: 8490, type: "despesa", fitid: "abc" },
      { date: "2026-10-29", description: "Salário", amountCents: 320000, type: "receita", fitid: "def" },
    ]);
  });
  it("lê CSV estilo Nubank e marca repetidos", () => {
    const r = parseCsv("Data,Valor,Identificador,Descrição\n29/10/2026,-12.00,x1,Coca-Cola\n29/10/2026,-12.00,x2,Coca-Cola");
    expect(r).toHaveLength(2);
    const m = markDuplicates(r, [{ date: "2026-10-29", amountCents: 1200, type: "despesa", description: "Coca Cola" }]);
    expect(m.map((x) => x.duplicate)).toEqual([true, true]);
  });
});
