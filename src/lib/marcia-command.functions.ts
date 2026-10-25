/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeBrazilianPhoneToE164 } from "./phone";
import { LOVABLE_AI_MODEL } from "./lovable-ai-config";
import {
  DEFAULT_OPERATION_TIMEZONE,
  localDateTimeToUtc,
  zonedParts,
} from "./timezone";

export type MarciaCommandIntent =
  | "create_customer"
  | "create_work_order"
  | "start_work_order"
  | "update_work_order"
  | "complete_work_order"
  | "create_appointment"
  | "record_income"
  | "record_expense"
  | "query_finance"
  | "query_work_orders"
  | "unknown";

export type MarciaPaymentMethod =
  "pix" | "cartao" | "dinheiro" | "transferencia" | "boleto" | "outro";

export type MarciaCommandDraft = {
  intent: MarciaCommandIntent;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  workOrderId?: string | null;
  workOrderNumber?: number | null;
  serviceId?: string | null;
  serviceName?: string | null;
  professionalId?: string | null;
  professionalName?: string | null;
  summary?: string | null;
  details?: string | null;
  amountCents?: number | null;
  costCents?: number | null;
  paymentMethod?: MarciaPaymentMethod | null;
  paymentStatus?: "paid" | "pending" | null;
  scheduledAt?: string | null;
  queryPeriod?: "today" | "week" | "month" | "all" | null;
  missing?: string[];
};

export type MarciaCommandTurn = {
  commandId: string;
  mode: "question" | "confirm" | "answer";
  message: string;
  quickReplies: string[];
  preview: Array<{ label: string; value: string }>;
  draft: MarciaCommandDraft;
};

type CommandContext = {
  customers: Array<{ id: string; name: string; phone_e164: string | null }>;
  workOrders: Array<{
    id: string;
    number: number;
    status: string;
    summary: string;
    total_cents: number;
    customer_id: string;
    customer_name: string;
  }>;
  services: Array<{ id: string; name: string; duration_minutes: number; price_cents: number }>;
  professionals: Array<{ id: string; name: string }>;
};

const INTENTS = new Set<MarciaCommandIntent>([
  "create_customer",
  "create_work_order",
  "start_work_order",
  "update_work_order",
  "complete_work_order",
  "create_appointment",
  "record_income",
  "record_expense",
  "query_finance",
  "query_work_orders",
  "unknown",
]);

const PAYMENT_METHODS = new Set<MarciaPaymentMethod>([
  "pix",
  "cartao",
  "dinheiro",
  "transferencia",
  "boleto",
  "outro",
]);

function extractJson(raw: string): unknown {
  const clean = String(raw || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("A IA não conseguiu organizar este comando.");
    return JSON.parse(match[0]);
  }
}

function cleanString(value: unknown, max = 600): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().slice(0, max);
  return clean || null;
}

function cleanUuid(value: unknown): string | null {
  const clean = cleanString(value, 36);
  return clean && /^[0-9a-f-]{36}$/i.test(clean) ? clean : null;
}

function cleanCents(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 999_999_999_00) return null;
  return parsed;
}

function normalizeDraft(value: unknown): MarciaCommandDraft {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const rawIntent = cleanString(raw.intent, 40) as MarciaCommandIntent | null;
  const paymentMethod = cleanString(raw.paymentMethod, 20) as MarciaPaymentMethod | null;
  const paymentStatus = cleanString(raw.paymentStatus, 20);
  const queryPeriod = cleanString(raw.queryPeriod, 20);
  const workOrderNumber = Number(raw.workOrderNumber);

  return {
    intent: rawIntent && INTENTS.has(rawIntent) ? rawIntent : "unknown",
    customerId: cleanUuid(raw.customerId),
    customerName: cleanString(raw.customerName, 200),
    customerPhone: cleanString(raw.customerPhone, 30),
    workOrderId: cleanUuid(raw.workOrderId),
    workOrderNumber:
      Number.isSafeInteger(workOrderNumber) && workOrderNumber > 0 ? workOrderNumber : null,
    serviceId: cleanUuid(raw.serviceId),
    serviceName: cleanString(raw.serviceName, 160),
    professionalId: cleanUuid(raw.professionalId),
    professionalName: cleanString(raw.professionalName, 160),
    summary: cleanString(raw.summary, 240),
    details: cleanString(raw.details, 3000),
    amountCents: cleanCents(raw.amountCents),
    costCents: cleanCents(raw.costCents),
    paymentMethod: paymentMethod && PAYMENT_METHODS.has(paymentMethod) ? paymentMethod : null,
    paymentStatus: paymentStatus === "paid" || paymentStatus === "pending" ? paymentStatus : null,
    scheduledAt: cleanString(raw.scheduledAt, 60),
    queryPeriod:
      queryPeriod === "today" ||
      queryPeriod === "week" ||
      queryPeriod === "month" ||
      queryPeriod === "all"
        ? queryPeriod
        : null,
    missing: [],
  };
}

function fold(value: string | null | undefined): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseSpokenSchedule(
  message: string,
  previous: MarciaCommandDraft | null,
  now = new Date(),
): string | null {
  const normalized = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const timeMatch = normalized.match(
    /\b(?:as|pelas?)\s*(\d{1,2})(?:(?:h|:)([0-5]\d))?\b|\b(\d{1,2})(?:h|:)([0-5]\d)?\b/,
  );
  if (!timeMatch) return null;
  const hour = Number(timeMatch[1] ?? timeMatch[3]);
  const minute = Number(timeMatch[2] ?? timeMatch[4] ?? 0);
  if (hour > 23) return null;

  const current = zonedParts(now, DEFAULT_OPERATION_TIMEZONE);
  let target = { year: current.year, month: current.month, day: current.day };
  let hasDate = false;
  let offset: number | null = null;
  if (/\bdepois de amanha\b/.test(normalized)) offset = 2;
  else if (/\bamanha\b/.test(normalized)) offset = 1;
  else if (/\bhoje\b/.test(normalized)) offset = 0;

  const explicitDate = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (explicitDate) {
    target = {
      day: Number(explicitDate[1]),
      month: Number(explicitDate[2]),
      year: explicitDate[3]
        ? Number(explicitDate[3].length === 2 ? `20${explicitDate[3]}` : explicitDate[3])
        : current.year,
    };
    hasDate = true;
  } else if (offset !== null) {
    const date = new Date(Date.UTC(current.year, current.month - 1, current.day + offset));
    target = { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
    hasDate = true;
  } else {
    const weekdayNames: Array<[RegExp, number]> = [
      [/\bdomingo\b/, 0], [/\bsegunda\b/, 1], [/\bterca\b/, 2], [/\bquarta\b/, 3],
      [/\bquinta\b/, 4], [/\bsexta\b/, 5], [/\bsabado\b/, 6],
    ];
    const weekday = weekdayNames.find(([pattern]) => pattern.test(normalized))?.[1];
    if (weekday !== undefined) {
      const currentWeekday = new Date(Date.UTC(current.year, current.month - 1, current.day)).getUTCDay();
      const dayOffset = (weekday - currentWeekday + 7) % 7 || 7;
      const date = new Date(Date.UTC(current.year, current.month - 1, current.day + dayOffset));
      target = { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
      hasDate = true;
    }
  }

  if (!hasDate && previous?.scheduledAt) {
    const previousParts = zonedParts(new Date(previous.scheduledAt), DEFAULT_OPERATION_TIMEZONE);
    target = { year: previousParts.year, month: previousParts.month, day: previousParts.day };
    hasDate = true;
  }
  if (!hasDate) return null;
  return localDateTimeToUtc({ ...target, hour, minute }, DEFAULT_OPERATION_TIMEZONE)?.toISOString() || null;
}

function matchByName<T extends { id: string; name: string }>(
  rows: T[],
  id: string | null | undefined,
  name: string | null | undefined,
): T | null {
  if (id) return rows.find((row) => row.id === id) || null;
  const wanted = fold(name);
  if (!wanted) return null;
  const exact = rows.filter((row) => fold(row.name) === wanted);
  if (exact.length === 1) return exact[0];
  const partial = rows.filter(
    (row) => fold(row.name).includes(wanted) || wanted.includes(fold(row.name)),
  );
  return partial.length === 1 ? partial[0] : null;
}

function resolveEntities(draft: MarciaCommandDraft, context: CommandContext): MarciaCommandDraft {
  const next = { ...draft };
  const customer = matchByName(context.customers, next.customerId, next.customerName);
  if (customer) {
    next.customerId = customer.id;
    next.customerName = customer.name;
  }

  let order = next.workOrderId
    ? context.workOrders.find((row) => row.id === next.workOrderId) || null
    : next.workOrderNumber
      ? context.workOrders.find((row) => Number(row.number) === Number(next.workOrderNumber)) ||
        null
      : null;
  if (!order && next.customerName) {
    const wanted = fold(next.customerName);
    const candidates = context.workOrders.filter(
      (row) =>
        !["completed", "cancelled"].includes(row.status) &&
        (fold(row.customer_name) === wanted || fold(row.customer_name).includes(wanted)),
    );
    if (candidates.length === 1) order = candidates[0];
  }
  if (order) {
    next.workOrderId = order.id;
    next.workOrderNumber = Number(order.number);
    next.customerId ||= order.customer_id;
    next.customerName ||= order.customer_name;
    next.summary ||= order.summary;
    if (!next.amountCents && Number(order.total_cents) > 0)
      next.amountCents = Number(order.total_cents);
  }

  const service = matchByName(context.services, next.serviceId, next.serviceName);
  if (service) {
    next.serviceId = service.id;
    next.serviceName = service.name;
    next.summary ||= service.name;
    if (!next.amountCents && service.price_cents > 0) next.amountCents = service.price_cents;
  }
  const professional = matchByName(
    context.professionals,
    next.professionalId,
    next.professionalName,
  );
  if (professional) {
    next.professionalId = professional.id;
    next.professionalName = professional.name;
  }
  return next;
}

function requiredFields(draft: MarciaCommandDraft): string[] {
  const missing: string[] = [];
  switch (draft.intent) {
    case "create_customer":
      if (!draft.customerName) missing.push("customer");
      break;
    case "create_work_order":
      if (!draft.customerName && !draft.customerId) missing.push("customer");
      if (!draft.summary) missing.push("summary");
      break;
    case "start_work_order":
      if (!draft.workOrderId) missing.push("work_order");
      break;
    case "update_work_order":
      if (!draft.workOrderId) missing.push("work_order");
      if (
        !draft.details &&
        draft.amountCents == null &&
        draft.costCents == null &&
        !draft.scheduledAt
      ) {
        missing.push("changes");
      }
      break;
    case "complete_work_order":
      if (!draft.workOrderId) missing.push("work_order");
      if (draft.amountCents == null) missing.push("amount");
      if (!draft.paymentStatus) missing.push("payment");
      else if (draft.paymentStatus === "paid" && !draft.paymentMethod)
        missing.push("payment_method");
      break;
    case "create_appointment":
      if (!draft.customerName && !draft.customerId) missing.push("customer");
      if (!draft.serviceId) missing.push("service");
      if (!draft.professionalId) missing.push("professional");
      if (!draft.scheduledAt || Number.isNaN(new Date(draft.scheduledAt).getTime()))
        missing.push("scheduled_at");
      break;
    case "record_income":
      if (!draft.summary) missing.push("summary");
      if (draft.amountCents == null) missing.push("amount");
      if (!draft.paymentStatus) missing.push("payment");
      else if (draft.paymentStatus === "paid" && !draft.paymentMethod)
        missing.push("payment_method");
      break;
    case "record_expense":
      if (!draft.summary) missing.push("summary");
      if (draft.amountCents == null) missing.push("amount");
      if (!draft.paymentMethod) missing.push("payment_method");
      break;
    case "unknown":
      missing.push("intent");
      break;
  }
  return missing;
}

function questionFor(field: string, context: CommandContext) {
  const questions: Record<string, { message: string; quickReplies: string[] }> = {
    intent: {
      message: "Não entendi qual ação você quer que eu faça. Pode dizer de outro jeito?",
      quickReplies: ["Abrir uma OS", "Finalizar uma OS", "Registrar uma despesa"],
    },
    customer: { message: "Para qual cliente?", quickReplies: [] },
    summary: { message: "Qual serviço ou lançamento devo registrar?", quickReplies: [] },
    amount: { message: "Qual foi o valor?", quickReplies: [] },
    payment: {
      message: "Como ficou o pagamento?",
      quickReplies: ["Pix", "Cartão", "Dinheiro", "Ainda não pagou"],
    },
    payment_method: {
      message: "Qual foi a forma de pagamento?",
      quickReplies: ["Pix", "Cartão", "Dinheiro", "Transferência"],
    },
    changes: { message: "O que você quer acrescentar ou alterar nessa OS?", quickReplies: [] },
    service: {
      message: "Qual serviço devo agendar?",
      quickReplies: context.services.slice(0, 4).map((item) => item.name),
    },
    professional: {
      message: "Quem vai atender?",
      quickReplies: context.professionals.slice(0, 4).map((item) => item.name),
    },
    scheduled_at: { message: "Para qual dia e horário?", quickReplies: [] },
    work_order: {
      message: "Qual ordem de serviço você quer usar?",
      quickReplies: context.workOrders
        .filter((item) => !["completed", "cancelled"].includes(item.status))
        .slice(0, 4)
        .map((item) => `OS #${item.number} · ${item.customer_name}`),
    },
  };
  return questions[field] || questions.intent;
}

function labelPayment(method: MarciaPaymentMethod | null | undefined): string {
  return (
    (
      {
        pix: "Pix",
        cartao: "Cartão",
        dinheiro: "Dinheiro",
        transferencia: "Transferência",
        boleto: "Boleto",
        outro: "Outro",
      } as Record<string, string>
    )[method || ""] || "Não informado"
  );
}

function money(cents: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(cents || 0) / 100,
  );
}

function previewFor(draft: MarciaCommandDraft): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string | null | undefined }> = [];
  if (draft.workOrderNumber) rows.push({ label: "Ordem", value: `OS #${draft.workOrderNumber}` });
  if (draft.customerName) rows.push({ label: "Cliente", value: draft.customerName });
  if (draft.summary) rows.push({ label: "Serviço", value: draft.summary });
  if (draft.professionalName) rows.push({ label: "Responsável", value: draft.professionalName });
  if (draft.scheduledAt) {
    const date = new Date(draft.scheduledAt);
    rows.push({
      label: "Quando",
      value: Number.isNaN(date.getTime())
        ? draft.scheduledAt
        : date.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: DEFAULT_OPERATION_TIMEZONE,
          }),
    });
  }
  if (draft.amountCents != null) rows.push({ label: "Valor", value: money(draft.amountCents) });
  if (draft.costCents) rows.push({ label: "Custo", value: money(draft.costCents) });
  if (draft.paymentStatus) {
    rows.push({
      label: "Pagamento",
      value:
        draft.paymentStatus === "pending"
          ? "Pendente"
          : `Recebido · ${labelPayment(draft.paymentMethod)}`,
    });
  }
  if (draft.details) rows.push({ label: "Observações", value: draft.details });
  return rows
    .filter((row): row is { label: string; value: string } => Boolean(row.value))
    .slice(0, 8);
}

function actionMessage(intent: MarciaCommandIntent): string {
  const messages: Record<MarciaCommandIntent, string> = {
    create_customer: "Vou cadastrar este cliente.",
    create_work_order: "Vou abrir esta ordem de serviço.",
    start_work_order: "Vou iniciar a execução desta OS.",
    update_work_order: "Vou atualizar esta ordem de serviço.",
    complete_work_order: "Vou concluir a OS e organizar o financeiro.",
    create_appointment: "Vou registrar este agendamento.",
    record_income: "Vou registrar esta entrada no financeiro.",
    record_expense: "Vou registrar esta despesa no financeiro.",
    query_finance: "Aqui está o resumo financeiro.",
    query_work_orders: "Aqui está o resumo das ordens de serviço.",
    unknown: "Preciso entender melhor o pedido.",
  };
  return messages[intent];
}

async function loadContext(companyId: string): Promise<CommandContext> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [customers, orders, services, professionals] = await Promise.all([
    supabaseAdmin
      .from("marcia_customer")
      .select("id,name,phone_e164")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(80),
    supabaseAdmin
      .from("marcia_work_order")
      .select("id,number,status,summary,total_cents,customer_id,marcia_customer(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabaseAdmin
      .from("marcia_service")
      .select("id,name,duration_minutes,price_cents")
      .eq("company_id", companyId)
      .eq("active", true)
      .order("sort_order")
      .limit(80),
    supabaseAdmin
      .from("marcia_professional")
      .select("id,name")
      .eq("company_id", companyId)
      .eq("active", true)
      .order("name")
      .limit(80),
  ]);
  const failure = [customers, orders, services, professionals].find(
    (result) => result.error,
  )?.error;
  if (failure) throw new Error(failure.message);
  return {
    customers: (customers.data || []) as CommandContext["customers"],
    workOrders: (orders.data || []).map((row: any) => ({
      id: row.id,
      number: Number(row.number),
      status: row.status,
      summary: row.summary,
      total_cents: Number(row.total_cents || 0),
      customer_id: row.customer_id,
      customer_name: row.marcia_customer?.name || "Cliente",
    })),
    services: (services.data || []).map((row: any) => ({
      ...row,
      duration_minutes: Number(row.duration_minutes),
      price_cents: Number(row.price_cents || 0),
    })),
    professionals: (professionals.data || []) as CommandContext["professionals"],
  };
}

async function requestCommandDraft(params: {
  companyId: string;
  message: string;
  previous: MarciaCommandDraft | null;
  context: CommandContext;
}): Promise<MarciaCommandDraft> {
  const compactContext = {
    customers: params.context.customers.map(({ id, name }) => ({ id, name })),
    workOrders: params.context.workOrders,
    services: params.context.services,
    professionals: params.context.professionals,
  };
  const currentLocal = zonedParts(new Date(), DEFAULT_OPERATION_TIMEZONE);
  const currentLocalText = `${String(currentLocal.day).padStart(2, "0")}/${String(currentLocal.month).padStart(2, "0")}/${currentLocal.year} ${String(currentLocal.hour).padStart(2, "0")}:${String(currentLocal.minute).padStart(2, "0")}`;
  const system = `Você é o interpretador operacional da MárcIA. Converta a fala ou texto do usuário em UMA ação estruturada.

REGRAS:
- Use somente fatos ditos pelo usuário, o rascunho anterior e IDs do contexto real.
- Nunca invente cliente, OS, serviço, profissional, valor, pagamento, data ou horário.
- Se a mensagem for resposta curta a uma pergunta anterior, preserve o restante do rascunho e preencha apenas o que ela respondeu.
- "Pix", "cartão", "dinheiro" ou "transferência" significa paymentStatus="paid" e o respectivo paymentMethod.
- "não pagou", "ficou devendo" ou equivalente significa paymentStatus="pending" e paymentMethod=null.
- Valores devem ser inteiros em centavos. R$ 450 = 45000.
- A operação usa o fuso America/Sao_Paulo. Agora na operação: ${currentLocalText}.
- scheduledAt deve preservar exatamente a hora falada pelo usuário no fuso America/Sao_Paulo e usar ISO 8601 com offset -03:00. Ex.: "amanhã às 14h" vira o dia de amanhã às 14:00, nunca 17:00.
- Para referências como "OS do João", escolha o workOrderId somente quando houver uma única OS aberta compatível no contexto.
- Para consultas, use queryPeriod today|week|month|all.

INTENTS PERMITIDOS:
create_customer, create_work_order, start_work_order, update_work_order, complete_work_order,
create_appointment, record_income, record_expense, query_finance, query_work_orders, unknown.

Responda SOMENTE JSON válido e use null quando não souber:
{
  "intent": "...",
  "customerId": null,
  "customerName": null,
  "customerPhone": null,
  "workOrderId": null,
  "workOrderNumber": null,
  "serviceId": null,
  "serviceName": null,
  "professionalId": null,
  "professionalName": null,
  "summary": null,
  "details": null,
  "amountCents": null,
  "costCents": null,
  "paymentMethod": null,
  "paymentStatus": null,
  "scheduledAt": null,
  "queryPeriod": null
}`;

  const { lovableAiChat } = await import("./lovable-ai.server");
  const raw = await lovableAiChat(
      [
        { role: "system", content: system },
        {
          role: "user",
          content: `CONTEXTO REAL:\n${JSON.stringify(compactContext)}\n\nRASCUNHO ANTERIOR:\n${JSON.stringify(params.previous)}\n\nNOVA MENSAGEM:\n${params.message}`,
        },
      ],
      { model: LOVABLE_AI_MODEL },
    );
  const normalized = normalizeDraft(extractJson(raw));
  const spokenSchedule = parseSpokenSchedule(params.message, params.previous);
  if (spokenSchedule) normalized.scheduledAt = spokenSchedule;
  return normalized;
}

function mergeDraft(previous: MarciaCommandDraft | null, next: MarciaCommandDraft) {
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
      Object.entries(next).filter(
        ([, value]) => value !== null && value !== undefined && value !== "",
      ),
    ),
    intent: previous.intent,
  });
}

async function answerQuery(companyId: string, draft: MarciaCommandDraft): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (draft.intent === "query_work_orders") {
    const { data, error } = await supabaseAdmin
      .from("marcia_work_order")
      .select("status,total_cents")
      .eq("company_id", companyId);
    if (error) throw new Error(error.message);
    const rows = data || [];
    const open = rows.filter((row: any) => !["completed", "cancelled"].includes(row.status)).length;
    const progress = rows.filter((row: any) => row.status === "in_progress").length;
    const completed = rows.filter((row: any) => row.status === "completed").length;
    return `Você tem ${open} OS em aberto, ${progress} em execução e ${completed} concluídas.`;
  }

  if (!(await financeEnabled(companyId))) {
    throw new Error("Ative o financeiro do plano para consultar entradas e despesas.");
  }

  const now = new Date();
  let from: string | null = null;
  if (draft.queryPeriod === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    from = start.toISOString().slice(0, 10);
  } else if (draft.queryPeriod === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    from = start.toISOString().slice(0, 10);
  } else if (draft.queryPeriod !== "all") {
    from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }
  let query = supabaseAdmin
    .from("fin_lancamento")
    .select("tipo,status,valor_cents")
    .eq("company_id", companyId)
    .neq("status", "cancelado");
  if (from) query = query.gte("competencia", from);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = data || [];
  const received = rows
    .filter((row: any) => row.tipo === "receita" && row.status === "pago")
    .reduce((sum: number, row: any) => sum + Number(row.valor_cents || 0), 0);
  const expenses = rows
    .filter((row: any) => row.tipo === "despesa" && row.status === "pago")
    .reduce((sum: number, row: any) => sum + Number(row.valor_cents || 0), 0);
  const pending = rows
    .filter((row: any) => row.tipo === "receita" && ["pendente", "atrasado"].includes(row.status))
    .reduce((sum: number, row: any) => sum + Number(row.valor_cents || 0), 0);
  return `Entraram ${money(received)}, saíram ${money(expenses)} e há ${money(pending)} a receber no período.`;
}

export const interpretMarciaCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; message: string; commandId?: string | null }) => {
    const companyId = String(input?.companyId || "").trim();
    const message = String(input?.message || "")
      .trim()
      .slice(0, 4000);
    const commandId = input?.commandId ? String(input.commandId).slice(0, 36) : null;
    if (!companyId) throw new Error("Empresa não informada.");
    if (message.length < 2) throw new Error("Diga ou escreva o que você precisa.");
    return { companyId, message, commandId };
  })
  .handler(async ({ context, data }): Promise<MarciaCommandTurn> => {
    const { requireCompanyMemberAccess } = await import("./company-admin-access.server");
    const access = await requireCompanyMemberAccess(
      context.supabase,
      context.userId,
      data.companyId,
    );
    const { assertCompanyOperational } = await import("./plan-limits.server");
    await assertCompanyOperational(data.companyId, { superAdminBypass: access.isSuperAdmin });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    let command: any = null;
    if (data.commandId) {
      const { data: stored, error } = await db
        .from("marcia_ai_command")
        .select("*")
        .eq("company_id", data.companyId)
        .eq("id", data.commandId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!stored || ["executed", "cancelled"].includes(stored.status)) {
        throw new Error("Esse comando já foi encerrado. Comece um novo pedido.");
      }
      command = stored;
    }

    const previous = command ? normalizeDraft(command.draft) : null;
    const operationContext = await loadContext(data.companyId);
    const interpreted = await requestCommandDraft({
      companyId: data.companyId,
      message: data.message,
      previous,
      context: operationContext,
    });
    const draft = resolveEntities(mergeDraft(previous, interpreted), operationContext);
    draft.missing = requiredFields(draft);
    const commandId = command?.id || crypto.randomUUID();
    const messages = [
      ...(Array.isArray(command?.messages) ? command.messages : []),
      { role: "user", content: data.message, at: new Date().toISOString() },
    ];

    if (draft.intent === "query_finance" || draft.intent === "query_work_orders") {
      const answer = await answerQuery(data.companyId, draft);
      messages.push({ role: "assistant", content: answer, at: new Date().toISOString() });
      const result = { message: answer };
      const { error } = await db.from("marcia_ai_command").upsert({
        id: commandId,
        company_id: data.companyId,
        user_id: context.userId,
        status: "executed",
        intent: draft.intent,
        messages,
        draft,
        result,
        executed_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      return { commandId, mode: "answer", message: answer, quickReplies: [], preview: [], draft };
    }

    const firstMissing = draft.missing[0];
    const question = firstMissing ? questionFor(firstMissing, operationContext) : null;
    const message = question?.message || actionMessage(draft.intent);
    messages.push({ role: "assistant", content: message, at: new Date().toISOString() });
    const status = question ? "question" : "ready";
    const { error } = await db.from("marcia_ai_command").upsert({
      id: commandId,
      company_id: data.companyId,
      user_id: context.userId,
      status,
      intent: draft.intent,
      messages,
      draft,
      result: null,
      error_message: null,
    });
    if (error) throw new Error(error.message);

    return {
      commandId,
      mode: question ? "question" : "confirm",
      message,
      quickReplies: question?.quickReplies || [],
      preview: previewFor(draft),
      draft,
    };
  });

async function ensureCustomer(params: {
  companyId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  if (params.customerId) {
    const { data } = await supabaseAdmin
      .from("marcia_customer")
      .select("id,name")
      .eq("company_id", params.companyId)
      .eq("id", params.customerId)
      .maybeSingle();
    if (data) return data;
  }
  const name = params.customerName?.trim();
  if (!name) throw new Error("Cliente não informado.");
  const { data: existing } = await supabaseAdmin
    .from("marcia_customer")
    .select("id,name")
    .eq("company_id", params.companyId)
    .ilike("name", name)
    .limit(2);
  if (existing?.length === 1) return existing[0];
  const { data, error } = await supabaseAdmin
    .from("marcia_customer")
    .insert({
      company_id: params.companyId,
      name,
      phone_e164: params.customerPhone ? normalizeBrazilianPhoneToE164(params.customerPhone) : null,
      metadata: { source: "marcia_command" },
    })
    .select("id,name")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function financeEnabled(companyId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("company")
    .select("financeiro_ativo")
    .eq("id", companyId)
    .single();
  if (error) throw new Error(error.message);
  return data.financeiro_ativo === true;
}

async function insertFinance(params: {
  companyId: string;
  commandId: string;
  userId: string;
  type: "receita" | "despesa";
  description: string;
  amountCents: number;
  paymentMethod?: MarciaPaymentMethod | null;
  paymentStatus?: "paid" | "pending" | null;
  workOrderId?: string | null;
  customerPhone?: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const enabled = await financeEnabled(params.companyId);
  if (!enabled) return null;
  await (supabaseAdmin as any).rpc("seed_fin_categorias", { _company_id: params.companyId });
  const categoryName = params.type === "receita" ? "Serviços" : "Operacional";
  const { data: category } = await db
    .from("fin_categoria")
    .select("id")
    .eq("company_id", params.companyId)
    .eq("tipo", params.type)
    .eq("nome", categoryName)
    .maybeSingle();
  const today = new Date().toISOString().slice(0, 10);
  const status = params.paymentStatus === "pending" ? "pendente" : "pago";
  const existing = await db
    .from("fin_lancamento")
    .select("id")
    .eq("company_id", params.companyId)
    .eq("ai_command_id", params.commandId)
    .eq("tipo", params.type)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data;
  const { data, error } = await db
    .from("fin_lancamento")
    .insert({
      company_id: params.companyId,
      tipo: params.type,
      descricao: params.description,
      valor_cents: params.amountCents,
      categoria_id: category?.id || null,
      forma_pagamento: params.paymentMethod || null,
      status,
      vencimento: today,
      pago_em: status === "pago" ? today : null,
      competencia: today,
      contato_numero: params.customerPhone || null,
      created_by: params.userId,
      work_order_id: params.workOrderId || null,
      ai_command_id: params.commandId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export const executeMarciaCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; commandId: string }) => ({
    companyId: String(input?.companyId || "").trim(),
    commandId: String(input?.commandId || "")
      .trim()
      .slice(0, 36),
  }))
  .handler(async ({ context, data }) => {
    const { requireCompanyMemberAccess } = await import("./company-admin-access.server");
    const access = await requireCompanyMemberAccess(
      context.supabase,
      context.userId,
      data.companyId,
    );
    const { assertCompanyOperational } = await import("./plan-limits.server");
    await assertCompanyOperational(data.companyId, { superAdminBypass: access.isSuperAdmin });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: command, error: commandError } = await db
      .from("marcia_ai_command")
      .select("*")
      .eq("company_id", data.companyId)
      .eq("id", data.commandId)
      .maybeSingle();
    if (commandError) throw new Error(commandError.message);
    if (!command) throw new Error("Comando não encontrado.");
    if (command.status === "executed") return command.result;
    if (command.status !== "ready") throw new Error("Ainda faltam informações para executar.");
    const draft = normalizeDraft(command.draft);
    if (requiredFields(draft).length) throw new Error("Ainda faltam informações para executar.");

    const { data: claimed, error: claimError } = await db
      .from("marcia_ai_command")
      .update({ status: "executing" })
      .eq("company_id", data.companyId)
      .eq("id", data.commandId)
      .eq("status", "ready")
      .select("id")
      .maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimed) {
      const { data: latest } = await db
        .from("marcia_ai_command")
        .select("status,result")
        .eq("company_id", data.companyId)
        .eq("id", data.commandId)
        .maybeSingle();
      if (latest?.status === "executed") return latest.result;
      throw new Error("Esse comando já está sendo processado.");
    }

    try {
      let result: Record<string, unknown> = {};
      if (draft.intent === "create_customer") {
        const customer = await ensureCustomer({ companyId: data.companyId, ...draft });
        result = {
          message: `${customer.name} foi cadastrado com sucesso.`,
          customerId: customer.id,
        };
      } else if (draft.intent === "create_work_order") {
        const customer = await ensureCustomer({ companyId: data.companyId, ...draft });
        const { data: existing } = await db
          .from("marcia_work_order")
          .select("id,number")
          .eq("company_id", data.companyId)
          .eq("ai_command_id", data.commandId)
          .maybeSingle();
        let order = existing;
        if (!order) {
          const { data: created, error } = await db
            .from("marcia_work_order")
            .insert({
              company_id: data.companyId,
              customer_id: customer.id,
              professional_id: draft.professionalId || null,
              status: "open",
              summary: draft.summary!,
              description: draft.details || null,
              scheduled_at: draft.scheduledAt || null,
              subtotal_cents: draft.amountCents || 0,
              total_cents: draft.amountCents || 0,
              created_by: context.userId,
              ai_command_id: data.commandId,
            })
            .select("id,number")
            .single();
          if (error) throw new Error(error.message);
          order = created;
        }
        if (draft.amountCents && draft.paymentStatus) {
          await insertFinance({
            companyId: data.companyId,
            commandId: data.commandId,
            userId: context.userId,
            type: "receita",
            description: `OS #${order.number} · ${draft.summary}`,
            amountCents: draft.amountCents,
            paymentMethod: draft.paymentMethod,
            paymentStatus: draft.paymentStatus,
            workOrderId: order.id,
            customerPhone: draft.customerPhone,
          });
        }
        result = {
          message: `OS #${order.number} aberta para ${customer.name}.`,
          workOrderId: order.id,
        };
      } else if (
        ["start_work_order", "update_work_order", "complete_work_order"].includes(draft.intent)
      ) {
        const { data: order, error } = await db
          .from("marcia_work_order")
          .select("*,marcia_customer(name,phone_e164)")
          .eq("company_id", data.companyId)
          .eq("id", draft.workOrderId!)
          .single();
        if (error) throw new Error(error.message);
        if (draft.intent === "complete_work_order" && order.status === "completed") {
          throw new Error(`A OS #${order.number} já está concluída.`);
        }
        if (
          draft.intent === "start_work_order" &&
          !["draft", "open", "waiting_customer"].includes(order.status)
        ) {
          throw new Error(`A OS #${order.number} não pode ser iniciada no estado atual.`);
        }
        const patch: Record<string, unknown> = {};
        if (draft.intent === "start_work_order") {
          patch.status = "in_progress";
          patch.started_at = new Date().toISOString();
        }
        if (draft.intent === "update_work_order") {
          if (draft.details) {
            patch.description = [order.description, draft.details].filter(Boolean).join("\n\n");
          }
          if (draft.amountCents != null) {
            patch.subtotal_cents = draft.amountCents;
            patch.total_cents = draft.amountCents;
          }
          if (draft.scheduledAt) patch.scheduled_at = draft.scheduledAt;
        }
        if (draft.intent === "complete_work_order") {
          patch.status = "completed";
          patch.completed_at = new Date().toISOString();
          patch.subtotal_cents = draft.amountCents || 0;
          patch.total_cents = draft.amountCents || 0;
          if (draft.details)
            patch.description = [order.description, draft.details].filter(Boolean).join("\n\n");
        }
        const { error: updateError } = await db
          .from("marcia_work_order")
          .update(patch)
          .eq("company_id", data.companyId)
          .eq("id", order.id);
        if (updateError) throw new Error(updateError.message);
        if (draft.intent === "complete_work_order" && draft.amountCents) {
          await insertFinance({
            companyId: data.companyId,
            commandId: data.commandId,
            userId: context.userId,
            type: "receita",
            description: `OS #${order.number} · ${order.summary}`,
            amountCents: draft.amountCents,
            paymentMethod: draft.paymentMethod,
            paymentStatus: draft.paymentStatus,
            workOrderId: order.id,
            customerPhone: order.marcia_customer?.phone_e164,
          });
          if (draft.costCents) {
            await insertFinance({
              companyId: data.companyId,
              commandId: data.commandId,
              userId: context.userId,
              type: "despesa",
              description: `Custo da OS #${order.number}`,
              amountCents: draft.costCents,
              paymentMethod: draft.paymentMethod,
              paymentStatus: "paid",
              workOrderId: order.id,
              customerPhone: order.marcia_customer?.phone_e164,
            });
          }
        }
        const action =
          draft.intent === "start_work_order"
            ? "iniciada"
            : draft.intent === "complete_work_order"
              ? "concluída"
              : "atualizada";
        result = { message: `OS #${order.number} ${action} com sucesso.`, workOrderId: order.id };
      } else if (draft.intent === "record_income" || draft.intent === "record_expense") {
        if (!(await financeEnabled(data.companyId))) {
          throw new Error("Ative o financeiro do plano para registrar entradas e despesas.");
        }
        await insertFinance({
          companyId: data.companyId,
          commandId: data.commandId,
          userId: context.userId,
          type: draft.intent === "record_income" ? "receita" : "despesa",
          description: draft.summary!,
          amountCents: draft.amountCents!,
          paymentMethod: draft.paymentMethod,
          paymentStatus: draft.intent === "record_income" ? draft.paymentStatus : "paid",
        });
        result = {
          message: `${draft.intent === "record_income" ? "Entrada" : "Despesa"} de ${money(draft.amountCents)} registrada.`,
        };
      } else if (draft.intent === "create_appointment") {
        const customer = await ensureCustomer({ companyId: data.companyId, ...draft });
        const { data: appointment, error } = await (context.supabase as any).rpc(
          "marcia_reserve_appointment",
          {
            p_company_id: data.companyId,
            p_professional_id: draft.professionalId,
            p_customer_id: customer.id,
            p_service_id: draft.serviceId,
            p_starts_at: draft.scheduledAt,
            p_status: "confirmed",
            p_hold_minutes: 10,
            p_source: "manual",
            p_title: draft.summary || draft.serviceName,
            p_notes: draft.details || null,
            p_idempotency_key: `ai:${data.commandId}`,
          },
        );
        if (error) throw new Error(error.message);
        result = {
          message: `Agendamento confirmado para ${customer.name}.`,
          appointmentId: appointment?.id,
        };
      } else {
        throw new Error("Esse tipo de ação ainda não pode ser executado.");
      }

      const { error: finishError } = await db
        .from("marcia_ai_command")
        .update({
          status: "executed",
          result,
          executed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("company_id", data.companyId)
        .eq("id", data.commandId);
      if (finishError) throw new Error(finishError.message);
      return result;
    } catch (error) {
      await db
        .from("marcia_ai_command")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : String(error),
        })
        .eq("company_id", data.companyId)
        .eq("id", data.commandId);
      throw error;
    }
  });

export const cancelMarciaCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; commandId: string }) => ({
    companyId: String(input?.companyId || "").trim(),
    commandId: String(input?.commandId || "")
      .trim()
      .slice(0, 36),
  }))
  .handler(async ({ context, data }) => {
    const { requireCompanyMemberAccess } = await import("./company-admin-access.server");
    await requireCompanyMemberAccess(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { error } = await db
      .from("marcia_ai_command")
      .update({ status: "cancelled" })
      .eq("company_id", data.companyId)
      .eq("id", data.commandId)
      .in("status", ["understanding", "question", "ready", "failed"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
