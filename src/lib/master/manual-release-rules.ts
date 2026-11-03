/** Regras puras da "Liberação do Super Administrador" (Master → Assinantes). */
export type ReleasePlan = { is_free?: boolean | null; free_days?: number | null };

const DAY = 86_400_000;

/** Dias liberados: gratuito usa o limite do plano; pago usa o informado (1–365, padrão 30). */
export function releaseDays(plan: ReleasePlan, requested: number | null | undefined): number {
  if (plan.is_free) return Math.max(1, Math.min(365, Math.floor(plan.free_days ?? 1)));
  const n = Math.floor(Number(requested));
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(365, n);
}

/** Vencimento: soma ao vencimento atual se ainda vale; senão conta a partir de agora. */
export function releaseUntil(days: number, currentEnd: string | null | undefined, now = Date.now()): string {
  const cur = currentEnd ? new Date(currentEnd).getTime() : NaN;
  const base = Number.isFinite(cur) && cur > now ? cur : now;
  return new Date(base + days * DAY).toISOString();
}

/** A liberação só é aceita com a confirmação explícita marcada. */
export function releaseConfirmationError(confirmed: boolean): string | null {
  return confirmed ? null : "Marque \"Liberação do Super Administrador\" para confirmar.";
}
