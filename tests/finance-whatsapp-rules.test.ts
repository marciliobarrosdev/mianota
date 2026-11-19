import { describe, expect, it } from "vitest";
import {
  completeDraft,
  fold,
  isCancelReply,
  isConfirmReply,
  json,
  merge,
  missing,
  normalize,
  pairingCode,
  resolve,
  summaryPeriodStart,
  summaryText,
} from "@/lib/finance/finance-whatsapp-rules";

const context = {
  categories: [{ id: "11111111-1111-1111-1111-111111111111", name: "Mercado", type: "despesa" as const }],
  accounts: [{ id: "22222222-2222-2222-2222-222222222222", name: "Nubank", institution: null }],
};

describe("WhatsApp financeiro (regras puras)", () => {
  it("VINCULAR só aceita exatamente 8 dígitos", () => {
    expect(pairingCode(" vincular 12345678 ")).toBe("12345678");
    expect(pairingCode("VINCULAR 1234567")).toBeNull();
    expect(pairingCode("quero vincular 12345678")).toBeNull();
  });

  it("CONFIRMAR e CANCELAR em respostas curtas", () => {
    expect(isConfirmReply(fold("CONFIRMAR"))).toBe(true);
    expect(isConfirmReply(fold("Pode fazer!"))).toBe(true);
    expect(isConfirmReply(fold("sim, mas muda o valor"))).toBe(false);
    expect(isCancelReply(fold("Não"))).toBe(true);
    expect(isCancelReply(fold("cancela"))).toBe(true);
  });

  it("limpa o JSON da IA e descarta valores inválidos", () => {
    const draft = normalize(json('```json\n{"intent":"record_expense","amountCents":-5,"paymentMethod":"cheque","date":"18/11"}\n```'));
    expect(draft).toMatchObject({ intent: "record_expense", amountCents: null, paymentMethod: null, date: null });
    expect(normalize({ intent: "apagar_tudo" }).intent).toBe("unknown");
  });

  it("gasto sem forma de pagamento: pergunta antes de salvar; data de hoje e tipo despesa", () => {
    const draft = completeDraft(
      resolve(normalize({ intent: "record_expense", summary: "Mercado", amountCents: 5000, categoryName: "mercado" }), context),
      "gastei 50 no mercado",
      null,
      "2026-11-18",
    );
    expect(draft).toMatchObject({ date: "2026-11-18", type: "despesa", categoryName: "Mercado", missing: ["payment"] });
    expect(completeDraft({ ...draft }, "foi no pix", draft, "2026-11-18").missing).toEqual([]);
  });

  it("conta citada que não existe é perguntada; conta existente é ligada", () => {
    expect(missing(resolve(normalize({ intent: "record_expense", summary: "x", amountCents: 1, accountName: "Itaú", paymentMethod: "pix" }), context))).toEqual(["account"]);
    expect(resolve(normalize({ intent: "record_expense", accountName: "nubank" }), context).accountId).toBe(context.accounts[0].id);
  });

  it("mudar de assunto recomeça; responder completa o rascunho", () => {
    const prev = normalize({ intent: "record_expense", summary: "Luz", amountCents: 9000 });
    expect(merge(prev, normalize({ intent: "create_goal", summary: "Viagem" })).intent).toBe("create_goal");
    expect(merge(prev, normalize({ intent: "unknown", paymentMethod: "pix" }))).toMatchObject({ intent: "record_expense", summary: "Luz", paymentMethod: "pix" });
  });

  it("resumo: período e totais (pendentes só de despesas)", () => {
    const now = new Date(2026, 10, 18, 12);
    expect(summaryPeriodStart("month", now)).toBe("2026-11-01");
    expect(summaryPeriodStart(null, now)).toBe("2026-11-01");
    expect(summaryPeriodStart("all", now)).toBeNull();
    expect(
      summaryText([
        { tipo: "receita", status: "pago", valor_cents: 50000 },
        { tipo: "despesa", status: "pago", valor_cents: 20000 },
        { tipo: "despesa", status: "atrasado", valor_cents: 1000 },
        { tipo: "receita", status: "pendente", valor_cents: 99999 },
      ]).replace(/\u00a0/g, " "),
    ).toBe("No período, entraram R$ 500,00, saíram R$ 200,00 e há R$ 10,00 para pagar. Resultado: R$ 300,00.");
  });
});
