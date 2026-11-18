/** Tipos e formatação compartilhados pelos blocos do painel financeiro. */
import type { FinanceDashboardSnapshot } from "@/lib/finance/finance-dashboard.functions";

export const money = (valueCents: number) =>
  (valueCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type FinanceOverviewData = Pick<
  FinanceDashboardSnapshot,
  "period" | "totals" | "cashflow" | "categories" | "upcoming" | "latest" | "insight"
> &
  Partial<Pick<FinanceDashboardSnapshot, "budgets" | "goals">>;

export type OverviewActions = {
  pay?: (id: string) => Promise<void>;
  postpone?: (id: string, days: number) => Promise<void>;
  downloadPdf?: () => Promise<void>;
  sendPdf?: () => Promise<void>;
};

export const todayIso = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
