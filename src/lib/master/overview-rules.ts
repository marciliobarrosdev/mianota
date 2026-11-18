/** Regras puras da Visão geral do Master (período e indicadores). */

/** Atalhos de período, em dias. */
export const PRESETS = [7, 30, 90, 365] as const;

/** Data local (AAAA-MM-DD) de `daysAgo` dias atrás; corrige o fuso para não virar o dia. */
export function localDate(daysAgo = 0, now: Date = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/** Rótulo do atalho de período ("7d", "30d", "1 ano"). */
export function presetLabel(days: number) {
  return days === 365 ? "1 ano" : `${days}d`;
}

/** Dia do período no formato brasileiro; meio-dia evita mudar de dia por fuso. */
export function formatRangeDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
}

/** Percentual (arredondado) de assinantes ativas sobre o total; 0 sem base. */
export function conversionPercent(stats: { total: number; ativas: number } | null | undefined) {
  if (!stats?.total) return 0;
  return Math.round((stats.ativas / stats.total) * 100);
}
