// Normaliza payloads de cobrança do MIAnota.
// O único provedor de pagamento suportado pelo sistema é a InfinitePay.

export type BillingEventType =
  | "purchase_approved"
  | "subscription_renewed"
  | "subscription_canceled"
  | "payment_failed"
  | "chargeback"
  | "refunded"
  | "unknown";

export type NormalizedBillingEvent = {
  provider: "infinitepay" | "manual" | (string & {});
  /** Empresa já identificada pelo pedido (InfinitePay); dispensa busca por e-mail. */
  companyId?: string | null;
  eventType: BillingEventType;
  rawEventName: string;
  buyerEmail: string | null;
  /** Nome bruto informado no checkout (normalizado depois). */
  buyerName: string | null;
  /** Telefone bruto informado no checkout (normalizado depois para E.164). */
  buyerPhone: string | null;
  externalSubscriptionId: string | null;
  externalCustomerId: string | null;
  productRef: string | null;
  amountCents: number | null;
  periodEnd: string | null;
};

function lower(s: any): string | null {
  return typeof s === "string" && s.trim() ? s.trim().toLowerCase() : null;
}

function str(s: any): string | null {
  return (typeof s === "string" || typeof s === "number") && String(s).trim()
    ? String(s).trim()
    : null;
}

function pick<T = any>(obj: any, ...paths: string[]): T | null {
  for (const p of paths) {
    const v = p.split(".").reduce<any>((acc, k) => (acc == null ? acc : acc[k]), obj);
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return null;
}

export function normalizeInfinitePay(body: any): NormalizedBillingEvent {
  const customer = body?.customer ?? {};
  return {
    provider: "infinitepay",
    eventType: "purchase_approved",
    rawEventName: str(body?.event) || "infinitepay.paid",
    buyerEmail: lower(pick(customer, "email", "buyer_email") ?? pick(body, "email", "buyer_email")),
    buyerName: str(pick(customer, "name", "full_name") ?? pick(body, "name", "buyer_name")),
    buyerPhone: str(
      pick(customer, "phone_number", "phone", "mobile") ?? pick(body, "phone_number", "phone"),
    ),
    externalSubscriptionId: str(pick(body, "transaction_nsu", "order_nsu", "id")),
    externalCustomerId: str(pick(customer, "id")),
    productRef: str(pick(body, "invoice_slug", "slug")),
    amountCents: typeof body?.paid_amount === "number" ? body.paid_amount : null,
    periodEnd: null,
  };
}

export function normalize(provider: string, body: any): NormalizedBillingEvent {
  if (provider === "infinitepay") {
    return normalizeInfinitePay(body);
  }
  throw new Error(
    `Provedor ${provider} foi descontinuado. O único provedor de pagamentos suportado pelo MIAnota é a InfinitePay.`,
  );
}
