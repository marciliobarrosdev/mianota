// Regras puras da integração InfinitePay (sem rede), testadas em tests/infinitepay.test.ts.
// Preços e links vêm dos planos no banco (editáveis em /master/planos).

export type PlanPrice = { slug: string; preco_cents: number; ativo?: boolean };

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
  if (check?.paid !== true || !(expectedCents > 0)) return false;
  const paid = Number(check.paid_amount ?? check.amount);
  return Number.isFinite(paid) && paid >= expectedCents;
}

export function isInfinitePayLink(url: unknown): boolean {
  return typeof url === "string" && /^https:\/\/checkout\.infinitepay\.io\/\S+$/.test(url.trim());
}

/** Link do plano (Master) tem prioridade; reserva: Link 1 = starter, Link 2 = pro. */
export function checkoutLinkForPlan(
  plan: { slug: string; checkout_url?: string | null },
  envLinks: { checkout_link?: string; checkout_link_2?: string },
): string | null {
  if (isInfinitePayLink(plan.checkout_url)) return plan.checkout_url!.trim();
  const fallback =
    plan.slug === "starter" ? envLinks.checkout_link : plan.slug === "pro" ? envLinks.checkout_link_2 : "";
  return fallback && /^https:\/\//.test(fallback) ? fallback : null;
}

/** Plano ativo cujo preço atual é exatamente o valor pago; ambíguo ou ausente = null. */
export function planSlugForAmount(cents: unknown, plans: PlanPrice[]): string | null {
  const v = Number(cents);
  const hits = plans.filter((p) => p.ativo !== false && p.preco_cents > 0 && p.preco_cents === v);
  return hits.length === 1 ? hits[0].slug : null;
}

/** Slugs de planos ativos que compartilham preço (o webhook não saberia distinguir). */
export function duplicatePricePlans(plans: PlanPrice[]): string[] {
  const active = plans.filter((p) => p.ativo !== false && p.preco_cents > 0);
  return active
    .filter((p) => active.some((o) => o.slug !== p.slug && o.preco_cents === p.preco_cents))
    .map((p) => p.slug);
}

/** E-mail do comprador no aviso da InfinitePay (campos variam). */
export function payerEmail(body: any): string | null {
  const v =
    body?.customer?.email ?? body?.payer_email ?? body?.customer_email ?? body?.email ?? body?.payer?.email;
  return typeof v === "string" && v.includes("@") ? v.trim().toLowerCase() : null;
}
