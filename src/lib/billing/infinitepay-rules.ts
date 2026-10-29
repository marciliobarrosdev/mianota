// Regras puras da integração InfinitePay (sem rede), testadas em tests/infinitepay.test.ts.

/** Valores mensais combinados com o dono (centavos), por slug do plano. */
export const INFINITEPAY_PLAN_PRICES_CENTS: Record<string, number> = {
  starter: 2990,
  pro: 4990,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pedido = empresa + plano + instante. Formato: <companyId>.<slug>.<ts> */
export function buildOrderNsu(companyId: string, planSlug: string, now = Date.now()): string {
  return `${companyId}.${planSlug}.${now.toString(36)}`;
}

export function parseOrderNsu(orderNsu: unknown): { companyId: string; planSlug: string } | null {
  if (typeof orderNsu !== "string") return null;
  const [companyId, planSlug, ts, ...rest] = orderNsu.split(".");
  if (rest.length || !ts || !UUID.test(companyId || "") || !/^[a-z0-9-]{1,60}$/.test(planSlug || ""))
    return null;
  return { companyId, planSlug };
}

/** Só libera acesso com pagamento confirmado e valor pago >= preço do plano. */
export function isPaymentAcceptable(
  check: { paid?: unknown; paid_amount?: unknown; amount?: unknown },
  expectedCents: number,
): boolean {
  if (check?.paid !== true) return false;
  const paid = Number(check.paid_amount ?? check.amount);
  return Number.isFinite(paid) && paid >= expectedCents;
}

/** Link fixo de checkout de cada plano: Link 1 = starter, Link 2 = pro. */
export function checkoutLinkForPlan(
  planSlug: string,
  links: { checkout_link?: string; checkout_link_2?: string },
): string | null {
  const link =
    planSlug === "starter" ? links.checkout_link : planSlug === "pro" ? links.checkout_link_2 : "";
  return link && /^https:\/\//.test(link) ? link : null;
}

/** Plano pelo valor pago (links fixos não carregam a empresa). */
export function planSlugForAmount(cents: unknown): string | null {
  const v = Number(cents);
  for (const [slug, price] of Object.entries(INFINITEPAY_PLAN_PRICES_CENTS)) {
    if (v === price) return slug;
  }
  return null;
}

/** E-mail do comprador no aviso da InfinitePay (campos variam). */
export function payerEmail(body: any): string | null {
  const v =
    body?.customer?.email ?? body?.payer_email ?? body?.customer_email ?? body?.email ?? body?.payer?.email;
  return typeof v === "string" && v.includes("@") ? v.trim().toLowerCase() : null;
}
