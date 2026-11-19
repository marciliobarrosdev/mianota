/**
 * Textos de dias grátis na escolha de plano. Usa só o `trial_days` salvo no Master;
 * nunca um número presumido.
 */
export type TrialPlan = { nome: string; trial_days?: number | null } | null | undefined;

export function trialDays(plan: TrialPlan): number {
  const days = Number(plan?.trial_days ?? 0);
  return Number.isFinite(days) && days > 0 ? Math.floor(days) : 0;
}

export function startButtonLabel(plan: TrialPlan): string {
  if (!plan) return "Escolha seu plano";
  const days = trialDays(plan);
  return days > 0 ? `Começar ${days} dias grátis` : `Assinar ${plan.nome}`;
}

export function trialBadgeText(plan: TrialPlan): string {
  const days = trialDays(plan);
  return days > 0 ? `${days} dias grátis sem cartão` : "Escolha seu plano";
}
