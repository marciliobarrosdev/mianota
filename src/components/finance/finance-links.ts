// Caminhos das 5 áreas do assinante. O painel real (/app) e a demonstração
// (/demo) compartilham as mesmas telas; só os endereços mudam.
export type FinanceArea = "app" | "demo";

const APP_LINKS = {
  overview: "/app/inicio",
  transactions: "/app/movimentacoes",
  planner: "/app/planejamento",
  chat: "/app/marcia",
  settings: "/app/configuracoes",
} as const;

const DEMO_LINKS = {
  overview: "/demo/dashboard",
  transactions: "/demo/movimentacoes",
  planner: "/demo/planejamento",
  chat: "/demo/marcia",
  settings: "/demo/configuracoes",
} as const;

export type FinanceLinks = typeof APP_LINKS | typeof DEMO_LINKS;

export function financeLinks(area: FinanceArea): FinanceLinks {
  return area === "app" ? APP_LINKS : DEMO_LINKS;
}
