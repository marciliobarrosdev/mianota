/** Único checkout integrado do sistema; links externos (Kiwify etc.) não têm credenciais aqui. */
export type CheckoutProvider = "infinitepay";
export type CheckoutPlan = { mode: "external"; ready: boolean };
export type CheckoutIntegration = { configured?: boolean; testOk?: boolean } | undefined;

export type CheckoutStatus =
  | { active: true; label: "Checkout de Pagamento Ativo" }
  | { active: false; label: string };

/** A checkout is fully active when saved, tested, and used by at least one ready plan. */
export function checkoutStatus(
  _provider: CheckoutProvider,
  integration: CheckoutIntegration,
  plans: CheckoutPlan[],
): CheckoutStatus {
  if (!integration?.configured) return { active: false, label: "Não configurado" };
  if (!integration.testOk) return { active: false, label: "Falta testar" };
  if (!plans.some((p) => p.ready))
    return { active: false, label: "Nenhum plano usa este checkout" };
  return { active: true, label: "Checkout de Pagamento Ativo" };
}
