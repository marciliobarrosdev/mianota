/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Regras puras do WhatsApp financeiro da MIA: limpeza do JSON devolvido pela IA,
 * junção com o rascunho anterior, ligação com categorias/contas reais, o que
 * ainda falta perguntar, a prévia "Confira antes de eu registrar" e as respostas
 * curtas (CONFIRMAR / CANCELAR / VINCULAR). Não acessa banco nem IA.
 */
import {
  intentNeedsPayment,
  isPaymentMethod,
  parsePaymentMethod,
  PAYMENT_QUESTION_WHATSAPP,
  paymentMethodLabel,
} from "@/lib/finance/payment-method-rules";

export type FinanceIntent =
  | "record_expense"
  | "record_income"
  | "create_bill"
  | "create_budget"
  | "create_goal"
  | "create_recurring"
  | "query_summary"
  | "unknown";

export type Draft = {
  intent: FinanceIntent;
  type?: "receita" | "despesa" | null;
  summary?: string | null;
  amountCents?: number | null;
  categoryId?: string | null;
  categoryName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  paymentMethod?:
    | "pix"
    | "cartao"
    | "dinheiro"
    | "transferencia"
    | "boleto"
    | "salario"
    | "outro"
    | null;
  paymentStatus?: "paid" | "pending" | null;
  date?: string | null;
  frequency?: "semanal" | "quinzenal" | "mensal" | "anual" | null;
  targetCents?: number | null;
  deadline?: string | null;
  queryPeriod?: "today" | "week" | "month" | "all" | null;
  missing?: string[];
};

export type FinanceContext = {
  categories: Array<{ id: string; name: string; type: "receita" | "despesa" }>;
  accounts: Array<{ id: string; name: string; institution: string | null }>;
};

export const INTENTS = new Set<FinanceIntent>([
  "record_expense",
  "record_income",
  "create_bill",
  "create_budget",
  "create_goal",
  "create_recurring",
  "query_summary",
  "unknown",
]);

export function text(value: unknown, max = 500) {
  const cleaned = typeof value === "string" ? value.trim().slice(0, max) : "";
  return cleaned || null;
}

export function uuid(value: unknown) {
  const cleaned = text(value, 36);
  return cleaned && /^[0-9a-f-]{36}$/i.test(cleaned) ? cleaned : null;
}

export function cents(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 999_999_999_00 ? parsed : null;
}

export function json(raw: string) {
  const cleaned = String(raw || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const object = cleaned.match(/\{[\s\S]*\}/)?.[0];
    if (!object) throw new Error("A IA não conseguiu estruturar a informação.");
    return JSON.parse(object);
  }
}

export function normalize(value: unknown): Draft {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const intent = text(raw.intent, 30) as FinanceIntent | null;
  const type = text(raw.type, 12);
  const method = text(raw.paymentMethod, 20);
  const status = text(raw.paymentStatus, 12);
  const frequency = text(raw.frequency, 16);
  const period = text(raw.queryPeriod, 12);
  return {
    intent: intent && INTENTS.has(intent) ? intent : "unknown",
    type: type === "receita" || type === "despesa" ? type : null,
    summary: text(raw.summary, 240),
    amountCents: cents(raw.amountCents),
    categoryId: uuid(raw.categoryId),
    categoryName: text(raw.categoryName, 120),
    accountId: uuid(raw.accountId),
    accountName: text(raw.accountName, 120),
    paymentMethod: method && isPaymentMethod(method) ? (method as Draft["paymentMethod"]) : null,
    paymentStatus: status === "paid" || status === "pending" ? status : null,
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || "")) ? String(raw.date) : null,
    frequency:
      frequency && ["semanal", "quinzenal", "mensal", "anual"].includes(frequency)
        ? (frequency as Draft["frequency"])
        : null,
    targetCents: cents(raw.targetCents),
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.deadline || "")) ? String(raw.deadline) : null,
    queryPeriod:
      period && ["today", "week", "month", "all"].includes(period)
        ? (period as Draft["queryPeriod"])
        : null,
    missing: [],
  };
}

export function fold(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Junta a nova leitura com o rascunho em andamento. Se a pessoa mudou de assunto
 * (outra intenção conhecida), começa do zero; senão só preenche campos vazios.
 */
export function merge(previous: Draft | null, next: Draft) {
  if (
    !previous ||
    previous.intent === "unknown" ||
    (next.intent !== "unknown" && next.intent !== previous.intent)
  )
    return next;
  return normalize({
    ...previous,
    ...Object.fromEntries(
      Object.entries(next).filter(([, value]) => value != null && value !== ""),
    ),
    intent: previous.intent,
  });
}

export function resolve(draft: Draft, context: FinanceContext) {
  const next = { ...draft };
  if (!next.categoryId && next.categoryName) {
    const wanted = fold(next.categoryName);
    const type = next.intent === "record_income" ? "receita" : "despesa";
    const matches = context.categories.filter(
      (row) => row.type === type && (fold(row.name) === wanted || fold(row.name).includes(wanted)),
    );
    if (matches.length === 1) {
      next.categoryId = matches[0].id;
      next.categoryName = matches[0].name;
    }
  }
  if (!next.accountId && next.accountName) {
    const wanted = fold(next.accountName);
    const matches = context.accounts.filter(
      (row) => fold(row.name) === wanted || fold(row.name).includes(wanted),
    );
    if (matches.length === 1) {
      next.accountId = matches[0].id;
      next.accountName = matches[0].name;
    }
  }
  return next;
}

export function missing(draft: Draft) {
  const base = missingBase(draft);
  if (intentNeedsPayment(draft.intent) && !isPaymentMethod(draft.paymentMethod))
    base.push("payment");
  return base;
}

export function missingBase(draft: Draft): string[] {
  if (draft.intent === "unknown") return ["intent"];
  if (draft.intent === "query_summary") return [];
  if (draft.intent === "create_budget")
    return [
      !draft.categoryName && !draft.categoryId ? "category" : "",
      !draft.amountCents ? "amount" : "",
    ].filter(Boolean);
  if (draft.intent === "create_goal")
    return [!draft.summary ? "summary" : "", !draft.targetCents ? "target" : ""].filter(Boolean);
  if (draft.intent === "create_recurring")
    return [
      !draft.type ? "type" : "",
      !draft.summary ? "summary" : "",
      !draft.amountCents ? "amount" : "",
      !draft.frequency ? "frequency" : "",
      !draft.date ? "date" : "",
      draft.accountName && !draft.accountId ? "account" : "",
    ].filter(Boolean);
  if (draft.intent === "create_bill")
    return [
      !draft.summary ? "summary" : "",
      !draft.amountCents ? "amount" : "",
      !draft.date ? "date" : "",
      draft.accountName && !draft.accountId ? "account" : "",
    ].filter(Boolean);
  return [
    !draft.summary ? "summary" : "",
    !draft.amountCents ? "amount" : "",
    draft.accountName && !draft.accountId ? "account" : "",
  ].filter(Boolean);
}

export function question(field: string, context: FinanceContext) {
  if (field === "payment") return PAYMENT_QUESTION_WHATSAPP;
  if (field === "intent")
    return "O que você quer fazer: registrar um gasto, uma receita, criar um orçamento ou uma meta?";
  if (field === "summary")
    return "Qual é a descrição? Pode responder do seu jeito, como mercado, aluguel ou salário.";
  if (field === "amount") return "Qual é o valor?";
  if (field === "date")
    return "Quando vence? Pode responder amanhã, dia 10 ou com a data completa.";
  if (field === "target") return "Quanto você quer juntar nessa meta?";
  if (field === "type") return "Isso é uma receita ou uma despesa recorrente?";
  if (field === "frequency")
    return "Isso se repete toda semana, a cada 15 dias, todo mês ou todo ano?";
  if (field === "category")
    return `Para qual categoria? ${context.categories
      .filter((row) => row.type === "despesa")
      .slice(0, 6)
      .map((row) => row.name)
      .join(", ")}.`;
  if (field === "account")
    return `Não encontrei essa conta no seu cadastro. Em qual conta devo registrar? ${context.accounts
      .slice(0, 6)
      .map((row) => row.name)
      .join(", ")}.`;
  return "O que ficou faltando nessa informação?";
}

export const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value || 0) / 100,
  );

export function preview(draft: Draft) {
  const lines = [
    draft.summary ? `Descrição: ${draft.summary}` : "",
    draft.amountCents != null ? `Valor: ${money(draft.amountCents)}` : "",
    draft.intent === "create_goal" && draft.targetCents != null
      ? `Objetivo: ${money(draft.targetCents)}`
      : "",
    draft.categoryName ? `Categoria: ${draft.categoryName}` : "",
    draft.accountName ? `Conta: ${draft.accountName}` : "",
    draft.paymentMethod ? `Pagamento: ${paymentMethodLabel(draft.paymentMethod)}` : "",
    draft.frequency ? `Frequência: ${draft.frequency}` : "",
    draft.date ? `Data: ${new Date(`${draft.date}T12:00:00`).toLocaleDateString("pt-BR")}` : "",
  ].filter(Boolean);
  return lines.map((line) => `• ${line}`).join("\n");
}

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo. */
export const todaySaoPaulo = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

/** "VINCULAR 12345678" → código de 8 dígitos; qualquer outra mensagem → null. */
export function pairingCode(message: string): string | null {
  const match = message
    .trim()
    .toUpperCase()
    .match(/^VINCULAR\s+([0-9]{8})$/);
  return match ? match[1] : null;
}

/** Respostas curtas que cancelam o pedido em andamento (já em `fold`). */
export const isCancelReply = (folded: string) => /^(cancelar|cancela|nao|não)$/.test(folded);

/** Respostas curtas que confirmam um pedido pronto (já em `fold`). */
export const isConfirmReply = (folded: string) =>
  /^(sim|confirmar|confirma|pode fazer|execute|executar)$/.test(folded);

/**
 * Completa o rascunho com o que dá para deduzir sem inventar: forma de pagamento
 * citada na mensagem (o número da lista só vale quando a MIA acabou de perguntar),
 * data de hoje para gasto/receita, tipo pela intenção e conta a pagar pendente.
 * Depois recalcula o que ainda falta perguntar.
 */
export function completeDraft(
  draft: Draft,
  message: string,
  previous: Draft | null,
  today: string,
): Draft {
  if (!isPaymentMethod(draft.paymentMethod))
    draft.paymentMethod = parsePaymentMethod(message, {
      allowNumber: previous?.missing?.[0] === "payment",
    }) as any;
  if (!draft.date && ["record_expense", "record_income"].includes(draft.intent)) draft.date = today;
  if (!draft.type && draft.intent === "record_expense") draft.type = "despesa";
  if (!draft.type && draft.intent === "record_income") draft.type = "receita";
  if (!draft.paymentStatus && draft.intent === "create_bill") draft.paymentStatus = "pending";
  draft.missing = missing(draft);
  return draft;
}

/**
 * Início do período pedido no resumo: hoje, últimos 7 dias, tudo (null) ou,
 * por padrão, o mês atual.
 */
export function summaryPeriodStart(period: Draft["queryPeriod"], now = new Date()): string | null {
  let from: string | null = null;
  if (period === "today")
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  else if (period === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    from = start.toISOString().slice(0, 10);
  } else if (period !== "all")
    from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return from;
}

/** Texto do resumo: entradas e saídas pagas, despesas pendentes/atrasadas e resultado. */
export function summaryText(
  rows: Array<{ tipo: string; status: string; valor_cents: unknown }>,
): string {
  const income = rows
    .filter((row: any) => row.tipo === "receita" && row.status === "pago")
    .reduce((sum: number, row: any) => sum + Number(row.valor_cents), 0);
  const expense = rows
    .filter((row: any) => row.tipo === "despesa" && row.status === "pago")
    .reduce((sum: number, row: any) => sum + Number(row.valor_cents), 0);
  const pending = rows
    .filter((row: any) => row.tipo === "despesa" && ["pendente", "atrasado"].includes(row.status))
    .reduce((sum: number, row: any) => sum + Number(row.valor_cents), 0);
  return `No período, entraram ${money(income)}, saíram ${money(expense)} e há ${money(pending)} para pagar. Resultado: ${money(income - expense)}.`;
}
