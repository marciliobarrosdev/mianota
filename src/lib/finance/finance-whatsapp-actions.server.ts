/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Leituras e gravações do WhatsApp financeiro: plano com o recurso, categorias e
 * contas reais, resumo do período e a execução de um pedido confirmado.
 * `execute` só grava se conseguir "pegar" o pedido (ready → executing), então
 * uma confirmação repetida nunca cria dois lançamentos.
 */
import {
  missing,
  money,
  normalize,
  summaryPeriodBounds,
  summaryPeriodStart,
  summaryText,
  type Draft,
  type FinanceContext,
} from "@/lib/finance/finance-whatsapp-rules";

/** O plano da empresa inclui o WhatsApp financeiro (recurso "automacoes")? */
export async function whatsappFinanceEnabled(db: any, companyId: string) {
  const result = await db.rpc("company_has_plan_feature", {
    _company_id: companyId,
    _feature: "automacoes",
  });
  if (result.error) throw new Error(result.error.message);
  return result.data === true;
}

/** Categorias e contas ativas (cria as categorias pessoais padrão se faltarem). */
export async function loadContext(db: any, companyId: string): Promise<FinanceContext> {
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

/** Resumo do período pedido, só com lançamentos não cancelados, início inclusivo e fim exclusivo. */
export async function summary(db: any, companyId: string, period: Draft["queryPeriod"]) {
  const bounds = summaryPeriodBounds(period);
  let query = db
    .from("fin_lancamento")
    .select("tipo,status,valor_cents")
    .eq("company_id", companyId)
    .neq("status", "cancelado");
  if (bounds.from) query = query.gte("competencia", bounds.from);
  if (bounds.toExclusive) query = query.lt("competencia", bounds.toExclusive);
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return summaryText(result.data || []);
}

export async function execute(db: any, companyId: string, userId: string, command: any) {
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
  if (!claimed.data) {
    // Se a resposta se perdeu após o commit, recupera o resultado pelo ID
    const existing = await db
      .from("marcia_ai_command")
      .select("status,result")
      .eq("company_id", companyId)
      .eq("id", command.id)
      .maybeSingle();
    if (existing.data?.status === "executed" && existing.data?.result?.message) {
      return existing.data.result.message as string;
    }
    throw new Error("Esse pedido já foi processado.");
  }
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

    // Indexa semanticamente em segundo plano via pgvector (não bloqueia resposta)
    try {
      const summaryText = String(draft.summary || "").trim();
      if (summaryText) {
        const { indexTransactionEmbedding } = await import("@/lib/ai/ai-embeddings.server");
        void indexTransactionEmbedding(saved.data.id, companyId, summaryText);
      }
    } catch {
      /* indexação em segundo plano */
    }

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
      forma_pagamento: draft.paymentMethod || null,
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
