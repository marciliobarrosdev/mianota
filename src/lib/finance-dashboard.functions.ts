/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { addDays, daysBetween, sanitizeRange, toIsoDate } from "./finance-period";

export type FinanceDashboardSnapshot = {
  month: string;
  period: { from: string; to: string };
  totals: {
    balanceCents: number;
    receivedCents: number;
    spentCents: number;
    netCents: number;
    pendingIncomeCents: number;
    pendingExpenseCents: number;
    projectedCents: number;
    leftoverCents: number;
  };
  cashflow: Array<{
    date: string;
    label: string;
    incomeCents: number;
    expenseCents: number;
    netCents: number;
  }>;
  categories: Array<{
    id: string;
    name: string;
    color: string;
    amountCents: number;
    share: number;
  }>;
  budgets: Array<{
    id: string;
    categoryId: string;
    name: string;
    color: string;
    limitCents: number;
    spentCents: number;
    percentage: number;
  }>;
  accounts: Array<{
    id: string;
    name: string;
    institution: string | null;
    type: string;
    balanceCents: number;
    color: string;
  }>;
  cards: Array<{
    id: string;
    name: string;
    lastFour: string | null;
    color: string;
    limitCents: number | null;
    invoiceCents: number;
    dueDate: string | null;
  }>;
  goals: Array<{
    id: string;
    name: string;
    targetCents: number;
    savedCents: number;
    deadline: string | null;
    color: string;
    percentage: number;
  }>;
  upcoming: Array<{
    id: string;
    description: string;
    type: "receita" | "despesa";
    amountCents: number;
    dueDate: string;
    status: string;
  }>;
  latest: Array<{
    id: string;
    description: string;
    type: "receita" | "despesa";
    amountCents: number;
    date: string;
    status: string;
    category: string | null;
    categoryColor: string | null;
    source: string;
  }>;
  insight: { title: string; body: string; tone: "positive" | "attention" | "neutral" };
};

export type FinanceCalendarItem = {
  id: string;
  date: string;
  title: string;
  amountCents: number;
  type: "receita" | "despesa";
  status: string;
  recurring: boolean;
};

/** Linha detalhada do extrato (Movimentações). */
export type FinanceTransactionDetail = {
  id: string;
  date: string;
  time: string | null;
  type: "receita" | "despesa";
  description: string;
  merchant: string | null;
  category: string | null;
  categoryColor: string | null;
  amountCents: number;
  paymentMethod: string | null;
  account: string | null;
  card: string | null;
  source: string;
  hasAttachment: boolean;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  note: string | null;
  originalInput: string | null;
  installment: string | null;
};

/** Item do calendário de Planejamento. */
export type FinancePlannerItem = {
  id: string;
  date: string;
  time: string | null;
  title: string;
  amountCents: number;
  type: "receita" | "despesa";
  status: string;
  kind: "movimentacao" | "conta" | "recorrencia";
  recurring: boolean;
  category: string | null;
  paymentMethod: string | null;
  source: string | null;
  note: string | null;
};

function monthBounds(reference = new Date()) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  return {
    key: `${year}-${String(month + 1).padStart(2, "0")}`,
    start: toIsoDate(new Date(year, month, 1)),
    end: toIsoDate(new Date(year, month + 1, 0)),
  };
}

const cents = (value: unknown) => Number(value || 0);

function timeOf(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // ocorrido_em sem hora real é gravado como 12:00 UTC; não mostre hora inventada.
  if (/T12:00:00(\.000)?(Z|\+00:00)$/.test(value)) return null;
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

async function authorize(context: any, companyId: string) {
  const { requireCompanyMemberAccess } = await import("./company-admin-access.server");
  const access = await requireCompanyMemberAccess(context.supabase, context.userId, companyId);
  const { assertCompanyOperational } = await import("./plan-limits.server");
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

    const rows = transactions.data || [];
    const sumWhere = (predicate: (row: any) => boolean) =>
      rows.filter(predicate).reduce((sum: number, row: any) => sum + cents(row.valor_cents), 0);
    const receivedCents = sumWhere((row) => row.tipo === "receita" && row.status === "pago");
    const spentCents = sumWhere((row) => row.tipo === "despesa" && row.status === "pago");
    const pendingIncomeCents = sumWhere(
      (row) => row.tipo === "receita" && ["pendente", "atrasado"].includes(row.status),
    );
    const pendingExpenseCents = sumWhere(
      (row) => row.tipo === "despesa" && ["pendente", "atrasado"].includes(row.status),
    );
    const balanceCents = (accounts.data || []).reduce(
      (sum: number, row: any) => sum + cents(row.saldo_cents),
      0,
    );
    const netCents = receivedCents - spentCents;
    const leftoverCents = netCents + pendingIncomeCents - pendingExpenseCents;

    const categoryById = new Map((categories.data || []).map((row: any) => [row.id, row] as const));
    const categorySpend = new Map<string, number>();
    rows
      .filter((row: any) => row.tipo === "despesa" && row.status === "pago")
      .forEach((row: any) => {
        const key = row.categoria_id || "uncategorized";
        categorySpend.set(key, (categorySpend.get(key) || 0) + cents(row.valor_cents));
      });
    const categoryList = Array.from(categorySpend.entries())
      .map(([id, amountCents]) => {
        const category = categoryById.get(id) as any;
        return {
          id,
          name: category?.nome || "Sem categoria",
          color: category?.cor || "#94A3B8",
          amountCents,
          share: spentCents ? Math.round((amountCents / spentCents) * 100) : 0,
        };
      })
      .sort((first, second) => second.amountCents - first.amountCents)
      .slice(0, 6);

    const totalDays = daysBetween(from, to) + 1;
    const byDay = new Map<string, { income: number; expense: number }>();
    rows
      .filter((row: any) => row.status === "pago")
      .forEach((row: any) => {
        const key = String(row.competencia).slice(0, 10);
        const entry = byDay.get(key) || { income: 0, expense: 0 };
        if (row.tipo === "receita") entry.income += cents(row.valor_cents);
        else entry.expense += cents(row.valor_cents);
        byDay.set(key, entry);
      });
    const cashflow = Array.from({ length: totalDays }, (_, index) => {
      const date = addDays(from, index);
      const entry = byDay.get(date) || { income: 0, expense: 0 };
      return {
        date,
        label: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
        incomeCents: entry.income,
        expenseCents: entry.expense,
        netCents: entry.income - entry.expense,
      };
    });

    const budgetList = (budgets.data || []).map((row: any) => {
      const category = categoryById.get(row.categoria_id) as any;
      const spent = categorySpend.get(row.categoria_id) || 0;
      const limit = cents(row.limite_cents);
      return {
        id: row.id,
        categoryId: row.categoria_id,
        name: category?.nome || "Categoria",
        color: category?.cor || "#7C3AED",
        limitCents: limit,
        spentCents: spent,
        percentage: limit ? Math.round((spent / limit) * 100) : 0,
      };
    });

    const invoiceByCard = new Map(
      (invoices.data || []).map((row: any) => [row.cartao_id, row] as const),
    );
    const topCategory = categoryList[0];
    const projectedCents = balanceCents + pendingIncomeCents - pendingExpenseCents;
    const insight = topCategory
      ? {
          title: `${topCategory.name} lidera seus gastos`,
          body: `${topCategory.share}% das saídas do período estão nessa categoria. Peça à MárcIA para comparar com outros períodos.`,
          tone: topCategory.share >= 40 ? ("attention" as const) : ("neutral" as const),
        }
      : leftoverCents >= 0
        ? {
            title: "Sua visão financeira está pronta para começar",
            body: "Registre o primeiro gasto por voz, texto ou foto. A visão do mês se atualiza automaticamente.",
            tone: "positive" as const,
          }
        : {
            title: "Há mais compromissos do que entradas no período",
            body: "Revise as próximas contas com a MárcIA antes de assumir uma nova despesa.",
            tone: "attention" as const,
          };

    return {
      month: budgetMonth,
      period: { from, to },
      totals: {
        balanceCents,
        receivedCents,
        spentCents,
        netCents,
        pendingIncomeCents,
        pendingExpenseCents,
        projectedCents,
        leftoverCents,
      },
      cashflow,
      categories: categoryList,
      budgets: budgetList,
      accounts: (accounts.data || []).map((row: any) => ({
        id: row.id,
        name: row.nome,
        institution: row.instituicao,
        type: row.tipo,
        balanceCents: cents(row.saldo_cents),
        color: row.cor,
      })),
      cards: (cards.data || []).map((row: any) => {
        const invoice: any = invoiceByCard.get(row.id);
        return {
          id: row.id,
          name: row.nome,
          lastFour: row.ultimos_quatro,
          color: row.cor,
          limitCents: row.limite_cents == null ? null : cents(row.limite_cents),
          invoiceCents: cents(invoice?.total_cents),
          dueDate: invoice?.vencimento_em || null,
        };
      }),
      goals: (goals.data || []).map((row: any) => ({
        id: row.id,
        name: row.nome,
        targetCents: cents(row.objetivo_cents),
        savedCents: cents(row.acumulado_cents),
        deadline: row.prazo,
        color: row.cor,
        percentage: cents(row.objetivo_cents)
          ? Math.min(
              100,
              Math.round((cents(row.acumulado_cents) / cents(row.objetivo_cents)) * 100),
            )
          : 0,
      })),
      upcoming: (upcomingRows.data || []).map((row: any) => ({
        id: row.id,
        description: row.descricao,
        type: row.tipo,
        amountCents: cents(row.valor_cents),
        dueDate: row.vencimento,
        status: row.status,
      })),
      latest: rows.slice(0, 8).map((row: any) => {
        const category = categoryById.get(row.categoria_id) as any;
        return {
          id: row.id,
          description: row.descricao,
          type: row.tipo,
          amountCents: cents(row.valor_cents),
          date: row.competencia,
          status: row.status,
          category: category?.nome || null,
          categoryColor: category?.cor || null,
          source: row.fonte || "manual",
        };
      }),
      insight,
    };
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
            "id,tipo,descricao,estabelecimento,valor_cents,status,vencimento,pago_em,competencia,ocorrido_em,categoria_id,conta_id,cartao_id,forma_pagamento,fonte,anexo_url,observacao,original_input,parcela_numero,parcela_total,created_at",
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

function nextOccurrence(date: string, frequency: string): string {
  const d = new Date(`${date}T12:00:00`);
  if (frequency === "semanal") d.setDate(d.getDate() + 7);
  else if (frequency === "quinzenal") d.setDate(d.getDate() + 14);
  else if (frequency === "anual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return toIsoDate(d);
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
    const { first, last } = data;
    const [entries, recurrences, categories] = await Promise.all([
      db
        .from("fin_lancamento")
        .select(
          "id,descricao,valor_cents,tipo,status,vencimento,pago_em,competencia,ocorrido_em,categoria_id,forma_pagamento,fonte,observacao,recorrencia_id",
        )
        .eq("company_id", data.companyId)
        .neq("status", "cancelado")
        .or(
          `and(vencimento.gte.${first},vencimento.lte.${last}),and(competencia.gte.${first},competencia.lte.${last})`,
        )
        .limit(3000),
      db
        .from("fin_recorrencia")
        .select("id,descricao,valor_cents,tipo,proxima_data,frequencia,termina_em,categoria_id")
        .eq("company_id", data.companyId)
        .eq("ativo", true)
        .lte("proxima_data", last),
      db.from("fin_categoria").select("id,nome").eq("company_id", data.companyId),
    ]);
    const failed = [entries, recurrences, categories].find((r) => r.error)?.error;
    if (failed) throw new Error(failed.message);
    const categoryName = new Map((categories.data || []).map((r: any) => [r.id, r.nome] as const));

    const items: FinancePlannerItem[] = [];
    const recurrenceDates = new Set<string>();
    for (const row of entries.data || []) {
      const paid = row.status === "pago";
      const date = paid ? row.pago_em || row.competencia : row.vencimento;
      if (!date || date < first || date > last) continue;
      if (row.recorrencia_id) recurrenceDates.add(`${row.recorrencia_id}:${date}`);
      items.push({
        id: `entry-${row.id}`,
        date,
        time: paid ? timeOf(row.ocorrido_em) : null,
        title: row.descricao,
        amountCents: cents(row.valor_cents),
        type: row.tipo,
        status: row.status,
        kind: paid ? "movimentacao" : "conta",
        recurring: Boolean(row.recorrencia_id),
        category: (categoryName.get(row.categoria_id) as string) || null,
        paymentMethod: row.forma_pagamento || null,
        source: row.fonte || null,
        note: row.observacao || null,
      });
    }
    for (const row of recurrences.data || []) {
      let date = row.proxima_data as string;
      let guard = 0;
      while (date <= last && guard < 60) {
        guard += 1;
        if (row.termina_em && date > row.termina_em) break;
        if (date >= first && !recurrenceDates.has(`${row.id}:${date}`)) {
          items.push({
            id: `recurrence-${row.id}-${date}`,
            date,
            time: null,
            title: row.descricao,
            amountCents: cents(row.valor_cents),
            type: row.tipo,
            status: "pendente",
            kind: "recorrencia",
            recurring: true,
            category: (categoryName.get(row.categoria_id) as string) || null,
            paymentMethod: null,
            source: "recorrencia",
            note: `Repete ${row.frequencia || "mensal"}`,
          });
        }
        date = nextOccurrence(date, row.frequencia);
      }
    }
    return items.sort(
      (a, b) => a.date.localeCompare(b.date) || String(a.time || "99").localeCompare(String(b.time || "99")),
    );
  });

const PAYMENT_METHODS = new Set(["pix", "cartao", "dinheiro", "transferencia", "boleto", "outro"]);

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
