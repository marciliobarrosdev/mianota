/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Regras puras dos comandos financeiros da MIA (sem banco, sem IA, sem rede).
 *
 * Fluxo: mensagem → IA devolve JSON → `normalizeDraft` limpa → `mergeDraft` junta com a
 * resposta anterior → `resolveEntities` liga a categorias/contas reais → `requiredFields`
 * decide o que perguntar → `previewFor` monta a confirmação. Nada é salvo sem confirmação.
 * Usado pelo chat do app (`finance-command.functions.ts`); testado em tests/finance-command-rules.test.ts.
 */
import {
  intentNeedsPayment,
  isPaymentMethod,
  parsePaymentMethod,
  PAYMENT_QUESTION,
  PAYMENT_METHOD_OPTION_LABELS,
} from "@/lib/finance/payment-method-rules";

export type FinanceCommandIntent =
  | "record_expense"
  | "record_income"
  | "create_bill"
  | "create_budget"
  | "create_goal"
  | "create_recurring"
  | "query_summary"
  | "unknown";

export type FinanceType = "receita" | "despesa";
export type PaymentMethod =
  | "pix"
  | "cartao"
  | "dinheiro"
  | "transferencia"
  | "boleto"
  | "salario"
  | "outro";
export type PaymentStatus = "paid" | "pending";

export type FinanceCommandDraft = {
  intent: FinanceCommandIntent;
  type?: FinanceType | null;
  summary?: string | null;
  amountCents?: number | null;
  categoryId?: string | null;
  categoryName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  paymentMethod?: PaymentMethod | null;
  paymentStatus?: PaymentStatus | null;
  date?: string | null;
  frequency?: "semanal" | "quinzenal" | "mensal" | "anual" | null;
  targetCents?: number | null;
  deadline?: string | null;
  queryPeriod?: "today" | "week" | "month" | "all" | null;
  missing?: string[];
};

export type FinanceCommandTurn = {
  commandId: string;
  mode: "question" | "confirm" | "answer";
  message: string;
  quickReplies: string[];
  preview: Array<{ label: string; value: string }>;
  draft: FinanceCommandDraft;
};

export type FinanceContext = {
  categories: Array<{ id: string; name: string; type: FinanceType }>;
  accounts: Array<{ id: string; name: string; institution: string | null }>;
};

const INTENTS = new Set<FinanceCommandIntent>([
  "record_expense",
  "record_income",
  "create_bill",
  "create_budget",
  "create_goal",
  "create_recurring",
  "query_summary",
  "unknown",
]);
const PAYMENT_METHODS = new Set<PaymentMethod>([
  "pix",
  "cartao",
  "dinheiro",
  "transferencia",
  "boleto",
  "salario",
  "outro",
]);

export function cleanString(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, max);
  return cleaned || null;
}

export function cleanUuid(value: unknown): string | null {
  const cleaned = cleanString(value, 36);
  return cleaned && /^[0-9a-f-]{36}$/i.test(cleaned) ? cleaned : null;
}

/** Centavos inteiros entre 0 e R$ 999.999.999,00; qualquer outra coisa vira null (pergunta ao usuário). */
export function cleanCents(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 999_999_999_00 ? parsed : null;
}

/** A IA às vezes cerca o JSON com ```json ou texto; aceita o primeiro objeto encontrado. */
export function extractJson(raw: string): unknown {
  const cleaned = String(raw || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const object = cleaned.match(/\{[\s\S]*\}/)?.[0];
    if (!object) throw new Error("A IA não conseguiu organizar este pedido.");
    return JSON.parse(object);
  }
}

export function normalizeDraft(value: unknown): FinanceCommandDraft {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const intent = cleanString(raw.intent, 30) as FinanceCommandIntent | null;
  const type = cleanString(raw.type, 12);
  const method = cleanString(raw.paymentMethod, 20) as PaymentMethod | null;
  const status = cleanString(raw.paymentStatus, 12);
  const frequency = cleanString(raw.frequency, 16);
  const period = cleanString(raw.queryPeriod, 12);
  return {
    intent: intent && INTENTS.has(intent) ? intent : "unknown",
    type: type === "receita" || type === "despesa" ? type : null,
    summary: cleanString(raw.summary, 240),
    amountCents: cleanCents(raw.amountCents),
    categoryId: cleanUuid(raw.categoryId),
    categoryName: cleanString(raw.categoryName, 120),
    accountId: cleanUuid(raw.accountId),
    accountName: cleanString(raw.accountName, 120),
    paymentMethod: method && PAYMENT_METHODS.has(method) ? method : null,
    paymentStatus: status === "paid" || status === "pending" ? status : null,
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || "")) ? String(raw.date) : null,
    frequency:
      frequency === "semanal" ||
      frequency === "quinzenal" ||
      frequency === "mensal" ||
      frequency === "anual"
        ? frequency
        : null,
    targetCents: cleanCents(raw.targetCents),
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.deadline || "")) ? String(raw.deadline) : null,
    queryPeriod:
      period === "today" || period === "week" || period === "month" || period === "all"
        ? period
        : null,
    missing: [],
  };
}

export function fold(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Junta a resposta nova ao rascunho em andamento. Se a IA trocou de assunto (intent diferente e
 * conhecido), começa do zero; senão, só campos preenchidos sobrescrevem e o intent original é mantido.
 */
export function mergeDraft(previous: FinanceCommandDraft | null, next: FinanceCommandDraft) {
  if (
    !previous ||
    previous.intent === "unknown" ||
    (next.intent !== "unknown" && next.intent !== previous.intent)
  ) {
    return next;
  }
  return normalizeDraft({
    ...previous,
    ...Object.fromEntries(
      Object.entries(next).filter(([, value]) => value != null && value !== ""),
    ),
    intent: previous.intent,
  });
}

/** Liga nomes falados a categorias/contas reais apenas quando há UMA correspondência (evita escolher errado). */
export function resolveEntities(draft: FinanceCommandDraft, context: FinanceContext) {
  const next = { ...draft };
  const wantedCategory = fold(next.categoryName);
  const categoryType = next.intent === "record_income" ? "receita" : "despesa";
  if (!next.categoryId && wantedCategory) {
    const matches = context.categories.filter(
      (row) =>
        row.type === categoryType &&
        (fold(row.name) === wantedCategory || fold(row.name).includes(wantedCategory)),
    );
    if (matches.length === 1) {
      next.categoryId = matches[0].id;
      next.categoryName = matches[0].name;
    }
  }
  const wantedAccount = fold(next.accountName);
  if (!next.accountId && wantedAccount) {
    const matches = context.accounts.filter(
      (row) => fold(row.name) === wantedAccount || fold(row.name).includes(wantedAccount),
    );
    if (matches.length === 1) {
      next.accountId = matches[0].id;
      next.accountName = matches[0].name;
    }
  }
  return next;
}

/** Campos que ainda faltam, na ordem em que a MIA pergunta (um por vez). Forma de pagamento sempre por último. */
export function requiredFields(draft: FinanceCommandDraft): string[] {
  const base = requiredFieldsBase(draft);
  if (intentNeedsPayment(draft.intent) && !isPaymentMethod(draft.paymentMethod))
    base.push("payment");
  return base;
}

export function requiredFieldsBase(draft: FinanceCommandDraft): string[] {
  if (draft.intent === "unknown") return ["intent"];
  if (draft.intent === "query_summary") return [];
  if (draft.intent === "create_budget") {
    return [
      !draft.categoryName && !draft.categoryId ? "category" : "",
      !draft.amountCents ? "amount" : "",
    ].filter(Boolean);
  }
  if (draft.intent === "create_goal") {
    return [!draft.summary ? "summary" : "", !draft.targetCents ? "target" : ""].filter(Boolean);
  }
  if (draft.intent === "create_recurring") {
    return [
      !draft.type ? "type" : "",
      !draft.summary ? "summary" : "",
      !draft.amountCents ? "amount" : "",
      !draft.frequency ? "frequency" : "",
      !draft.date ? "date" : "",
      draft.accountName && !draft.accountId ? "account" : "",
    ].filter(Boolean);
  }
  if (draft.intent === "create_bill") {
    return [
      !draft.summary ? "summary" : "",
      !draft.amountCents ? "amount" : "",
      !draft.date ? "date" : "",
      draft.accountName && !draft.accountId ? "account" : "",
    ].filter(Boolean);
  }
  return [
    !draft.summary ? "summary" : "",
    !draft.amountCents ? "amount" : "",
    draft.accountName && !draft.accountId ? "account" : "",
  ].filter(Boolean);
}

export function questionFor(field: string, context: FinanceContext) {
  if (field === "payment")
    return { message: PAYMENT_QUESTION, quickReplies: Object.values(PAYMENT_METHOD_OPTION_LABELS) };
  if (field === "intent")
    return {
      message:
        "O que você quer fazer: registrar um gasto, uma receita, criar orçamento ou uma meta?",
      quickReplies: ["Registrar gasto", "Registrar receita", "Criar orçamento", "Criar meta"],
    };
  if (field === "summary")
    return {
      message:
        "Qual é a descrição? Pode responder do seu jeito, por exemplo: mercado, aluguel ou salário.",
      quickReplies: [],
    };
  if (field === "amount") return { message: "Qual é o valor?", quickReplies: [] };
  if (field === "date")
    return {
      message: "Quando vence? Pode responder, por exemplo: amanhã, dia 10 ou 25 de novembro.",
      quickReplies: ["Amanhã", "Daqui a 3 dias", "No próximo dia 10"],
    };
  if (field === "target")
    return { message: "Quanto você quer juntar nessa meta?", quickReplies: [] };
  if (field === "type")
    return {
      message: "Isso é uma receita ou uma despesa recorrente?",
      quickReplies: ["Receita", "Despesa"],
    };
  if (field === "frequency")
    return {
      message: "Com que frequência isso se repete?",
      quickReplies: ["Toda semana", "A cada 15 dias", "Todo mês", "Todo ano"],
    };
  if (field === "category") {
    const categories = context.categories
      .filter((row) => row.type === "despesa")
      .slice(0, 6)
      .map((row) => row.name);
    return {
      message: "Para qual categoria você quer definir esse limite?",
      quickReplies: categories,
    };
  }
  if (field === "account") {
    return {
      message: "Não encontrei essa conta no seu cadastro. Em qual conta devo registrar?",
      quickReplies: context.accounts.slice(0, 6).map((row) => row.name),
    };
  }
  return { message: "O que ficou faltando nessa informação?", quickReplies: [] };
}

export const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value || 0) / 100,
  );

export function actionMessage(intent: FinanceCommandIntent) {
  const messages: Record<FinanceCommandIntent, string> = {
    record_expense: "Entendi. Confira a despesa antes de eu registrar.",
    record_income: "Entendi. Confira a receita antes de eu registrar.",
    create_bill: "Entendi. Confira a conta a pagar antes de eu registrar.",
    create_budget: "Vou criar esse limite mensal. Confira antes de confirmar.",
    create_goal: "Vou criar essa meta financeira. Confira antes de confirmar.",
    create_recurring: "Vou programar esse lançamento recorrente. Confira antes de confirmar.",
    query_summary: "Aqui está o seu resumo.",
    unknown: "Ainda não entendi o que você quer fazer.",
  };
  return messages[intent];
}

export function previewFor(draft: FinanceCommandDraft) {
  const rows: Array<{ label: string; value: string }> = [];
  if (draft.summary) rows.push({ label: "Descrição", value: draft.summary });
  if (draft.amountCents != null) rows.push({ label: "Valor", value: money(draft.amountCents) });
  if (draft.intent === "create_goal" && draft.targetCents != null)
    rows.push({ label: "Objetivo", value: money(draft.targetCents) });
  if (draft.categoryName) rows.push({ label: "Categoria", value: draft.categoryName });
  if (draft.accountName) rows.push({ label: "Conta", value: draft.accountName });
  if (draft.paymentMethod)
    rows.push({
      label: "Pagamento",
      value:
        (PAYMENT_METHOD_OPTION_LABELS as Record<string, string>)[draft.paymentMethod] ||
        draft.paymentMethod,
    });
  if (draft.paymentStatus)
    rows.push({ label: "Situação", value: draft.paymentStatus === "paid" ? "Pago" : "Pendente" });
  if (draft.frequency) rows.push({ label: "Frequência", value: draft.frequency });
  if (draft.date)
    rows.push({
      label: "Data",
      value: new Date(`${draft.date}T12:00:00`).toLocaleDateString("pt-BR"),
    });
  return rows;
}

/**
 * Regras de sistema enviadas à IA para transformar a mensagem em UM rascunho.
 * A regra "nunca invente" é inegociável: campos ausentes ficam null e a MIA pergunta.
 * `today` precisa estar no fuso America/Sao_Paulo (YYYY-MM-DD) para "hoje/amanhã" saírem certos.
 */
export function buildFinanceCommandSystemPrompt(today: string) {
  return `Você é o cérebro financeiro da MIA. Transforme a fala, texto ou comprovante do usuário em UMA ação financeira estruturada.

REGRAS INEGOCIÁVEIS:
- Use somente informações realmente ditas. Nunca invente valor, conta, categoria, data, meta ou pagamento.
- Preserve o rascunho anterior quando a mensagem for apenas a resposta da sua última pergunta.
- Valores são inteiros em centavos: R$ 35,90 = 3590.
- Hoje é ${today}, no fuso America/Sao_Paulo. Converta hoje, ontem, amanhã e datas faladas para YYYY-MM-DD.
- "gastei", "paguei", "comprei" significa despesa paga. "recebi", "caiu", "entrou" significa receita paga.
- "conta", "boleto", "vai vencer", "tenho que pagar" ou "me lembre" significa create_bill e pagamento pendente.
- "todo mês/semana/ano" significa create_recurring.
- Se o usuário pedir saldo, resumo, quanto gastou ou quanto entrou, use query_summary e queryPeriod today|week|month|all.
- categoryId e accountId só podem vir do CONTEXTO REAL.
- paymentMethod é obrigatório em gastos, receitas, contas e recorrências: use somente pix, cartao (cartão de crédito), dinheiro, transferencia, boleto, salario ou outro. Preencha apenas se a pessoa disser ou o comprovante mostrar; nunca invente — deixe null para a MIA perguntar.
- accountName só pode receber o nome exato de uma conta do CONTEXTO REAL. Marca de cartão ou banco citada apenas como meio de pagamento não é uma conta cadastrada: nesse caso, use paymentMethod e deixe accountName/accountId nulos.
- Se a pessoa pedir explicitamente uma conta que não existe no CONTEXTO REAL, preserve accountName e mantenha accountId nulo para o sistema perguntar antes de registrar.
- Ao receber imagem ou PDF, leia somente dados legíveis como estabelecimento, total e data. Se houver dúvida, deixe o campo null para perguntar ao usuário.
- Responda SOMENTE JSON válido.

INTENTS: record_expense, record_income, create_bill, create_budget, create_goal, create_recurring, query_summary, unknown.
FORMATO:
{"intent":"...","type":null,"summary":null,"amountCents":null,"categoryId":null,"categoryName":null,"accountId":null,"accountName":null,"paymentMethod":null,"paymentStatus":null,"date":null,"frequency":null,"targetCents":null,"deadline":null,"queryPeriod":null}`;
}

/** Hoje no fuso de São Paulo (YYYY-MM-DD) — usado como data padrão de lançamentos. */
export function todayInSaoPaulo(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/**
 * Completa o rascunho com padrões seguros que não inventam dados:
 * data de hoje para gastos/receitas, tipo pelo intent e "pendente" para contas a pagar.
 * A forma de pagamento só é lida do texto do usuário (nunca adivinhada).
 */
export function applyDraftDefaults(
  draft: FinanceCommandDraft,
  userMessage: string,
  previous: FinanceCommandDraft | null,
  today: string,
) {
  if (!isPaymentMethod(draft.paymentMethod))
    draft.paymentMethod = parsePaymentMethod(userMessage, {
      allowNumber: previous?.missing?.[0] === "payment",
    }) as PaymentMethod | null;
  if (!draft.date && ["record_expense", "record_income"].includes(draft.intent)) draft.date = today;
  if (!draft.type && draft.intent === "record_expense") draft.type = "despesa";
  if (!draft.type && draft.intent === "record_income") draft.type = "receita";
  if (!draft.paymentStatus && draft.intent === "create_bill") draft.paymentStatus = "pending";
  draft.missing = requiredFields(draft);
  return draft as FinanceCommandDraft & { missing: string[] };
}

export type FinanceChatHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
};

type StoredCommandRow = {
  id: string;
  messages?: unknown;
  status?: string | null;
  result?: { message?: unknown } | null;
  created_at: string;
  executed_at?: string | null;
};

/**
 * Converte os pedidos salvos (mais recentes primeiro) em bolhas do chat em ordem cronológica.
 * O resultado final é adicionado só se ainda não for a última fala, evitando mensagem duplicada.
 */
export function commandsToChatHistory(
  rowsNewestFirst: StoredCommandRow[],
): FinanceChatHistoryMessage[] {
  const out: FinanceChatHistoryMessage[] = [];
  for (const row of [...rowsNewestFirst].reverse()) {
    const list = Array.isArray(row.messages) ? row.messages : [];
    list.forEach((entry: any, index: number) => {
      const text = typeof entry?.content === "string" ? entry.content.trim() : "";
      if (!text || (entry.role !== "user" && entry.role !== "assistant")) return;
      out.push({
        id: `${row.id}-${index}`,
        role: entry.role,
        text: text.slice(0, 2000),
        at: typeof entry.at === "string" ? entry.at : row.created_at,
      });
    });
    const resultMessage = typeof row.result?.message === "string" ? row.result.message.trim() : "";
    if (row.status === "executed" && resultMessage && out[out.length - 1]?.text !== resultMessage)
      out.push({
        id: `${row.id}-r`,
        role: "assistant",
        text: resultMessage,
        at: row.executed_at || row.created_at,
      });
    if (row.status === "cancelled")
      out.push({
        id: `${row.id}-c`,
        role: "assistant",
        text: "Pedido cancelado.",
        at: row.created_at,
      });
  }
  return out.slice(-60);
}
