// Regras puras da tela "Falar com a MIA" (sem acesso a banco).

/** Janela em que um lançamento criado pela MIA pode ser desfeito. */
export const UNDO_WINDOW_MINUTES = 10;

export function canUndo(executedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!executedAt) return false;
  const at = new Date(executedAt).getTime();
  if (!Number.isFinite(at)) return false;
  const elapsed = now.getTime() - at;
  return elapsed >= 0 && elapsed <= UNDO_WINDOW_MINUTES * 60_000;
}

export const DEFAULT_SUGGESTIONS = [
  "Gastei R$ 84,90 no mercado pelo Pix",
  "Recebi R$ 3.200 de salário hoje",
  "Conta de luz de R$ 180 vence dia 15",
  "Quanto eu gastei este mês?",
];

export type SuggestionContext = {
  today: string; // YYYY-MM-DD
  upcoming: Array<{ description: string; dueDate: string; type: "receita" | "despesa" }>;
  budgets: Array<{ name: string; percentage: number }>;
};

/** Sugestões que mudam com a situação do mês; completa com as padrão até 4. */
export function contextualSuggestions(ctx: SuggestionContext): string[] {
  const out: string[] = [];
  const dueToday = ctx.upcoming.find((u) => u.type === "despesa" && u.dueDate === ctx.today);
  if (dueToday) out.push(`Paguei ${dueToday.description} hoje`);
  const overdue = ctx.upcoming.find((u) => u.type === "despesa" && u.dueDate < ctx.today);
  if (overdue) out.push(`O que está vencido?`);
  const hot = [...ctx.budgets].sort((a, b) => b.percentage - a.percentage)[0];
  if (hot && hot.percentage >= 80) out.push(`Quanto ainda posso gastar com ${hot.name}?`);
  const day = Number(ctx.today.slice(8, 10));
  if (day >= 25) out.push("Como fecho o mês?");
  for (const s of DEFAULT_SUGGESTIONS) {
    if (out.length >= 4) break;
    if (!out.includes(s)) out.push(s);
  }
  return out.slice(0, 4);
}
