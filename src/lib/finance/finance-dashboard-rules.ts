/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Regras puras do painel financeiro: totais do período, gastos por categoria,
 * fluxo diário, orçamentos, metas e o calendário de Planejamento (com as
 * recorrências expandidas). Recebem linhas já lidas do banco; não acessam rede.
 */
import { addDays, daysBetween, toIsoDate } from "@/lib/finance/finance-period";
import type { FinanceDashboardSnapshot, FinancePlannerItem } from "@/lib/finance/finance-dashboard-types";

/** Resultado de uma leitura do banco (`{ data }`), como chega do cliente. */
export type DbRows = { data: any[] | null };

/** Limites do mês de referência (AAAA-MM, primeiro e último dia). */
export function monthBounds(reference = new Date()) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  return {
    key: `${year}-${String(month + 1).padStart(2, "0")}`,
    start: toIsoDate(new Date(year, month, 1)),
    end: toIsoDate(new Date(year, month + 1, 0)),
  };
}

export const cents = (value: unknown) => Number(value || 0);

export function timeOf(value: unknown): string | null {
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

/** Próxima data de uma recorrência (semanal, quinzenal, anual ou mensal). */
export function nextOccurrence(date: string, frequency: string): string {
  const d = new Date(`${date}T12:00:00`);
  if (frequency === "semanal") d.setDate(d.getDate() + 7);
  else if (frequency === "quinzenal") d.setDate(d.getDate() + 14);
  else if (frequency === "anual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return toIsoDate(d);
}

/**
 * Monta a visão do período a partir das linhas lidas. Saldo = soma das contas;
 * "sobra" = entradas pagas − saídas pagas + a receber − a pagar; o insight
 * destaca a maior categoria (atenção a partir de 40% das saídas).
 */
export function buildDashboardSnapshot(
  source: {
    transactions: DbRows;
    upcomingRows: DbRows;
    accounts: DbRows;
    categories: DbRows;
    budgets: DbRows;
    cards: DbRows;
    invoices: DbRows;
    goals: DbRows;
  },
  from: string,
  to: string,
  budgetMonth: string,
): FinanceDashboardSnapshot {
  const { transactions, upcomingRows, accounts, categories, budgets, cards, invoices, goals } = source;
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
        body: `${topCategory.share}% das saídas do período estão nessa categoria. Peça à MIA para comparar com outros períodos.`,
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
          body: "Revise as próximas contas com a MIA antes de assumir uma nova despesa.",
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
}

/**
 * Junta lançamentos e recorrências do período. Ocorrências de recorrência já
 * lançadas (pagas, adiadas, editadas ou excluídas) não reaparecem como previstas;
 * cada recorrência expande no máximo 60 datas.
 */
export function plannerItemsFromRows(
  source: { entries: DbRows; recurrences: DbRows; categories: DbRows },
  first: string,
  last: string,
): FinancePlannerItem[] {
  const { entries, recurrences, categories } = source;
  const categoryName = new Map((categories.data || []).map((r: any) => [r.id, r.nome] as const));

  const items: FinancePlannerItem[] = [];
  const recurrenceDates = new Set<string>();
  for (const row of entries.data || []) {
    const paid = row.status === "pago";
    const date = paid ? row.pago_em || row.competencia : row.vencimento;
    if (row.recorrencia_id) {
      // Ocorrências já lançadas (pagas, adiadas, editadas ou excluídas) não reaparecem como previstas.
      for (const d of [date, row.vencimento, row.metadata?.recurrence_date]) {
        if (d) recurrenceDates.add(`${row.recorrencia_id}:${d}`);
      }
    }
    if (row.status === "cancelado") continue;
    if (!date || date < first || date > last) continue;
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
      entryId: row.id,
      recurrenceId: row.recorrencia_id || null,
      categoryId: row.categoria_id || null,
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
          paymentMethod: row.forma_pagamento || null,
          source: "recorrencia",
          note: `Repete ${row.frequencia || "mensal"}`,
          entryId: null,
          recurrenceId: row.id,
          categoryId: row.categoria_id || null,
        });
      }
      date = nextOccurrence(date, row.frequencia);
    }
  }
  return items.sort(
    (a, b) => a.date.localeCompare(b.date) || String(a.time || "99").localeCompare(String(b.time || "99")),
  );
}
