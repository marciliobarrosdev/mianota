import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type StripeProduct = {
  id: string;
  name?: string | null;
};

type StripePrice = {
  id: string;
  active?: boolean;
  currency?: string;
  livemode?: boolean;
  unit_amount?: number | null;
  product?: string | StripeProduct;
  recurring?: {
    interval?: "day" | "week" | "month" | "year";
    interval_count?: number;
  } | null;
};

async function assertSuperAdmin(supabase: any) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error || data !== true) throw new Error("Acesso restrito ao proprietário da instalação.");
}

async function stripeSecret() {
  const { resolveIntegration } = await import("./integration-secrets.server");
  const stripe = await resolveIntegration("stripe");
  if (!stripe.secret_key) {
    throw new Error("Conecte o Stripe em Master → Integrações antes de configurar os planos.");
  }
  return stripe.secret_key;
}

async function stripeRequest<T>(
  secretKey: string,
  path: string,
  options?: { body?: URLSearchParams; idempotencyKey?: string },
): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: options?.body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(options?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    body: options?.body,
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error("O Stripe recusou a chave configurada.");
    if (response.status === 403) {
      throw new Error("A chave do Stripe não permite consultar ou criar produtos e preços.");
    }
    throw new Error(payload?.error?.message || "O Stripe não conseguiu concluir esta operação.");
  }
  return payload as T;
}

async function idempotencyKey(scope: string, value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
  return `marcia-${scope}-${hex.slice(0, 48)}`;
}

export type StripeCatalogPrice = {
  id: string;
  productId: string;
  productName: string;
  amountCents: number;
  currency: string;
  interval: "month" | "year";
  intervalCount: number;
  livemode: boolean;
};

/** Lista preços recorrentes diretamente da conta Stripe configurada no Master. */
export const listStripeRecurringPrices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase);
    const secretKey = await stripeSecret();
    const query = new URLSearchParams({ active: "true", type: "recurring", limit: "100" });
    query.append("expand[]", "data.product");
    const result = await stripeRequest<{ data?: StripePrice[] }>(
      secretKey,
      `prices?${query.toString()}`,
    );
    const prices: StripeCatalogPrice[] = (result.data ?? [])
      .filter(
        (price) =>
          price.active !== false &&
          typeof price.unit_amount === "number" &&
          (price.recurring?.interval === "month" || price.recurring?.interval === "year"),
      )
      .map((price) => {
        const product = typeof price.product === "object" ? price.product : null;
        return {
          id: price.id,
          productId: product?.id || String(price.product || ""),
          productName: product?.name?.trim() || "Produto Stripe",
          amountCents: Number(price.unit_amount),
          currency: String(price.currency || "brl").toUpperCase(),
          interval: price.recurring!.interval as "month" | "year",
          intervalCount: Math.max(1, Number(price.recurring?.interval_count || 1)),
          livemode: price.livemode === true,
        };
      })
      .sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));
    return { prices };
  });

/** Cria produto e preço recorrente no Stripe usando os dados do plano da MárcIA. */
export const createStripePlanPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      slug: string;
      name: string;
      description?: string | null;
      amountCents: number;
      currency: string;
      interval: "month" | "year";
    }) => {
      const slug = String(input?.slug || "")
        .trim()
        .toLowerCase();
      const name = String(input?.name || "").trim();
      const description = String(input?.description || "")
        .trim()
        .slice(0, 500);
      const amountCents = Math.round(Number(input?.amountCents || 0));
      const currency = String(input?.currency || "BRL")
        .trim()
        .toLowerCase();
      const interval: "month" | "year" = input?.interval === "year" ? "year" : "month";
      if (!/^[a-z0-9-]{1,60}$/.test(slug)) throw new Error("Informe um slug válido para o plano.");
      if (name.length < 2 || name.length > 250) throw new Error("Informe o nome do plano.");
      if (!Number.isSafeInteger(amountCents) || amountCents <= 0)
        throw new Error("Informe um preço maior que zero.");
      if (!/^[a-z]{3}$/.test(currency)) throw new Error("Informe uma moeda válida, como BRL.");
      return { slug, name, description, amountCents, currency, interval };
    },
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const secretKey = await stripeSecret();

    const productParams = new URLSearchParams({
      name: data.name,
      "metadata[marcia_plan_slug]": data.slug,
    });
    if (data.description) productParams.set("description", data.description);
    const product = await stripeRequest<StripeProduct>(secretKey, "products", {
      body: productParams,
      idempotencyKey: await idempotencyKey("product", data),
    });

    const priceParams = new URLSearchParams({
      product: product.id,
      unit_amount: String(data.amountCents),
      currency: data.currency,
      "recurring[interval]": data.interval,
      "metadata[marcia_plan_slug]": data.slug,
    });
    const price = await stripeRequest<StripePrice>(secretKey, "prices", {
      body: priceParams,
      idempotencyKey: await idempotencyKey("price", {
        productId: product.id,
        amountCents: data.amountCents,
        currency: data.currency,
        interval: data.interval,
      }),
    });

    return {
      price: {
        id: price.id,
        productId: product.id,
        productName: product.name || data.name,
        amountCents: Number(price.unit_amount ?? data.amountCents),
        currency: String(price.currency || data.currency).toUpperCase(),
        interval: data.interval,
        intervalCount: 1,
        livemode: price.livemode === true,
      } satisfies StripeCatalogPrice,
    };
  });
