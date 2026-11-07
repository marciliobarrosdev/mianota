// Caminhos das áreas reais do assinante.
export const FINANCE_LINKS = {
  overview: "/app/inicio",
  transactions: "/app/movimentacoes",
  planner: "/app/planejamento",
  chat: "/app/marcia",
  settings: "/app/configuracoes",
} as const;

export type FinanceLinks = typeof FINANCE_LINKS;
export function financeLinks(_area: "app"): FinanceLinks {
  return FINANCE_LINKS;
}
