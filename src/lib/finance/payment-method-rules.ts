/** Formas de pagamento aceitas em toda entrada/saída (ordem exibida ao usuário). */
export const PAYMENT_METHODS = ["pix", "cartao", "dinheiro", "transferencia", "boleto", "salario", "outro"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_OPTION_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  cartao: "Cartão de Crédito",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  boleto: "Boleto",
  salario: "Salário",
  outro: "Outro",
};

export const PAYMENT_REQUIRED_MESSAGE = "Informe a forma de pagamento.";

export const PAYMENT_QUESTION =
  "Como foi pago? PIX, Cartão de Crédito, Dinheiro, Transferência, Boleto, Salário ou Outro?";

export const PAYMENT_QUESTION_WHATSAPP =
  "Qual foi a forma de pagamento? Responda com o número ou o nome:\n1. PIX\n2. Cartão de Crédito\n3. Dinheiro\n4. Transferência\n5. Boleto\n6. Salário\n7. Outro";

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function paymentMethodLabel(value: string | null | undefined) {
  return value && isPaymentMethod(value) ? PAYMENT_METHOD_OPTION_LABELS[value] : "Não informado";
}

/** Transações que movimentam dinheiro e exigem forma de pagamento. */
export function intentNeedsPayment(intent: string) {
  return ["record_expense", "record_income", "create_bill", "create_recurring"].includes(intent);
}

/** Lança erro se a forma estiver ausente/inválida. */
export function requirePaymentMethod(value: unknown): PaymentMethod {
  if (!isPaymentMethod(value)) throw new Error(PAYMENT_REQUIRED_MESSAGE);
  return value;
}

const strip = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Reconhece a forma de pagamento em texto livre. `allowNumber` aceita "1".."7"
 * (somente quando a MIA acabou de perguntar).
 */
export function parsePaymentMethod(text: string | null | undefined, opts: { allowNumber?: boolean } = {}): PaymentMethod | null {
  const t = strip(String(text || "")).trim();
  if (!t) return null;
  if (opts.allowNumber) {
    const n = t.match(/^\s*([1-7])\s*\.?\s*$/);
    if (n) return PAYMENT_METHODS[Number(n[1]) - 1];
  }
  if (/\bpix\b/.test(t)) return "pix";
  if (/\b(cartao|credito|cc)\b/.test(t)) return "cartao";
  if (/\b(dinheiro|especie|cash)\b/.test(t)) return "dinheiro";
  if (/\b(transferencia|transferi|ted|doc)\b/.test(t)) return "transferencia";
  if (/\bboleto\b/.test(t)) return "boleto";
  if (/\b(salario|holerite|contracheque)\b/.test(t)) return "salario";
  if (/^\s*outr[oa]s?\s*$/.test(t) || /\boutra forma\b/.test(t)) return "outro";
  return null;
}
