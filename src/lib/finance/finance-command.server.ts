/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Parte de servidor dos comandos financeiros da MIA: acesso, contexto real da conta,
 * chamada à IA, resumo de período e execução do rascunho confirmado.
 * Só é carregado por import dinâmico dentro dos handlers de `finance-command.functions.ts`,
 * para que o cliente administrativo do banco nunca vá para o navegador.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { LOVABLE_AI_MODEL } from "@/lib/ai/lovable-ai-config";
import {
  buildFinanceCommandSystemPrompt,
  extractJson,
  money,
  normalizeDraft,
  todayInSaoPaulo,
  type FinanceCommandDraft,
  type FinanceContext,
  type FinanceType,
} from "@/lib/finance/finance-command-rules";

/** Exige membro da empresa e empresa operante (super admin passa pelo bloqueio de plano). */
export async function authorizeFinanceCommand(context: any, companyId: string) {
  const { requireCompanyMemberAccess } = await import("@/lib/common/company-admin-access.server");
  const access = await requireCompanyMemberAccess(context.supabase, context.userId, companyId);
  const { assertCompanyOperational } = await import("@/lib/billing/plan-limits.server");
  await assertCompanyOperational(companyId, { superAdminBypass: access.isSuperAdmin });
}

/**
 * Carrega categorias e contas ativas da empresa — o "CONTEXTO REAL" que a IA pode citar.
 * Antes, garante as categorias pessoais padrão (RPC idempotente, roda como o usuário).
 */
export async function loadFinanceContext(context: any, companyId: string): Promise<FinanceContext> {
  const { error: seedError } = await (context.supabase as any).rpc(
    "seed_finance_personal_categories",
    { _company_id: companyId },
  );
  if (seedError) throw new Error(seedError.message);
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

/** Pede à IA o rascunho estruturado; aceita texto e, opcionalmente, foto ou PDF do comprovante. */
export async function requestFinanceDraft(
  message: string,
  previous: FinanceCommandDraft | null,
  financeContext: FinanceContext,
  imageDataUrl?: string | null,
  pdf?: { name: string; dataUrl: string } | null,
  extraSystem = "",
) {
  const system = buildFinanceCommandSystemPrompt(todayInSaoPaulo()) + extraSystem;
  const { lovableAiChat } = await import("@/lib/ai/lovable-ai.server");
  const prompt = `CONTEXTO REAL:\n${JSON.stringify(financeContext)}\n\nRASCUNHO ANTERIOR:\n${JSON.stringify(previous)}\n\nNOVA MENSAGEM:\n${message}`;
  const content = imageDataUrl
    ? [
        { type: "text" as const, text: prompt },
        { type: "image_url" as const, image_url: { url: imageDataUrl, detail: "high" as const } },
      ]
    : pdf
      ? [
          { type: "text" as const, text: prompt },
          { type: "file" as const, file: { filename: pdf.name, file_data: pdf.dataUrl } },
        ]
      : prompt;
  const raw = await lovableAiChat(
    [
      { role: "system", content: system },
      { role: "user", content },
    ],
    { model: LOVABLE_AI_MODEL },
  );
  return normalizeDraft(extractJson(raw));
}

/**
 * Resumo do período a partir dos lançamentos reais (cancelados não contam).
 * Entradas/saídas somam apenas itens pagos; "a pagar" soma despesas pendentes ou atrasadas.
 */
export async function answerFinanceSummary(
  companyId: string,
  period: FinanceCommandDraft["queryPeriod"],
) {
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
  const sum = (filter: (row: any) => boolean) =>
    rows.filter(filter).reduce((total: number, row: any) => total + Number(row.valor_cents), 0);
  const income = sum((row) => row.tipo === "receita" && row.status === "pago");
  const expense = sum((row) => row.tipo === "despesa" && row.status === "pago");
  const pending = sum(
    (row) => row.tipo === "despesa" && ["pendente", "atrasado"].includes(row.status),
  );
  return `No período, entraram ${money(income)}, saíram ${money(expense)} e há ${money(pending)} para pagar. Seu resultado é ${money(income - expense)}.`;
}

type ExecuteInput = {
  db: any;
  companyId: string;
  commandId: string;
  userId: string;
  draft: FinanceCommandDraft;
  firstUserMessage: string | null;
};

/**
 * Grava o rascunho confirmado na tabela certa e devolve a mensagem de resultado.
 * Lançamentos são idempotentes por `ai_command_id`: se o mesmo pedido for reexecutado
 * após uma falha parcial, reaproveita o lançamento já criado em vez de duplicar.
 */
export async function executeFinanceDraft({
  db,
  companyId,
  commandId,
  userId,
  draft,
  firstUserMessage,
}: ExecuteInput) {
  if (["record_expense", "record_income", "create_bill"].includes(draft.intent)) {
    const type: FinanceType = draft.intent === "record_income" ? "receita" : "despesa";
    const status =
      draft.intent === "create_bill" || draft.paymentStatus === "pending" ? "pendente" : "pago";
    const date = draft.date || todayInSaoPaulo();
    const existing = await db
      .from("fin_lancamento")
      .select("id")
      .eq("company_id", companyId)
      .eq("ai_command_id", commandId)
      .eq("tipo", type)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    let transaction = existing.data;
    if (!transaction) {
      const inserted = await db
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
          fonte: "ia",
          original_input: firstUserMessage,
          ai_command_id: commandId,
          created_by: userId,
        })
        .select("id")
        .single();
      if (inserted.error) throw new Error(inserted.error.message);
      transaction = inserted.data;
    }
    return {
      message: `${type === "receita" ? "Receita" : status === "pendente" ? "Conta a pagar" : "Despesa"} de ${money(draft.amountCents)} registrada.`,
      transactionId: transaction.id,
    };
  }
  if (draft.intent === "create_budget") {
    const category = draft.categoryId
      ? { id: draft.categoryId }
      : (
          await db
            .from("fin_categoria")
            .select("id")
            .eq("company_id", companyId)
            .eq("tipo", "despesa")
            .ilike("nome", draft.categoryName)
            .limit(1)
            .maybeSingle()
        ).data;
    if (!category?.id)
      throw new Error("Não encontrei essa categoria. Escolha uma categoria existente.");
    // Orçamento é mensal: um por categoria e mês (upsert substitui o limite do mês atual).
    const month = `${todayInSaoPaulo().slice(0, 7)}-01`;
    const saved = await db
      .from("fin_orcamento")
      .upsert(
        {
          company_id: companyId,
          categoria_id: category.id,
          competencia: month,
          limite_cents: draft.amountCents,
        },
        { onConflict: "company_id,categoria_id,competencia" },
      )
      .select("id")
      .single();
    if (saved.error) throw new Error(saved.error.message);
    return {
      message: `Orçamento mensal de ${money(draft.amountCents)} criado para ${draft.categoryName}.`,
      budgetId: saved.data.id,
    };
  }
  if (draft.intent === "create_goal") {
    const saved = await db
      .from("fin_meta")
      .insert({
        company_id: companyId,
        nome: draft.summary,
        objetivo_cents: draft.targetCents,
        prazo: draft.deadline || null,
      })
      .select("id")
      .single();
    if (saved.error) throw new Error(saved.error.message);
    return {
      message: `Meta “${draft.summary}” criada com objetivo de ${money(draft.targetCents)}.`,
      goalId: saved.data.id,
    };
  }
  if (draft.intent === "create_recurring") {
    const saved = await db
      .from("fin_recorrencia")
      .insert({
        company_id: companyId,
        tipo: draft.type,
        descricao: draft.summary,
        valor_cents: draft.amountCents,
        categoria_id: draft.categoryId || null,
        conta_id: draft.accountId || null,
        frequencia: draft.frequency,
        proxima_data: draft.date || todayInSaoPaulo(),
        forma_pagamento: draft.paymentMethod || null,
      })
      .select("id")
      .single();
    if (saved.error) throw new Error(saved.error.message);
    return {
      message: `${draft.summary} foi programado para repetir ${draft.frequency}.`,
      recurrenceId: saved.data.id,
    };
  }
  throw new Error("Esse tipo de pedido ainda não pode ser executado.");
}
