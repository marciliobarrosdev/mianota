import { createFileRoute } from "@tanstack/react-router";
import { applyEvent } from "@/lib/billing/apply.server";
import {
  INFINITEPAY_PLAN_PRICES_CENTS,
  isPaymentAcceptable,
  parseOrderNsu,
  payerEmail,
  planSlugForAmount,
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
        const orderNsu = typeof body?.order_nsu === "string" ? body.order_nsu : "";
        const order = parseOrderNsu(orderNsu);
        const transactionNsu = typeof body?.transaction_nsu === "string" ? body.transaction_nsu : "";
        const slug = typeof body?.invoice_slug === "string" ? body.invoice_slug : "";
        // Aviso que não é nosso: confirma para não ficar reenviando.
        if (!orderNsu || !transactionNsu || !slug) return Response.json({ ok: true, ignored: true });

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
                order_nsu: orderNsu,
                transaction_nsu: transactionNsu,
                slug,
              }),
            },
          );
          const check: any = await checkRes.json().catch(() => ({}));
          if (!checkRes.ok) throw new Error(`payment_check ${checkRes.status}`);

          const { getAdmin } = await import("@/lib/billing/apply.server");
          const admin: any = await getAdmin();
          const paidCents = Number(check.paid_amount ?? check.amount ?? body.paid_amount ?? body.amount);
          // Link gerado traz empresa+plano; link fixo: plano pelo valor e empresa pelo e-mail.
          const planSlug = order?.planSlug ?? planSlugForAmount(paidCents);
          if (!planSlug) return Response.json({ ok: true, ignored: "valor sem plano" });
          const expected = INFINITEPAY_PLAN_PRICES_CENTS[planSlug];
          if (!expected || !isPaymentAcceptable(check, expected)) {
            return Response.json({ ok: true, ignored: "pagamento não confirmado" });
          }

          let email: string | null = order ? null : payerEmail(body);
          if (order) {
            const { data: cu } = await admin
              .from("company_user")
              .select("user_id")
              .eq("company_id", order.companyId)
              .eq("ativo", true)
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();
            if (cu?.user_id) {
              const { data: u } = await admin.auth.admin.getUserById(cu.user_id);
              email = u?.user?.email ?? null;
            }
            if (!email) throw new Error("empresa sem responsável");
          }

          const periodEnd = new Date(Date.now() + 30 * 86400000).toISOString();
          await applyEvent(
            {
              provider: "infinitepay",
              eventType: "purchase_approved",
              rawEventName: "infinitepay.paid",
              companyId: order?.companyId ?? null,
              buyerEmail: email,
              buyerName: null,
              buyerPhone: typeof body?.customer?.phone_number === "string" ? body.customer.phone_number : null,
              externalSubscriptionId: transactionNsu,
              externalCustomerId: null,
              productRef: planSlug,
              amountCents: paidCents || null,
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
