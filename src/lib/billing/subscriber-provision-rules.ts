export type ProvisionPlan = { ativo: boolean; is_free?: boolean | null; free_days?: number | null };

/** Plans offered in Master → Novo assinante: every active plan. */
export function selectablePlans<T extends ProvisionPlan>(plans: T[]): T[] {
  return plans.filter((p) => p.ativo);
}

/** Free plans always use their own day limit; paid plans use the typed trial (0–90). */
export function provisionTrialDays(plan: ProvisionPlan, requested: number): number {
  if (plan.is_free) return Math.max(1, Math.min(365, Math.floor(plan.free_days ?? 1)));
  return Math.max(0, Math.min(90, Math.floor(requested || 0)));
}

/** An account may receive the free plan only once: any prior usage record blocks it. */
export function freePlanAlreadyUsed(usageRows: unknown[]): boolean {
  return usageRows.length > 0;
}
