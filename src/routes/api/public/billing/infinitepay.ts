import { createFileRoute } from "@tanstack/react-router";
import { applyEvent } from "@/lib/billing/apply.server";
import {
  INFINITEPAY_PLAN_PRICES_CENTS,
  isPaymentAcceptable,
  parseOrderNsu,
} from "@/lib/billing/infinitepay-rules";

// InfinitePay não assina o webhook: cada aviso é confirmado na própria InfinitePay
// (payment_check) antes de liberar acesso. 200 = ok; 400 = InfinitePay reenvia.
export const Route = createFileRoute("/api/public/billing/infinitepay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response("json inválido", { status: 400 });
        }
        const order = parseOrderNsu(body?.order_nsu);
        const transactionNsu = typeof body?.transaction_nsu === "string" ? body.transaction_nsu : "";
        const slug = typeof body?.invoice_slug === "string" ? body.invoice_slug : "";
        // Aviso que não é nosso: confirma para não ficar reenviando.
        if (!order || !transactionNsu || !slug) return Response.json({ ok: true, ignored: true });

        try {
          const { resolveIntegration } = await import("@/lib/integration-secrets.server");
          const ip = await resolveIntegration("infinitepay");
          if (!ip.handle) throw new Error("InfinitePay não configurada");

          const checkRes = await fetch(
            "https://api.infinitepay.io/invoices/public/checkout/payment_check",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                handle: ip.handle.replace(/^\$/, ""),
                order_nsu: body.order_nsu,
                transaction_nsu: transactionNsu,
                slug,
              }),
            },
          );
          const check: any = await checkRes.json().catch(() => ({}));
          if (!checkRes.ok) throw new Error(`payment_check ${checkRes.status}`);

          const { getAdmin } = await import("@/lib/billing/apply.server");
          const admin: any = await getAdmin();
          const { data: plan } = await admin
            .from("plan")
            .select("slug,preco_cents")
            .eq("slug", order.planSlug)
            .maybeSingle();
          const expected = INFINITEPAY_PLAN_PRICES_CENTS[order.planSlug] ?? plan?.preco_cents;
          if (!plan || !expected || !isPaymentAcceptable(check, expected)) {
            return Response.json({ ok: true, ignored: "pagamento não confirmado" });
          }

          // E-mail do responsável pela empresa (para histórico/onboarding).
          const { data: cu } = await admin
            .from("company_user")
            .select("user_id")
            .eq("company_id", order.companyId)
            .eq("ativo", true)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          let email: string | null = null;
          if (cu?.user_id) {
            const { data: u } = await admin.auth.admin.getUserById(cu.user_id);
            email = u?.user?.email ?? null;
          }
          if (!email) throw new Error("empresa sem responsável");

          const periodEnd = new Date(Date.now() + 30 * 86400000).toISOString();
          await applyEvent(
            {
              provider: "infinitepay",
              eventType: "purchase_approved",
              rawEventName: "infinitepay.paid",
              companyId: order.companyId,
              buyerEmail: email,
              buyerName: null,
              buyerPhone: null,
              externalSubscriptionId: transactionNsu,
              externalCustomerId: null,
              productRef: order.planSlug,
              amountCents: Number(check.paid_amount ?? check.amount) || null,
              periodEnd,
            },
            `infinitepay:${transactionNsu}`,
          );
          return Response.json({ ok: true });
        } catch (e) {
          console.error("[infinitepay.webhook]", e instanceof Error ? e.message : e);
          return new Response("erro", { status: 400 });
        }
      },
    },
  },
});
