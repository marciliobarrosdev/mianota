/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Funções de servidor do painel financeiro: leitura do Início, do extrato e do
 * Planejamento, novo lançamento, fim do onboarding e calendário. Os cálculos
 * ficam em `finance-dashboard-rules.ts`; os formatos em `finance-dashboard-types.ts`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanitizeRange, toIsoDate, addDays } from "@/lib/finance/finance-period";
import {
  buildDashboardSnapshot,
  cents,
  monthBounds,
  plannerItemsFromRows,
  timeOf,
} from "@/lib/finance/finance-dashboard-rules";
import type {
  FinanceCalendarItem,
  FinanceDashboardSnapshot,
  FinancePlannerItem,
  FinanceTransactionDetail,
} from "@/lib/finance/finance-dashboard-types";

// As telas importam os tipos daqui; continuam funcionando.
export type * from "@/lib/finance/finance-dashboard-types";

async function authorize(context: any, companyId: string) {
  const { requireCompanyMemberAccess } = await import("@/lib/common/company-admin-access.server");
  const access = await requireCompanyMemberAccess(context.supabase, context.userId, companyId);
  const { assertCompanyOperational } = await import("@/lib/billing/plan-limits.server");
  await assertCompanyOperational(companyId, { superAdminBypass: access.isSuperAdmin });
}

export const getFinanceDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      companyId: string;
      month?: string | null;
      from?: string | null;
      to?: string | null;
    }) => {
      const companyId = String(input?.companyId || "").trim();
      if (!companyId) throw new Error("Conta não informada.");
      const month = input?.month && /^\d{4}-\d{2}$/.test(input.month) ? input.month : null;
      const range = sanitizeRange(input?.from, input?.to);
      return { companyId, month, range };
    },
  )
  .handler(async ({ context, data }): Promise<FinanceDashboardSnapshot> => {
    await authorize(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const monthRef = data.month ? new Date(`${data.month}-15T12:00:00`) : new Date();
    const fallback = monthBounds(monthRef);
    const from = data.range?.from ?? fallback.start;
    const to = data.range?.to ?? fallback.end;
    const budgetMonth = from.slice(0, 7);
    const todayIso = toIsoDate(new Date());
    const next14 = addDays(todayIso, 14);

    const { error: seedError } = await (context.supabase as any).rpc(
      "seed_finance_personal_categories",
      { _company_id: data.companyId },
    );
    if (seedError) throw new Error(seedError.message);

    const [transactions, upcomingRows, accounts, categories, budgets, cards, invoices, goals] =
      await Promise.all([
        db
          .from("fin_lancamento")
          .select(
            "id,tipo,descricao,valor_cents,status,vencimento,pago_em,competencia,categoria_id,fonte,created_at",
          )
          .eq("company_id", data.companyId)
          .neq("status", "cancelado")
          .gte("competencia", from)
          .lte("competencia", to)
          .order("competencia", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(5000),
        db
          .from("fin_lancamento")
          .select("id,tipo,descricao,valor_cents,status,vencimento")
          .eq("company_id", data.companyId)
          .in("status", ["pendente", "atrasado"])
          .lte("vencimento", next14)
          .order("vencimento")
          .limit(8),
        db
          .from("fin_conta")
          .select("id,nome,instituicao,tipo,saldo_cents,cor")
          .eq("company_id", data.companyId)
          .eq("ativo", true)
          .order("nome"),
        db
          .from("fin_categoria")
          .select("id,nome,tipo,cor")
          .eq("company_id", data.companyId)
          .eq("ativo", true),
        db
          .from("fin_orcamento")
          .select("id,categoria_id,limite_cents,competencia")
          .eq("company_id", data.companyId)
          .eq("competencia", `${budgetMonth}-01`),
        db
          .from("fin_cartao")
          .select("id,nome,ultimos_quatro,cor,limite_cents")
          .eq("company_id", data.companyId)
          .eq("ativo", true),
        db
          .from("fin_fatura")
          .select("id,cartao_id,total_cents,vencimento_em,status")
          .eq("company_id", data.companyId)
          .in("status", ["aberta", "fechada", "atrasada"]),
        db
          .from("fin_meta")
          .select("id,nome,objetivo_cents,acumulado_cents,prazo,cor,status")
          .eq("company_id", data.companyId)
          .eq("status", "ativa")
          .order("created_at"),
      ]);

    const failed = [
      transactions,
      upcomingRows,
      accounts,
      categories,
      budgets,
      cards,
      invoices,
      goals,
    ].find((result) => result.error)?.error;
    if (failed) throw new Error(failed.message);

    return buildDashboardSnapshot(
      { transactions, upcomingRows, accounts, categories, budgets, cards, invoices, goals },
      from,
      to,
      budgetMonth,
    );
  });

export const listFinanceTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; from: string; to: string }) => {
    const companyId = String(input?.companyId || "").trim();
    if (!companyId) throw new Error("Conta não informada.");
    const range = sanitizeRange(input?.from, input?.to);
    if (!range) throw new Error("Período inválido.");
    return { companyId, ...range };
  })
  .handler(
    async ({
      context,
      data,
    }): Promise<{
      items: FinanceTransactionDetail[];
      categories: Array<{ id: string; name: string; color: string; type: string }>;
      accounts: Array<{ id: string; name: string }>;
    }> => {
      await authorize(context, data.companyId);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as any;
      const [rows, categories, accounts, cards] = await Promise.all([
        db
          .from("fin_lancamento")
          .select(
            "id,tipo,descricao,estabelecimento,valor_cents,status,vencimento,pago_em,competencia,ocorrido_em,categoria_id,conta_id,cartao_id,forma_pagamento,fonte,anexo_url,observacao,original_input,parcela_numero,parcela_total,created_at,tags,fin_lancamento_split(categoria_id,valor_cents)",
          )
          .eq("company_id", data.companyId)
          .neq("status", "cancelado")
          .gte("competencia", data.from)
          .lte("competencia", data.to)
          .order("competencia", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(2000),
        db
          .from("fin_categoria")
          .select("id,nome,tipo,cor")
          .eq("company_id", data.companyId)
          .eq("ativo", true)
          .order("nome"),
        db.from("fin_conta").select("id,nome").eq("company_id", data.companyId).order("nome"),
        db
          .from("fin_cartao")
          .select("id,nome,ultimos_quatro")
          .eq("company_id", data.companyId),
      ]);
      const failed = [rows, categories, accounts, cards].find((r) => r.error)?.error;
      if (failed) throw new Error(failed.message);
      const categoryById = new Map((categories.data || []).map((r: any) => [r.id, r] as const));
      const accountById = new Map((accounts.data || []).map((r: any) => [r.id, r] as const));
      const cardById = new Map((cards.data || []).map((r: any) => [r.id, r] as const));
      return {
        items: (rows.data || []).map((row: any): FinanceTransactionDetail => {
          const category = categoryById.get(row.categoria_id) as any;
          const account = accountById.get(row.conta_id) as any;
          const card = cardById.get(row.cartao_id) as any;
          return {
            id: row.id,
            date: row.competencia,
            time: timeOf(row.ocorrido_em) ?? timeOf(row.created_at),
            type: row.tipo,
            description: row.descricao,
            merchant: row.estabelecimento || null,
            category: category?.nome || null,
            categoryColor: category?.cor || null,
            amountCents: cents(row.valor_cents),
            paymentMethod: row.forma_pagamento || null,
            account: account?.nome || null,
            card: card ? `${card.nome}${card.ultimos_quatro ? ` •${card.ultimos_quatro}` : ""}` : null,
            source: row.fonte || "manual",
            hasAttachment: Boolean(row.anexo_url),
            attachmentUrl: /^https:\/\//.test(row.anexo_url || "") ? row.anexo_url : null,
            categoryId: row.categoria_id || null,
            tags: Array.isArray(row.tags) ? row.tags : [],
            splits: (row.fin_lancamento_split || []).map((p: any) => {
              const c = categoryById.get(p.categoria_id) as any;
              return { categoryId: p.categoria_id || null, category: c?.nome || null, color: c?.cor || null, amountCents: cents(p.valor_cents) };
            }),
            status: row.status,
            dueDate: row.vencimento || null,
            paidAt: row.pago_em || null,
            note: row.observacao || null,
            originalInput: row.original_input || null,
            installment:
              row.parcela_total && row.parcela_numero
                ? `${row.parcela_numero}/${row.parcela_total}`
                : null,
          };
        }),
        categories: (categories.data || []).map((r: any) => ({
          id: r.id,
          name: r.nome,
          color: r.cor,
          type: r.tipo,
        })),
        accounts: (accounts.data || []).map((r: any) => ({ id: r.id, name: r.nome })),
      };
    },
  );

export async function buildPlannerItems(db: any, companyId: string, first: string, last: string): Promise<FinancePlannerItem[]> {
    const [entries, recurrences, categories] = await Promise.all([
      db
        .from("fin_lancamento")
        .select(
          "id,descricao,valor_cents,tipo,status,vencimento,pago_em,competencia,ocorrido_em,categoria_id,forma_pagamento,fonte,observacao,recorrencia_id,metadata",
        )
        .eq("company_id", companyId)
        .or(
          `and(vencimento.gte.${first},vencimento.lte.${last}),and(competencia.gte.${first},competencia.lte.${last})`,
        )
        .limit(3000),
      db
        .from("fin_recorrencia")
        .select("id,descricao,valor_cents,tipo,proxima_data,frequencia,termina_em,categoria_id,forma_pagamento")
        .eq("company_id", companyId)
        .eq("ativo", true)
        .lte("proxima_data", last),
      db.from("fin_categoria").select("id,nome").eq("company_id", companyId),
    ]);
    const failed = [entries, recurrences, categories].find((r) => r.error)?.error;
    if (failed) throw new Error(failed.message);
    return plannerItemsFromRows({ entries, recurrences, categories }, first, last);
}

export const getFinancePlanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; first: string; last: string }) => {
    const companyId = String(input?.companyId || "").trim();
    if (!companyId) throw new Error("Conta não informada.");
    const range = sanitizeRange(input?.first, input?.last);
    if (!range) throw new Error("Período inválido.");
    return { companyId, first: range.from, last: range.to };
  })
  .handler(async ({ context, data }): Promise<FinancePlannerItem[]> => {
    await authorize(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    return buildPlannerItems(db, data.companyId, data.first, data.last);
  });

const PAYMENT_METHODS = new Set(["pix", "cartao", "dinheiro", "transferencia", "boleto", "salario", "outro"]);

export const addFinanceTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      companyId: string;
      type: "receita" | "despesa";
      description: string;
      amountCents: number;
      date?: string;
      categoryId?: string | null;
      accountId?: string | null;
      paymentMethod?: string | null;
      merchant?: string | null;
      note?: string | null;
      status?: "pago" | "pendente";
      source?: "manual" | "ia" | "whatsapp";
      originalInput?: string | null;
      aiCommandId?: string | null;
    }) => {
      const companyId = String(input?.companyId || "").trim();
      const description = String(input?.description || "")
        .trim()
        .slice(0, 240);
      const amountCents = Number(input?.amountCents);
      if (!companyId) throw new Error("Conta não informada.");
      if (!description) throw new Error("Descrição não informada.");
      if (!Number.isSafeInteger(amountCents) || amountCents <= 0)
        throw new Error("Informe um valor válido.");
      if (!PAYMENT_METHODS.has(String(input?.paymentMethod))) throw new Error("Informe a forma de pagamento.");
      return { ...input, companyId, description, amountCents };
    },
  )
  .handler(async ({ context, data }) => {
    await authorize(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const date =
      data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date)
        ? data.date
        : new Date().toISOString().slice(0, 10);
    const status = data.status || "pago";
    const { data: row, error } = await db
      .from("fin_lancamento")
      .insert({
        company_id: data.companyId,
        tipo: data.type,
        descricao: data.description,
        valor_cents: data.amountCents,
        categoria_id: data.categoryId || null,
        conta_id: data.accountId || null,
        forma_pagamento: PAYMENT_METHODS.has(String(data.paymentMethod))
          ? data.paymentMethod
          : null,
        estabelecimento: data.merchant ? String(data.merchant).trim().slice(0, 160) || null : null,
        observacao: data.note ? String(data.note).trim().slice(0, 500) || null : null,
        status,
        vencimento: date,
        pago_em: status === "pago" ? date : null,
        competencia: date,
        ocorrido_em: `${date}T12:00:00.000Z`,
        fonte: data.source || "manual",
        original_input: data.originalInput || null,
        ai_command_id: data.aiCommandId || null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const finishFinanceOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      companyId: string;
      accountName: string;
      balanceCents: number;
      goal: "control" | "save" | "clarity";
    }) => {
      const companyId = String(input?.companyId || "").trim();
      const accountName = String(input?.accountName || "Conta principal")
        .trim()
        .slice(0, 120);
      const balanceCents = Number(input?.balanceCents || 0);
      const goal = ["control", "save", "clarity"].includes(input?.goal)
        ? input.goal
        : "control";
      if (!companyId) throw new Error("Conta não informada.");
      if (!Number.isSafeInteger(balanceCents)) throw new Error("Saldo inicial inválido.");
      return {
        companyId,
        accountName: accountName || "Conta principal",
        balanceCents,
        goal,
      };
    },
  )
  .handler(async ({ context, data }) => {
    await authorize(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: company, error: companyReadError } = await db
      .from("company")
      .select("id,onboarding_completed")
      .eq("id", data.companyId)
      .single();
    if (companyReadError) throw new Error(companyReadError.message);
    if (company?.onboarding_completed) return { completed: true, alreadyCompleted: true };

    const { data: existingAccount, error: accountReadError } = await db
      .from("fin_conta")
      .select("id")
      .eq("company_id", data.companyId)
      .eq("nome", data.accountName)
      .eq("ativo", true)
      .maybeSingle();
    if (accountReadError) throw new Error(accountReadError.message);

    if (!existingAccount) {
      const { error: accountError } = await db.from("fin_conta").insert({
        company_id: data.companyId,
        nome: data.accountName,
        tipo: "corrente",
        fonte: "manual",
        saldo_cents: data.balanceCents,
      });
      if (accountError) throw new Error(accountError.message);
    }

    // This RPC deliberately checks the authenticated actor with auth.uid().
    // Keep the caller-scoped client here; the service-role client has no user
    // identity and would be rejected even after the explicit authorization above.
    const { error: seedError } = await (context.supabase as any).rpc(
      "seed_finance_personal_categories",
      {
      _company_id: data.companyId,
      },
    );
    if (seedError) throw new Error(seedError.message);

    const { error: companyError } = await db
      .from("company")
      .update({
        onboarding_completed: true,
        onboarding_step: 4,
        financeiro_ativo: true,
        finance_profile: { primary_goal: data.goal },
      })
      .eq("id", data.companyId);
    if (companyError) throw new Error(companyError.message);
    return { completed: true, alreadyCompleted: false };
  });

export const getFinanceCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; first: string; last: string }) => {
    const companyId = String(input?.companyId || "").trim();
    const first = String(input?.first || "");
    const last = String(input?.last || "");
    if (!companyId) throw new Error("Conta não informada.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(first) || !/^\d{4}-\d{2}-\d{2}$/.test(last)) {
      throw new Error("Período inválido.");
    }
    return { companyId, first, last };
  })
  .handler(async ({ context, data }): Promise<FinanceCalendarItem[]> => {
    await authorize(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [bills, recurrences] = await Promise.all([
      db
        .from("fin_lancamento")
        .select("id,descricao,valor_cents,tipo,status,vencimento")
        .eq("company_id", data.companyId)
        .gte("vencimento", data.first)
        .lte("vencimento", data.last)
        .neq("status", "cancelado")
        .order("vencimento"),
      db
        .from("fin_recorrencia")
        .select("id,descricao,valor_cents,tipo,proxima_data")
        .eq("company_id", data.companyId)
        .eq("ativo", true)
        .gte("proxima_data", data.first)
        .lte("proxima_data", data.last)
        .order("proxima_data"),
    ]);
    if (bills.error) throw new Error(bills.error.message);
    if (recurrences.error) throw new Error(recurrences.error.message);
    return [
      ...(bills.data || []).map((row: any) => ({
        id: `bill-${row.id}`,
        date: row.vencimento,
        title: row.descricao,
        amountCents: Number(row.valor_cents || 0),
        type: row.tipo,
        status: row.status,
        recurring: false,
      })),
      ...(recurrences.data || []).map((row: any) => ({
        id: `recurrence-${row.id}`,
        date: row.proxima_data,
        title: row.descricao,
        amountCents: Number(row.valor_cents || 0),
        type: row.tipo,
        status: "programado",
        recurring: true,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date)) as FinanceCalendarItem[];
  });
