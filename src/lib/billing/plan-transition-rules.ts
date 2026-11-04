/**
 * Regras puras de aquisição e troca de plano.
 * - Conta nova: Grátis (somente se nunca usou), Basic ou Pro.
 * - Conta existente (Grátis, Basic ou Pro): somente planos pagos —
 *   renovar o mesmo, subir (Basic→Pro) ou descer (Pro→Basic). Nunca volta ao Grátis.
 * - Plano pago só libera acesso após pagamento confirmado.
 */
export type TransitionPlan = { slug: string; is_free?: boolean | null; preco_cents: number };

export function isPaidPlan(plan: TransitionPlan): boolean {
  return !plan.is_free && plan.preco_cents > 0;
}

export function allowedTargetPlans<T extends TransitionPlan>(
  plans: T[],
  opts: { hasCompany: boolean; freeAlreadyUsed?: boolean },
): T[] {
  if (opts.hasCompany) return plans.filter(isPaidPlan);
  return plans.filter((p) => isPaidPlan(p) || (!!p.is_free && !opts.freeAlreadyUsed));
}

export type TransitionKind = "new" | "renew" | "upgrade" | "downgrade";

export function transitionKind(
  current: TransitionPlan | null,
  target: TransitionPlan,
): TransitionKind {
  if (!current || current.is_free) return current ? "upgrade" : "new";
  if (current.slug === target.slug) return "renew";
  return target.preco_cents > current.preco_cents ? "upgrade" : "downgrade";
}

export type AccessCompany = {
  status_cobranca: string | null;
  trial_ate: string | null;
  creditos_saldo?: number | null;
};

/** Conta precisa pagar para usar: teste vencido, sem créditos no teste ou pagamento pendente. */
export function companyNeedsPayment(company: AccessCompany, now = Date.now()): boolean {
  const s = company.status_cobranca;
  if (s === "checkout_pending" || s === "suspenso" || s === "pendente") return true;
  if (s === "trial") {
    if (!company.trial_ate || new Date(company.trial_ate).getTime() <= now) return true;
    if (typeof company.creditos_saldo === "number" && company.creditos_saldo <= 0) return true;
  }
  return false;
}
