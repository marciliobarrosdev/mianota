/** Planos que precisam de link de checkout: só os pagos (o Gratuito não cobra). */
export type ReadinessPlan = { id: unknown; nome?: unknown; is_free?: boolean | null; checkout_url?: string | null };

export function paidPlansForCheckout(plans: ReadinessPlan[]) {
  return plans
    .filter((p) => !p.is_free)
    .map((p) => {
      const ready = /^https?:\/\//i.test(String(p.checkout_url || ""));
      return {
        id: String(p.id),
        name: String(p.nome || "Plano"),
        mode: "external" as const,
        ready,
        detail: ready ? "Link de checkout informado" : "Falta informar o link de checkout",
      };
    });
}
