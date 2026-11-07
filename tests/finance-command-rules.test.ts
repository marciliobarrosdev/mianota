import { describe, expect, it } from "vitest";
import {
  applyDraftDefaults,
  buildFinanceCommandSystemPrompt,
  commandsToChatHistory,
  mergeDraft,
  normalizeDraft,
  previewFor,
  requiredFields,
  resolveEntities,
} from "@/lib/finance/finance-command-rules";

const context = {
  categories: [
    { id: "11111111-1111-1111-1111-111111111111", name: "Mercado", type: "despesa" as const },
    { id: "22222222-2222-2222-2222-222222222222", name: "Salário", type: "receita" as const },
  ],
  accounts: [{ id: "33333333-3333-3333-3333-333333333333", name: "Nubank", institution: null }],
};

describe("comandos financeiros da MIA", () => {
  it("descarta intent, valores e ids inválidos vindos da IA", () => {
    const draft = normalizeDraft({
      intent: "hackear",
      amountCents: -5,
      categoryId: "x",
      date: "10/11/2026",
    });
    expect(draft.intent).toBe("unknown");
    expect(draft.amountCents).toBeNull();
    expect(draft.categoryId).toBeNull();
    expect(draft.date).toBeNull();
  });

  it("resposta curta completa o rascunho anterior sem trocar o intent", () => {
    const previous = normalizeDraft({ intent: "record_expense", summary: "mercado" });
    const merged = mergeDraft(previous, normalizeDraft({ intent: "unknown", amountCents: 3590 }));
    expect(merged.intent).toBe("record_expense");
    expect(merged.summary).toBe("mercado");
    expect(merged.amountCents).toBe(3590);
  });

  it("liga categoria e conta só quando há uma correspondência única", () => {
    const draft = resolveEntities(
      normalizeDraft({ intent: "record_expense", categoryName: "mercado", accountName: "nubank" }),
      context,
    );
    expect(draft.categoryId).toBe(context.categories[0].id);
    expect(draft.accountId).toBe(context.accounts[0].id);
  });

  it("gasto sem forma de pagamento pergunta o pagamento antes de salvar", () => {
    const draft = normalizeDraft({
      intent: "record_expense",
      summary: "mercado",
      amountCents: 3590,
    });
    expect(requiredFields(draft)).toEqual(["payment"]);
  });

  it("conta citada que não existe obriga a perguntar a conta", () => {
    const draft = normalizeDraft({
      intent: "record_expense",
      summary: "x",
      amountCents: 100,
      paymentMethod: "pix",
      accountName: "Itaú",
    });
    expect(requiredFields(resolveEntities(draft, context))).toEqual(["account"]);
  });

  it("aplica padrões: data de hoje, tipo despesa e conta a pagar pendente", () => {
    const expense = applyDraftDefaults(
      normalizeDraft({ intent: "record_expense", summary: "a", amountCents: 1 }),
      "paguei no pix",
      null,
      "2026-11-07",
    );
    expect(expense.date).toBe("2026-11-07");
    expect(expense.type).toBe("despesa");
    expect(expense.paymentMethod).toBe("pix");
    expect(expense.missing).toEqual([]);
    const bill = applyDraftDefaults(
      normalizeDraft({ intent: "create_bill", summary: "luz", amountCents: 1, date: "2026-11-10" }),
      "luz",
      null,
      "2026-11-07",
    );
    expect(bill.paymentStatus).toBe("pending");
  });

  it("prévia mostra valor em reais", () => {
    const rows = previewFor(normalizeDraft({ intent: "record_expense", amountCents: 3590 }));
    expect(rows.find((r) => r.label === "Valor")?.value.replace(/\s/g, " ")).toBe("R$ 35,90");
  });

  it("prompt da IA proíbe inventar dados e usa a data de São Paulo", () => {
    const prompt = buildFinanceCommandSystemPrompt("2026-11-07");
    expect(prompt).toContain("Nunca invente valor");
    expect(prompt).toContain("Hoje é 2026-11-07");
  });

  it("histórico fica em ordem cronológica e não repete o resultado", () => {
    const history = commandsToChatHistory([
      {
        id: "b",
        status: "cancelled",
        messages: [{ role: "user", content: "oi" }],
        created_at: "2026-11-07T10:00:00Z",
      },
      {
        id: "a",
        status: "executed",
        result: { message: "Despesa registrada." },
        messages: [
          { role: "user", content: "gastei 10" },
          { role: "assistant", content: "Confira" },
        ],
        created_at: "2026-11-07T09:00:00Z",
      },
    ]);
    expect(history.map((m) => m.text)).toEqual([
      "gastei 10",
      "Confira",
      "Despesa registrada.",
      "oi",
      "Pedido cancelado.",
    ]);
  });
});
