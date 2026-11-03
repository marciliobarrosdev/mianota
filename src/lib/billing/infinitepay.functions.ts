import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildOrderNsu } from "@/lib/billing/infinitepay-rules";

function origin() {
  const req = getRequest();
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

/** Cria um link de pagamento InfinitePay para o plano. url=null quando não configurado. */
export const createInfinitePayCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planSlug: string; companyId: string }) => {
    const planSlug = String(d?.planSlug || "").trim().toLowerCase();
    const companyId = String(d?.companyId || "").trim();
    if (!/^[a-z0-9-]{1,60}$/.test(planSlug)) throw new Error("Plano inválido.");
    return { planSlug, companyId };
  })
  .handler(async ({ context, data }): Promise<{ url: string | null }> => {
    const { resolveIntegration } = await import("@/lib/common/integration-secrets.server");
    const ip = await resolveIntegration("infinitepay");

    const { requireCompanyAdminAccess } = await import("@/lib/common/company-admin-access.server");
    const access = await requireCompanyAdminAccess(context.supabase, context.userId, data.companyId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plan } = await (supabaseAdmin as any)
      .from("plan")
      .select("slug,nome,preco_cents,ativo,checkout_url")
      .eq("slug", data.planSlug)
      .maybeSingle();
    if (!plan?.ativo || !plan.preco_cents) throw new Error("Plano indisponível.");

    // Link fixo do plano (Master) ou reserva Link 1/Link 2.
    const { checkoutLinkForPlan } = await import("@/lib/billing/infinitepay-rules");
    const fixed = checkoutLinkForPlan(plan, ip);
    if (fixed) return { url: fixed };
    if (!ip.handle) return { url: null };

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const base = origin();
    const body: Record<string, unknown> = {
      handle: ip.handle.replace(/^\$/, ""),
      order_nsu: buildOrderNsu(access.companyId, plan.slug),
      redirect_url: `${base}/app/sucesso`,
      webhook_url: `${base}/api/public/billing/infinitepay`,
      items: [{ quantity: 1, price: plan.preco_cents, description: `Plano ${plan.nome} - mensal` }],
    };
    const email = authUser?.user?.email;
    if (email) body.customer = { email };

    const res = await fetch("https://api.infinitepay.io/invoices/public/checkout/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ip.api_key ? { Authorization: `Bearer ${ip.api_key}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.url) {
      console.error("[infinitepay.link]", res.status, JSON.stringify(json).slice(0, 300));
      throw new Error("Não foi possível abrir o pagamento. Tente novamente.");
    }
    return { url: String(json.url) };
  });
