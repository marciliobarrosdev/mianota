/* eslint-disable @typescript-eslint/no-explicit-any */
import { LOVABLE_AI_MODEL } from "./lovable-ai-config";

type FinanceIntent =
  | "record_expense"
  | "record_income"
  | "create_bill"
  | "create_budget"
  | "create_goal"
  | "create_recurring"
  | "query_summary"
  | "unknown";

type Draft = {
  intent: FinanceIntent;
  type?: "receita" | "despesa" | null;
  summary?: string | null;
  amountCents?: number | null;
  categoryId?: string | null;
  categoryName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  paymentMethod?: "pix" | "cartao" | "dinheiro" | "transferencia" | "boleto" | "outro" | null;
  paymentStatus?: "paid" | "pending" | null;
  date?: string | null;
  frequency?: "semanal" | "quinzenal" | "mensal" | "anual" | null;
  targetCents?: number | null;
  deadline?: string | null;
  queryPeriod?: "today" | "week" | "month" | "all" | null;
  missing?: string[];
};

type FinanceContext = {
  categories: Array<{ id: string; name: string; type: "receita" | "despesa" }>;
  accounts: Array<{ id: string; name: string; institution: string | null }>;
};

const INTENTS = new Set<FinanceIntent>([
  "record_expense",
  "record_income",
  "create_bill",
  "create_budget",
  "create_goal",
  "create_recurring",
  "query_summary",
  "unknown",
]);

function text(value: unknown, max = 500) {
  const cleaned = typeof value === "string" ? value.trim().slice(0, max) : "";
  return cleaned || null;
}

function uuid(value: unknown) {
  const cleaned = text(value, 36);
  return cleaned && /^[0-9a-f-]{36}$/i.test(cleaned) ? cleaned : null;
}

function cents(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 999_999_999_00 ? parsed : null;
}

function json(raw: string) {
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

function normalize(value: unknown): Draft {
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
    paymentMethod:
      method && ["pix", "cartao", "dinheiro", "transferencia", "boleto", "outro"].includes(method)
        ? (method as Draft["paymentMethod"])
        : null,
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

function fold(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function whatsappFinanceEnabled(db: any, companyId: string) {
  const result = await db.rpc("company_has_plan_feature", {
    _company_id: companyId,
    _feature: "automacoes",
  });
  if (result.error) throw new Error(result.error.message);
  return result.data === true;
}

function merge(previous: Draft | null, next: Draft) {
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

function resolve(draft: Draft, context: FinanceContext) {
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

function missing(draft: Draft) {
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

function question(field: string, context: FinanceContext) {
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

const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value || 0) / 100,
  );

function preview(draft: Draft) {
  const lines = [
    draft.summary ? `Descrição: ${draft.summary}` : "",
    draft.amountCents != null ? `Valor: ${money(draft.amountCents)}` : "",
    draft.intent === "create_goal" && draft.targetCents != null
      ? `Objetivo: ${money(draft.targetCents)}`
      : "",
    draft.categoryName ? `Categoria: ${draft.categoryName}` : "",
    draft.accountName ? `Conta: ${draft.accountName}` : "",
    draft.paymentMethod ? `Pagamento: ${draft.paymentMethod}` : "",
    draft.frequency ? `Frequência: ${draft.frequency}` : "",
    draft.date ? `Data: ${new Date(`${draft.date}T12:00:00`).toLocaleDateString("pt-BR")}` : "",
  ].filter(Boolean);
  return lines.map((line) => `• ${line}`).join("\n");
}

async function loadContext(db: any, companyId: string): Promise<FinanceContext> {
  const seeded = await db.rpc("seed_finance_personal_categories", { _company_id: companyId });
  if (seeded.error) throw new Error(seeded.error.message);
  const [categories, accounts] = await Promise.all([
    db.from("fin_categoria").select("id,nome,tipo").eq("company_id", companyId).eq("ativo", true),
    db
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

async function interpret(
  message: string,
  previous: Draft | null,
  context: FinanceContext,
  imageDataUrl?: string | null,
) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const system = `Você é o cérebro financeiro da MárcIA. Transforme a mensagem ou o comprovante em UMA ação financeira estruturada.

REGRAS:
- Use somente dados realmente presentes. Nunca invente valor, data, pagamento, conta ou categoria.
- Preserve o rascunho anterior quando a mensagem responder à pergunta anterior.
- Valores são inteiros em centavos. Hoje é ${today}, fuso America/Sao_Paulo.
- gastei/paguei/comprei = record_expense pago. recebi/entrou = record_income pago.
- conta/boleto/vai vencer/tenho que pagar/me lembre = create_bill pendente.
- todo mês/semana/ano = create_recurring.
- pedido de saldo/resumo/quanto gastei = query_summary.
- Em imagem, leia estabelecimento, total e data quando estiverem legíveis. Se não estiver seguro, deixe null.
- categoryId/accountId só podem vir do CONTEXTO REAL.
- accountName só pode receber o nome exato de uma conta do CONTEXTO REAL. Marca de cartão ou banco citada apenas como meio de pagamento não é uma conta cadastrada: use paymentMethod e deixe accountName/accountId nulos.
- Se a pessoa pedir explicitamente uma conta que não existe no CONTEXTO REAL, preserve accountName e mantenha accountId nulo para o sistema perguntar antes de registrar.
- Responda SOMENTE JSON válido.

INTENTS: record_expense, record_income, create_bill, create_budget, create_goal, create_recurring, query_summary, unknown.
FORMATO: {"intent":"...","type":null,"summary":null,"amountCents":null,"categoryId":null,"categoryName":null,"accountId":null,"accountName":null,"paymentMethod":null,"paymentStatus":null,"date":null,"frequency":null,"targetCents":null,"deadline":null,"queryPeriod":null}`;
  const { lovableAiChat } = await import("./lovable-ai.server");
  const prompt = `CONTEXTO REAL:\n${JSON.stringify(context)}\n\nRASCUNHO ANTERIOR:\n${JSON.stringify(previous)}\n\nNOVA MENSAGEM:\n${message}`;
  const content = imageDataUrl
    ? [
        { type: "text" as const, text: prompt },
        { type: "image_url" as const, image_url: { url: imageDataUrl, detail: "high" as const } },
      ]
    : prompt;
  const raw = await lovableAiChat(
    [
      { role: "system", content: system },
      { role: "user", content },
    ],
    { model: LOVABLE_AI_MODEL },
  );
  return normalize(json(raw));
}

async function summary(db: any, companyId: string, period: Draft["queryPeriod"]) {
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
  let query = db
    .from("fin_lancamento")
    .select("tipo,status,valor_cents")
    .eq("company_id", companyId)
    .neq("status", "cancelado");
  if (from) query = query.gte("competencia", from);
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  const rows = result.data || [];
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

async function execute(db: any, companyId: string, userId: string, command: any) {
  const draft = normalize(command.draft);
  if (missing(draft).length) throw new Error("Ainda falta informação para confirmar.");
  const claimed = await db
    .from("marcia_ai_command")
    .update({ status: "executing" })
    .eq("company_id", companyId)
    .eq("id", command.id)
    .eq("status", "ready")
    .select("id")
    .maybeSingle();
  if (claimed.error) throw new Error(claimed.error.message);
  if (!claimed.data) throw new Error("Esse pedido já foi processado.");
  let result: any;
  if (["record_expense", "record_income", "create_bill"].includes(draft.intent)) {
    const type = draft.intent === "record_income" ? "receita" : "despesa";
    const status =
      draft.intent === "create_bill" || draft.paymentStatus === "pending" ? "pendente" : "pago";
    const date =
      draft.date || new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const saved = await db
      .from("fin_lancamento")
      .insert({
        company_id: companyId,
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
        fonte: "whatsapp",
        original_input:
          command.messages?.find((entry: any) => entry.role === "user")?.content || null,
        ai_command_id: command.id,
        created_by: userId,
        contato_numero: command.draft?.whatsappNumber || null,
      })
      .select("id")
      .single();
    if (saved.error) throw new Error(saved.error.message);
    result = {
      message: `${type === "receita" ? "Receita" : status === "pendente" ? "Conta a pagar" : "Despesa"} de ${money(draft.amountCents)} registrada.`,
    };
  } else if (draft.intent === "create_budget") {
    let categoryId = draft.categoryId;
    if (!categoryId && draft.categoryName) {
      const category = await db
        .from("fin_categoria")
        .select("id")
        .eq("company_id", companyId)
        .eq("tipo", "despesa")
        .ilike("nome", draft.categoryName)
        .limit(1)
        .maybeSingle();
      categoryId = category.data?.id || null;
    }
    if (!categoryId) throw new Error("Não encontrei essa categoria.");
    const month = `${new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7)}-01`;
    const saved = await db.from("fin_orcamento").upsert(
      {
        company_id: companyId,
        categoria_id: categoryId,
        competencia: month,
        limite_cents: draft.amountCents,
      },
      { onConflict: "company_id,categoria_id,competencia" },
    );
    if (saved.error) throw new Error(saved.error.message);
    result = {
      message: `Orçamento mensal de ${money(draft.amountCents)} criado para ${draft.categoryName}.`,
    };
  } else if (draft.intent === "create_goal") {
    const saved = await db.from("fin_meta").insert({
      company_id: companyId,
      nome: draft.summary,
      objetivo_cents: draft.targetCents,
      prazo: draft.deadline || null,
    });
    if (saved.error) throw new Error(saved.error.message);
    result = {
      message: `Meta “${draft.summary}” criada com objetivo de ${money(draft.targetCents)}.`,
    };
  } else if (draft.intent === "create_recurring") {
    const nextDate =
      draft.date || new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const saved = await db.from("fin_recorrencia").insert({
      company_id: companyId,
      tipo: draft.type,
      descricao: draft.summary,
      valor_cents: draft.amountCents,
      categoria_id: draft.categoryId || null,
      conta_id: draft.accountId || null,
      frequencia: draft.frequency,
      proxima_data: nextDate,
    });
    if (saved.error) throw new Error(saved.error.message);
    result = { message: `${draft.summary} foi programado para repetir ${draft.frequency}.` };
  } else throw new Error("Esse pedido ainda não pode ser executado.");
  const done = await db
    .from("marcia_ai_command")
    .update({
      status: "executed",
      result,
      executed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("company_id", companyId)
    .eq("id", command.id);
  if (done.error) throw new Error(done.error.message);
  return result.message as string;
}

export async function pairFinanceWhatsapp(input: {
  db: any;
  companyId: string;
  phone: string;
  displayName?: string | null;
  message: string;
}) {
  const match = input.message
    .trim()
    .toUpperCase()
    .match(/^VINCULAR\s+([0-9]{8})$/);
  if (!match) return null;
  if (!(await whatsappFinanceEnabled(input.db, input.companyId))) {
    return {
      ok: false,
      reply: "O WhatsApp financeiro está disponível no plano Pro. Faça o upgrade no aplicativo.",
    };
  }
  const pairing = await input.db
    .from("fin_whatsapp_pairing")
    .select("id,user_id,expires_at,used_at")
    .eq("company_id", input.companyId)
    .eq("code", match[1])
    .maybeSingle();
  if (pairing.error) throw new Error(pairing.error.message);
  if (
    !pairing.data ||
    pairing.data.used_at ||
    new Date(pairing.data.expires_at).getTime() < Date.now()
  ) {
    return {
      ok: false,
      reply: "Esse código venceu ou não existe. Gere outro na área WhatsApp do aplicativo.",
    };
  }
  const phoneE164 = `+${input.phone.replace(/\D/g, "")}`;
  const deactivated = await input.db
    .from("fin_whatsapp_identity")
    .update({ active: false })
    .eq("phone_e164", phoneE164)
    .neq("company_id", input.companyId);
  if (deactivated.error) throw new Error(deactivated.error.message);
  const saved = await input.db.from("fin_whatsapp_identity").upsert(
    {
      company_id: input.companyId,
      user_id: pairing.data.user_id,
      phone_e164: phoneE164,
      display_name: input.displayName || null,
      active: true,
      verified_at: new Date().toISOString(),
    },
    { onConflict: "company_id,user_id" },
  );
  if (saved.error) throw new Error(saved.error.message);
  await input.db
    .from("fin_whatsapp_pairing")
    .update({ used_at: new Date().toISOString() })
    .eq("company_id", input.companyId)
    .eq("id", pairing.data.id);
  return {
    ok: true,
    userId: pairing.data.user_id as string,
    reply:
      "Celular vinculado com segurança. Agora você pode mandar um gasto, receita, conta, meta ou perguntar pelo seu mês.",
  };
}

export async function handleFinanceWhatsapp(input: {
  db: any;
  companyId: string;
  phone: string;
  message: string;
  imageDataUrl?: string | null;
}) {
  if (!(await whatsappFinanceEnabled(input.db, input.companyId))) {
    return {
      authorized: false,
      reply: "O WhatsApp financeiro está disponível no plano Pro. Faça o upgrade no aplicativo.",
    };
  }
  const phoneE164 = `+${input.phone.replace(/\D/g, "")}`;
  const identity = await input.db
    .from("fin_whatsapp_identity")
    .select("id,user_id,active")
    .eq("company_id", input.companyId)
    .eq("phone_e164", phoneE164)
    .eq("active", true)
    .maybeSingle();
  if (identity.error) throw new Error(identity.error.message);
  if (!identity.data)
    return {
      authorized: false,
      reply:
        "Este celular ainda não está vinculado. Abra o aplicativo, entre em WhatsApp e gere seu código de segurança.",
    };
  const userId = identity.data.user_id as string;
  await input.db
    .from("fin_whatsapp_identity")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", identity.data.id);
  const lower = fold(input.message);
  const active = await input.db
    .from("marcia_ai_command")
    .select("*")
    .eq("company_id", input.companyId)
    .eq("user_id", userId)
    .in("status", ["question", "ready"])
    .gte("updated_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active.error) throw new Error(active.error.message);
  if (active.data && /^(cancelar|cancela|nao|não)$/.test(lower)) {
    await input.db
      .from("marcia_ai_command")
      .update({ status: "cancelled" })
      .eq("company_id", input.companyId)
      .eq("id", active.data.id);
    return { authorized: true, userId, reply: "Tudo bem. Cancelei essa ação." };
  }
  if (
    active.data?.status === "ready" &&
    /^(sim|confirmar|confirma|pode fazer|execute|executar)$/.test(lower)
  ) {
    try {
      return {
        authorized: true,
        userId,
        reply: await execute(input.db, input.companyId, userId, active.data),
      };
    } catch (error: any) {
      await input.db
        .from("marcia_ai_command")
        .update({
          status: "failed",
          error_message: String(error?.message || "Falha ao executar").slice(0, 500),
        })
        .eq("company_id", input.companyId)
        .eq("id", active.data.id);
      throw error;
    }
  }

  const creditRef = `whatsapp-finance:${crypto.randomUUID()}`;
  const consumed = await input.db.rpc("consume_ai_credit", {
    _company_id: input.companyId,
    _ref: creditRef,
  });
  if (consumed.error) throw new Error(consumed.error.message);
  if (!consumed.data)
    return {
      authorized: true,
      userId,
      reply:
        "Seus créditos de IA terminaram. Ative ou renove seu plano no aplicativo para continuar.",
    };
  let draft: Draft;
  try {
    const context = await loadContext(input.db, input.companyId);
    const previous = active.data ? normalize(active.data.draft) : null;
    draft = resolve(
      merge(previous, await interpret(input.message, previous, context, input.imageDataUrl)),
      context,
    );
    if (!draft.date && ["record_expense", "record_income"].includes(draft.intent))
      draft.date = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    if (!draft.type && draft.intent === "record_expense") draft.type = "despesa";
    if (!draft.type && draft.intent === "record_income") draft.type = "receita";
    if (!draft.paymentStatus && draft.intent === "create_bill") draft.paymentStatus = "pending";
    draft.missing = missing(draft);
    (draft as any).whatsappNumber = phoneE164;
    const commandId = active.data?.id || crypto.randomUUID();
    const messages = [
      ...(Array.isArray(active.data?.messages) ? active.data.messages : []),
      {
        role: "user",
        content: input.message,
        at: new Date().toISOString(),
        source: input.imageDataUrl ? "receipt" : "text",
      },
    ];
    if (draft.intent === "query_summary") {
      const answer = await summary(input.db, input.companyId, draft.queryPeriod || "month");
      messages.push({ role: "assistant", content: answer, at: new Date().toISOString() });
      const saved = await input.db.from("marcia_ai_command").upsert({
        id: commandId,
        company_id: input.companyId,
        user_id: userId,
        status: "executed",
        intent: draft.intent,
        messages,
        draft,
        result: { message: answer },
        executed_at: new Date().toISOString(),
      });
      if (saved.error) throw new Error(saved.error.message);
      return { authorized: true, userId, reply: answer, creditRef };
    }
    const field = draft.missing[0];
    const reply = field
      ? question(field, context)
      : `Entendi. Confira antes de eu registrar:\n\n${preview(draft)}\n\nResponda *CONFIRMAR* para salvar ou *CANCELAR*.`;
    messages.push({ role: "assistant", content: reply, at: new Date().toISOString() });
    const saved = await input.db.from("marcia_ai_command").upsert({
      id: commandId,
      company_id: input.companyId,
      user_id: userId,
      status: field ? "question" : "ready",
      intent: draft.intent,
      messages,
      draft,
      result: null,
      error_message: null,
    });
    if (saved.error) throw new Error(saved.error.message);
    return { authorized: true, userId, reply, creditRef };
  } catch (error) {
    await input.db.rpc("refund_ai_credit", { _company_id: input.companyId, _ref: creditRef });
    throw error;
  }
}
