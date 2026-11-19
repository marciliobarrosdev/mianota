/**
 * Formatos devolvidos pelo painel financeiro (Início), pelo extrato (Movimentações)
 * e pelo calendário de Planejamento. Só tipos: seguro para o navegador e o servidor.
 */
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
  categoryId?: string | null;
  attachmentUrl?: string | null;
  tags?: string[];
  splits?: { categoryId: string | null; category: string | null; color: string | null; amountCents: number }[];
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
  /** Lançamento real (quando existe) e recorrência de origem, usados pelas ações do dia. */
  entryId?: string | null;
  recurrenceId?: string | null;
  categoryId?: string | null;
};
