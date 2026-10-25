/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LOVABLE_AI_MODEL } from "./lovable-ai-config";

export type FinanceCommandIntent =
  | "record_expense"
  | "record_income"
  | "create_bill"
  | "create_budget"
  | "create_goal"
  | "create_recurring"
  | "query_summary"
  | "unknown";

type FinanceType = "receita" | "despesa";
type PaymentMethod = "pix" | "cartao" | "dinheiro" | "transferencia" | "boleto" | "outro";
type PaymentStatus = "paid" | "pending";

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

type FinanceContext = {
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
  "outro",
]);

function cleanString(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, max);
  return cleaned || null;
}

function cleanUuid(value: unknown): string | null {
  const cleaned = cleanString(value, 36);
  return cleaned && /^[0-9a-f-]{36}$/i.test(cleaned) ? cleaned : null;
}

function cleanCents(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 999_999_999_00 ? parsed : null;
}

function extractJson(raw: string): unknown {
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

function normalizeDraft(value: unknown): FinanceCommandDraft {
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

function fold(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mergeDraft(previous: FinanceCommandDraft | null, next: FinanceCommandDraft) {
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

function resolveEntities(draft: FinanceCommandDraft, context: FinanceContext) {
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

function requiredFields(draft: FinanceCommandDraft): string[] {
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

function questionFor(field: string, context: FinanceContext) {
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

const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value || 0) / 100,
  );

function actionMessage(intent: FinanceCommandIntent) {
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

function previewFor(draft: FinanceCommandDraft) {
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
        (
          {
            pix: "Pix",
            cartao: "Cartão",
            dinheiro: "Dinheiro",
            transferencia: "Transferência",
            boleto: "Boleto",
            outro: "Outro",
          } as Record<string, string>
        )[draft.paymentMethod] || draft.paymentMethod,
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

async function authorize(context: any, companyId: string) {
  const { requireCompanyMemberAccess } = await import("./company-admin-access.server");
  const access = await requireCompanyMemberAccess(context.supabase, context.userId, companyId);
  const { assertCompanyOperational } = await import("./plan-limits.server");
  await assertCompanyOperational(companyId, { superAdminBypass: access.isSuperAdmin });
}

async function loadContext(context: any, companyId: string): Promise<FinanceContext> {
  const { error: seedError } = await (context.supabase as any).rpc(
    "seed_finance_personal_categories",
    { _company_id: companyId },
  );
  if (seedError) throw new Error(seedError.message);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [categories, accounts] = await Promise.all([
    supabaseAdmin
      .from("fin_categoria")
      .select("id,nome,tipo")
      .eq("company_id", companyId)
      .eq("ativo", true),
    (supabaseAdmin as any)
      .from("fin_conta")
      .select("id,nome,instituicao")
      .eq("company_id", companyId)
      .eq("ativo", true),
  ]);
  if (categories.error) throw new Error(categories.error.message);
  if (accounts.error) throw new Error(accounts.error.message);
  return {
    categories: (categories.data || []).map((row: any) => ({
      id: row.id,
      name: row.nome,
      type: row.tipo,
    })),
    accounts: (accounts.data || []).map((row: any) => ({
      id: row.id,
      name: row.nome,
      institution: row.instituicao,
    })),
  };
}

async function requestDraft(
  message: string,
  previous: FinanceCommandDraft | null,
  financeContext: FinanceContext,
  imageDataUrl?: string | null,
  pdf?: { name: string; dataUrl: string } | null,
) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const system = `Você é o cérebro financeiro da MárcIA. Transforme a fala, texto ou comprovante do usuário em UMA ação financeira estruturada.

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
- accountName só pode receber o nome exato de uma conta do CONTEXTO REAL. Marca de cartão ou banco citada apenas como meio de pagamento não é uma conta cadastrada: nesse caso, use paymentMethod e deixe accountName/accountId nulos.
- Se a pessoa pedir explicitamente uma conta que não existe no CONTEXTO REAL, preserve accountName e mantenha accountId nulo para o sistema perguntar antes de registrar.
- Ao receber imagem ou PDF, leia somente dados legíveis como estabelecimento, total e data. Se houver dúvida, deixe o campo null para perguntar ao usuário.
- Responda SOMENTE JSON válido.

INTENTS: record_expense, record_income, create_bill, create_budget, create_goal, create_recurring, query_summary, unknown.
FORMATO:
{"intent":"...","type":null,"summary":null,"amountCents":null,"categoryId":null,"categoryName":null,"accountId":null,"accountName":null,"paymentMethod":null,"paymentStatus":null,"date":null,"frequency":null,"targetCents":null,"deadline":null,"queryPeriod":null}`;
  const { lovableAiChat } = await import("./lovable-ai.server");
  const prompt = `CONTEXTO REAL:\n${JSON.stringify(financeContext)}\n\nRASCUNHO ANTERIOR:\n${JSON.stringify(previous)}\n\nNOVA MENSAGEM:\n${message}`;
  const raw = await lovableAiChat(
    [
      { role: "system", content: system },
      {
        role: "user",
        content: imageDataUrl
          ? [
              { type: "text" as const, text: prompt },
              {
                type: "image_url" as const,
                image_url: { url: imageDataUrl, detail: "high" as const },
              },
            ]
          : pdf
            ? [
                { type: "text" as const, text: prompt },
                {
                  type: "file" as const,
                  file: { filename: pdf.name, file_data: pdf.dataUrl },
                },
              ]
            : prompt,
      },
    ],
    { model: LOVABLE_AI_MODEL },
  );
  return normalizeDraft(extractJson(raw));
}

async function answerSummary(companyId: string, period: FinanceCommandDraft["queryPeriod"]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  let from: string | null = null;
  if (period === "today")
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  else if (period === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    from = start.toISOString().slice(0, 10);
  } else if (period !== "all")
    from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  let query = supabaseAdmin
    .from("fin_lancamento")
    .select("tipo,status,valor_cents")
    .eq("company_id", companyId)
    .neq("status", "cancelado");
  if (from) query = query.gte("competencia", from);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = data || [];
  const income = rows
    .filter((row: any) => row.tipo === "receita" && row.status === "pago")
    .reduce((sum: number, row: any) => sum + Number(row.valor_cents), 0);
  const expense = rows
    .filter((row: any) => row.tipo === "despesa" && row.status === "pago")
    .reduce((sum: number, row: any) => sum + Number(row.valor_cents), 0);
  const pending = rows
    .filter((row: any) => row.tipo === "despesa" && ["pendente", "atrasado"].includes(row.status))
    .reduce((sum: number, row: any) => sum + Number(row.valor_cents), 0);
  return `No período, entraram ${money(income)}, saíram ${money(expense)} e há ${money(pending)} para pagar. Seu resultado é ${money(income - expense)}.`;
}

export const interpretFinanceCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      companyId: string;
      message: string;
      commandId?: string | null;
      imageDataUrl?: string | null;
      fileDataUrl?: string | null;
      fileName?: string | null;
    }) => {
      const companyId = String(input?.companyId || "").trim();
      const message = String(input?.message || "")
        .trim()
        .slice(0, 4000);
      const commandId = input?.commandId ? String(input.commandId).slice(0, 36) : null;
      const rawImage = input?.imageDataUrl ? String(input.imageDataUrl) : null;
      const imageDataUrl =
        rawImage && /^data:image\/(?:png|jpeg|webp);base64,/i.test(rawImage) ? rawImage : null;
      const rawFile = !imageDataUrl && input?.fileDataUrl ? String(input.fileDataUrl) : null;
      const pdfDataUrl =
        rawFile && /^data:application\/pdf;base64,/i.test(rawFile) ? rawFile : null;
      if (rawFile && !pdfDataUrl) throw new Error("Envie uma foto (PNG, JPG, WebP) ou um PDF.");
      const fileName =
        String(input?.fileName || "comprovante.pdf")
          .replace(/[^\p{L}\p{N} ._()-]/gu, "")
          .slice(0, 120) || "comprovante.pdf";
      if (!companyId) throw new Error("Conta não informada.");
      if (!imageDataUrl && !pdfDataUrl && message.length < 2)
        throw new Error("Diga, escreva ou envie um comprovante.");
      if (imageDataUrl && imageDataUrl.length > 8_000_000)
        throw new Error("A imagem é muito grande. Envie um arquivo de até 5 MB.");
      if (pdfDataUrl && pdfDataUrl.length > 8_000_000)
        throw new Error("O PDF é muito grande. Envie um arquivo de até 5 MB.");
      return {
        companyId,
        message: message || "Leia este comprovante e prepare o lançamento.",
        commandId,
        imageDataUrl,
        pdf: pdfDataUrl ? { name: fileName, dataUrl: pdfDataUrl } : null,
      };
    },
  )
  .handler(async ({ context, data }): Promise<FinanceCommandTurn> => {
    await authorize(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    let command: any = null;
    if (data.commandId) {
      const stored = await db
        .from("marcia_ai_command")
        .select("*")
        .eq("company_id", data.companyId)
        .eq("id", data.commandId)
        .maybeSingle();
      if (stored.error) throw new Error(stored.error.message);
      if (!stored.data || ["executed", "cancelled"].includes(stored.data.status))
        throw new Error("Esse pedido já foi encerrado.");
      command = stored.data;
    }
    const financeContext = await loadContext(context, data.companyId);
    const previous = command ? normalizeDraft(command.draft) : null;
    const creditRef = `app-finance:${crypto.randomUUID()}`;
    const consumed = await db.rpc("consume_ai_credit", {
      _company_id: data.companyId,
      _ref: creditRef,
    });
    if (consumed.error) throw new Error(consumed.error.message);
    if (!consumed.data)
      throw new Error("Seus créditos de IA terminaram. Ative ou renove seu plano para continuar.");
    let interpreted: FinanceCommandDraft;
    try {
      interpreted = await requestDraft(
        data.message,
        previous,
        financeContext,
        data.imageDataUrl,
        data.pdf,
      );
    } catch (error) {
      await db
        .rpc("refund_ai_credit", { _company_id: data.companyId, _ref: creditRef })
        .catch(() => undefined);
      throw error;
    }
    const draft = resolveEntities(mergeDraft(previous, interpreted), financeContext);
    if (!draft.date && ["record_expense", "record_income"].includes(draft.intent))
      draft.date = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    if (!draft.type && draft.intent === "record_expense") draft.type = "despesa";
    if (!draft.type && draft.intent === "record_income") draft.type = "receita";
    if (!draft.paymentStatus && draft.intent === "create_bill") draft.paymentStatus = "pending";
    draft.missing = requiredFields(draft);
    const commandId = command?.id || crypto.randomUUID();
    const messages = [
      ...(Array.isArray(command?.messages) ? command.messages : []),
      {
        role: "user",
        content: data.imageDataUrl
          ? `${data.message} [comprovante anexado]`
          : data.pdf
            ? `${data.message} [PDF anexado: ${data.pdf.name}]`
            : data.message,
        at: new Date().toISOString(),
      },
    ];

    if (draft.intent === "query_summary") {
      const answer = await answerSummary(data.companyId, draft.queryPeriod || "month");
      messages.push({ role: "assistant", content: answer, at: new Date().toISOString() });
      const result = { message: answer };
      const saved = await db.from("marcia_ai_command").upsert({
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
      if (saved.error) throw new Error(saved.error.message);
      return { commandId, mode: "answer", message: answer, quickReplies: [], preview: [], draft };
    }

    const question = draft.missing[0] ? questionFor(draft.missing[0], financeContext) : null;
    const assistantMessage = question?.message || actionMessage(draft.intent);
    messages.push({ role: "assistant", content: assistantMessage, at: new Date().toISOString() });
    const saved = await db.from("marcia_ai_command").upsert({
      id: commandId,
      company_id: data.companyId,
      user_id: context.userId,
      status: question ? "question" : "ready",
      intent: draft.intent,
      messages,
      draft,
      result: null,
      error_message: null,
    });
    if (saved.error) throw new Error(saved.error.message);
    return {
      commandId,
      mode: question ? "question" : "confirm",
      message: assistantMessage,
      quickReplies: question?.quickReplies || [],
      preview: previewFor(draft),
      draft,
    };
  });

export const executeFinanceCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; commandId: string }) => ({
    companyId: String(input?.companyId || "").trim(),
    commandId: String(input?.commandId || "")
      .trim()
      .slice(0, 36),
  }))
  .handler(async ({ context, data }) => {
    await authorize(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const stored = await db
      .from("marcia_ai_command")
      .select("*")
      .eq("company_id", data.companyId)
      .eq("id", data.commandId)
      .maybeSingle();
    if (stored.error) throw new Error(stored.error.message);
    const command = stored.data;
    if (!command) throw new Error("Pedido não encontrado.");
    if (command.status === "executed") return command.result;
    if (command.status !== "ready") throw new Error("Ainda faltam informações para executar.");
    const draft = normalizeDraft(command.draft);
    if (requiredFields(draft).length) throw new Error("Ainda faltam informações para executar.");
    if (["create_goal", "create_recurring"].includes(draft.intent)) {
      const { assertCompanyPlanFeature } = await import("./plan-limits.server");
      await assertCompanyPlanFeature(
        data.companyId,
        "automacoes",
        "Metas e recorrências estão disponíveis no plano Pro.",
      );
    }
    const claim = await db
      .from("marcia_ai_command")
      .update({ status: "executing" })
      .eq("company_id", data.companyId)
      .eq("id", data.commandId)
      .eq("status", "ready")
      .select("id")
      .maybeSingle();
    if (claim.error) throw new Error(claim.error.message);
    if (!claim.data) throw new Error("Esse pedido já está sendo processado.");

    try {
      let result: Record<string, unknown>;
      if (["record_expense", "record_income", "create_bill"].includes(draft.intent)) {
        const type: FinanceType = draft.intent === "record_income" ? "receita" : "despesa";
        const status =
          draft.intent === "create_bill" || draft.paymentStatus === "pending" ? "pendente" : "pago";
        const date =
          draft.date || new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        const existing = await db
          .from("fin_lancamento")
          .select("id")
          .eq("company_id", data.companyId)
          .eq("ai_command_id", data.commandId)
          .eq("tipo", type)
          .maybeSingle();
        if (existing.error) throw new Error(existing.error.message);
        let transaction = existing.data;
        if (!transaction) {
          const inserted = await db
            .from("fin_lancamento")
            .insert({
              company_id: data.companyId,
              tipo: type,
              descricao: draft.summary,
              valor_cents: draft.amountCents,
              categoria_id: draft.categoryId || null,
              conta_id: draft.accountId || null,
              forma_pagamento: draft.paymentMethod || null,
              status,
              vencimento: date,
              pago_em: status === "pago" ? date : null,
              competencia: date,
              ocorrido_em: `${date}T12:00:00-03:00`,
              fonte: "ia",
              original_input:
                command.messages?.find((entry: any) => entry.role === "user")?.content || null,
              ai_command_id: data.commandId,
              created_by: context.userId,
            })
            .select("id")
            .single();
          if (inserted.error) throw new Error(inserted.error.message);
          transaction = inserted.data;
        }
        result = {
          message: `${type === "receita" ? "Receita" : status === "pendente" ? "Conta a pagar" : "Despesa"} de ${money(draft.amountCents)} registrada.`,
          transactionId: transaction.id,
        };
      } else if (draft.intent === "create_budget") {
        const category = draft.categoryId
          ? { id: draft.categoryId }
          : (
              await db
                .from("fin_categoria")
                .select("id")
                .eq("company_id", data.companyId)
                .eq("tipo", "despesa")
                .ilike("nome", draft.categoryName)
                .limit(1)
                .maybeSingle()
            ).data;
        if (!category?.id)
          throw new Error("Não encontrei essa categoria. Escolha uma categoria existente.");
        const month = `${new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7)}-01`;
        const saved = await db
          .from("fin_orcamento")
          .upsert(
            {
              company_id: data.companyId,
              categoria_id: category.id,
              competencia: month,
              limite_cents: draft.amountCents,
            },
            { onConflict: "company_id,categoria_id,competencia" },
          )
          .select("id")
          .single();
        if (saved.error) throw new Error(saved.error.message);
        result = {
          message: `Orçamento mensal de ${money(draft.amountCents)} criado para ${draft.categoryName}.`,
          budgetId: saved.data.id,
        };
      } else if (draft.intent === "create_goal") {
        const saved = await db
          .from("fin_meta")
          .insert({
            company_id: data.companyId,
            nome: draft.summary,
            objetivo_cents: draft.targetCents,
            prazo: draft.deadline || null,
          })
          .select("id")
          .single();
        if (saved.error) throw new Error(saved.error.message);
        result = {
          message: `Meta “${draft.summary}” criada com objetivo de ${money(draft.targetCents)}.`,
          goalId: saved.data.id,
        };
      } else if (draft.intent === "create_recurring") {
        const nextDate =
          draft.date || new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        const saved = await db
          .from("fin_recorrencia")
          .insert({
            company_id: data.companyId,
            tipo: draft.type,
            descricao: draft.summary,
            valor_cents: draft.amountCents,
            categoria_id: draft.categoryId || null,
            conta_id: draft.accountId || null,
            frequencia: draft.frequency,
            proxima_data: nextDate,
          })
          .select("id")
          .single();
        if (saved.error) throw new Error(saved.error.message);
        result = {
          message: `${draft.summary} foi programado para repetir ${draft.frequency}.`,
          recurrenceId: saved.data.id,
        };
      } else throw new Error("Esse tipo de pedido ainda não pode ser executado.");

      const done = await db
        .from("marcia_ai_command")
        .update({
          status: "executed",
          result,
          executed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("company_id", data.companyId)
        .eq("id", data.commandId);
      if (done.error) throw new Error(done.error.message);
      return result;
    } catch (error: any) {
      await db
        .from("marcia_ai_command")
        .update({
          status: "failed",
          error_message: String(error?.message || "Falha ao executar").slice(0, 500),
        })
        .eq("company_id", data.companyId)
        .eq("id", data.commandId);
      throw error;
    }
  });

export const cancelFinanceCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; commandId: string }) => ({
    companyId: String(input?.companyId || "").trim(),
    commandId: String(input?.commandId || "")
      .trim()
      .slice(0, 36),
  }))
  .handler(async ({ context, data }) => {
    await authorize(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await (supabaseAdmin as any)
      .from("marcia_ai_command")
      .update({ status: "cancelled" })
      .eq("company_id", data.companyId)
      .eq("id", data.commandId)
      .in("status", ["understanding", "question", "ready"]);
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });

export type FinanceChatHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
};

/** Histórico recente das conversas do próprio usuário com a MárcIA (somente leitura). */
export const listFinanceChatHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => {
    const companyId = String(input?.companyId || "").trim();
    if (!companyId) throw new Error("Conta não informada.");
    return { companyId };
  })
  .handler(async ({ context, data }): Promise<FinanceChatHistoryMessage[]> => {
    await authorize(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("marcia_ai_command")
      .select("id,messages,status,result,created_at,executed_at")
      .eq("company_id", data.companyId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw new Error(error.message);
    const out: FinanceChatHistoryMessage[] = [];
    for (const row of (rows || []).reverse()) {
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
      const resultMessage =
        typeof row.result?.message === "string" ? row.result.message.trim() : "";
      if (
        row.status === "executed" &&
        resultMessage &&
        out[out.length - 1]?.text !== resultMessage
      )
        out.push({
          id: `${row.id}-r`,
          role: "assistant",
          text: resultMessage,
          at: row.executed_at || row.created_at,
        });
      if (row.status === "cancelled")
        out.push({ id: `${row.id}-c`, role: "assistant", text: "Pedido cancelado.", at: row.created_at });
    }
    return out.slice(-60);
  });
