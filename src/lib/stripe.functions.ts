import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function origin() {
  const req = getRequest();
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

/** Cria uma sessão de Stripe Checkout (assinatura) para a empresa do usuário. */
export const createStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { planSlug: string; companyId: string }) => {
    const planSlug = String(d?.planSlug || "").trim().toLowerCase();
    const companyId = String(d?.companyId || "").trim();
    if (!/^[a-z0-9-]{1,60}$/.test(planSlug)) throw new Error("Plano inválido.");
    return { planSlug, companyId };
  })
  .handler(async ({ context, data }) => {
    const { requireCompanyAdminAccess } = await import("./company-admin-access.server");
    const access = await requireCompanyAdminAccess(context.supabase, context.userId, data.companyId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plan } = await (supabaseAdmin as any)
      .from("plan")
      .select("id,slug,trial_days,stripe_price_id,checkout_mode,ativo")
      .eq("slug", data.planSlug)
      .maybeSingle();
    if (!plan?.ativo) throw new Error("Plano indisponível.");
    if (plan.checkout_mode !== "stripe" || !plan.stripe_price_id)
      throw new Error("Este plano não usa o pagamento integrado.");

    const { resolveIntegration } = await import("./integration-secrets.server");
    const stripe = await resolveIntegration("stripe");
    if (!stripe.secret_key) throw new Error("Pagamento ainda não configurado. Avise o administrador.");

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = authUser?.user?.email || "";

    const base = origin();
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("line_items[0][price]", plan.stripe_price_id);
    params.set("line_items[0][quantity]", "1");
    if (email) params.set("customer_email", email);
    params.set("client_reference_id", access.companyId);
    // Telefone do comprador para o onboarding de WhatsApp pós-compra.
    params.set("phone_number_collection[enabled]", "true");
    params.set("metadata[company_id]", access.companyId);
    params.set("metadata[plan_id]", plan.id);
    params.set("metadata[plan_slug]", plan.slug);
    params.set("subscription_data[metadata][company_id]", access.companyId);
    params.set("subscription_data[metadata][plan_id]", plan.id);
    params.set("subscription_data[metadata][plan_slug]", plan.slug);
    if (Number(plan.trial_days) > 0)
      params.set("subscription_data[trial_period_days]", String(Math.min(730, plan.trial_days)));
    params.set("success_url", `${base}/app/checkout?stripe=sucesso`);
    params.set("cancel_url", `${base}/app/checkout?stripe=cancelado`);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripe.secret_key}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `${access.companyId}:${plan.id}:${Math.floor(Date.now() / 60000)}`,
      },
      body: params,
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok || !body?.url) {
      console.error("[stripe] checkout falhou", res.status, body?.error?.code || "");
      throw new Error("Não foi possível abrir o pagamento agora. Tente novamente em instantes.");
    }
    return { url: String(body.url) };
  });
