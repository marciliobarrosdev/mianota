import { createFileRoute } from "@tanstack/react-router";

// Webhook do Stripe. A assinatura (Stripe-Signature) é validada com o segredo
// salvo em Master → Integrações antes de qualquer escrita.

function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verify(raw: string, header: string, secret: string) {
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)));
  return sigs.some((s) => safeEqual(s, expected));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapStatus(s: string): { sub: string; company: string } {
  switch (s) {
    case "active":
    case "trialing":
      return { sub: s, company: "ativo" };
    case "past_due":
    case "unpaid":
    case "incomplete":
      return { sub: "past_due", company: "pendente" };
    default:
      return { sub: "canceled", company: "suspenso" };
  }
}

function ts(v: unknown) {
  return typeof v === "number" ? new Date(v * 1000).toISOString() : null;
}

async function startStripeOnboarding(
  eventId: string,
  kind: "purchase" | "renewal",
  companyId: string,
  details: { name?: string | null; phone?: string | null; email?: string | null },
  fallbackEmail?: string | null,
) {
  try {
    const { enqueuePurchaseOnboarding } = await import("@/lib/purchase-onboarding.server");
    await enqueuePurchaseOnboarding({
      source: "stripe",
      eventKey: `stripe:${eventId}`,
      kind,
      companyId,
      buyerName: details?.name ?? null,
      buyerEmail: details?.email || fallbackEmail || null,
      buyerPhone: details?.phone ?? null,
    });
  } catch (error) {
    console.error("[stripe.onboarding]", error instanceof Error ? error.message : "falha");
  }
}

async function handleEvent(db: any, event: any): Promise<string | null> {
  const obj = event.data?.object ?? {};
  const now = new Date().toISOString();

  const applyToCompany = async (
    companyId: string,
    patch: Record<string, unknown>,
    companyStatus: string | null,
    planId?: string | null,
  ) => {
    const payload: any = { company_id: companyId, provider: "stripe", updated_at: now, ...patch };
    if (planId && UUID.test(planId)) payload.plan_id = planId;
    await db.from("subscription").upsert(payload, { onConflict: "company_id" });
    if (companyStatus) {
      await db.from("company").update({ status_cobranca: companyStatus }).eq("id", companyId);
    }
    if (companyStatus === "ativo" && planId && UUID.test(planId)) {
      const { data: p } = await db.from("plan").select("slug").eq("id", planId).maybeSingle();
      if (p?.slug) await db.rpc("topup_plan_credits", { _company_id: companyId, _plan_slug: p.slug });
    }
  };

  const companyFromSubId = async (subId: string | null) => {
    if (!subId) return null;
    const { data } = await db
      .from("subscription")
      .select("company_id,plan_id")
      .eq("stripe_subscription_id", subId)
      .maybeSingle();
    return data as { company_id: string; plan_id: string | null } | null;
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const companyId = String(obj.metadata?.company_id || obj.client_reference_id || "");
      if (!UUID.test(companyId)) return null;
      const subId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id;
      const custId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
      await applyToCompany(
        companyId,
        {
          status: "active",
          stripe_subscription_id: subId ?? null,
          stripe_customer_id: custId ?? null,
          external_subscription_id: subId ?? null,
          external_customer_id: custId ?? null,
          buyer_email: obj.customer_details?.email || obj.customer_email || null,
        },
        "ativo",
        obj.metadata?.plan_id,
      );
      await startStripeOnboarding(event.id, "purchase", companyId, obj.customer_details ?? {}, obj.customer_email);
      return companyId;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const existing = await companyFromSubId(obj.id);
      const companyId = String(obj.metadata?.company_id || existing?.company_id || "");
      if (!UUID.test(companyId)) return null;
      const st = event.type.endsWith("deleted") ? mapStatus("canceled") : mapStatus(obj.status);
      const periodEnd = obj.current_period_end ?? obj.items?.data?.[0]?.current_period_end;
      await applyToCompany(
        companyId,
        {
          status: st.sub,
          stripe_subscription_id: obj.id,
          external_subscription_id: obj.id,
          current_period_end: ts(periodEnd),
          trial_ends_at: ts(obj.trial_end),
          cancel_at_period_end: Boolean(obj.cancel_at_period_end),
          ...(st.sub === "canceled" ? { canceled_at: now } : {}),
        },
        st.company,
        obj.metadata?.plan_id || existing?.plan_id,
      );
      return companyId;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const subId =
        (typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id) ||
        obj.parent?.subscription_details?.subscription ||
        null;
      const existing = await companyFromSubId(subId);
      const companyId = String(
        existing?.company_id || obj.parent?.subscription_details?.metadata?.company_id || "",
      );
      if (!UUID.test(companyId)) return null;
      const paid = event.type === "invoice.paid";
      await applyToCompany(
        companyId,
        { status: paid ? "active" : "past_due", stripe_subscription_id: subId },
        paid ? "ativo" : "pendente",
        paid ? existing?.plan_id : null,
      );
      if (paid && obj.billing_reason === "subscription_cycle") {
        await startStripeOnboarding(
          event.id,
          "renewal",
          companyId,
          { name: obj.customer_name, phone: obj.customer_phone, email: obj.customer_email },
          obj.customer_email,
        );
      }
      return companyId;
    }
    default:
      return null;
  }
}

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const header = request.headers.get("stripe-signature") || "";
        const { resolveIntegration } = await import("@/lib/integration-secrets.server");
        const { webhook_secret } = await resolveIntegration("stripe");
        if (!webhook_secret) return new Response("not configured", { status: 503 });
        if (!header || !(await verify(raw, header, webhook_secret)))
          return new Response("invalid signature", { status: 400 });

        let event: any;
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("invalid payload", { status: 400 });
        }
        if (typeof event?.id !== "string" || typeof event?.type !== "string")
          return new Response("invalid payload", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const { error: insertError } = await db
          .from("stripe_event_log")
          .insert({ id: event.id, type: event.type });
        if (insertError?.code === "23505") {
          const { data: prev } = await db
            .from("stripe_event_log")
            .select("processed")
            .eq("id", event.id)
            .maybeSingle();
          if (prev?.processed) return Response.json({ received: true, duplicate: true });
        } else if (insertError) {
          return new Response("storage error", { status: 500 });
        }

        try {
          const companyId = await handleEvent(db, event);
          await db
            .from("stripe_event_log")
            .update({ processed: true, company_id: companyId, error: null })
            .eq("id", event.id);
          return Response.json({ received: true });
        } catch (e) {
          await db
            .from("stripe_event_log")
            .update({ error: e instanceof Error ? e.message.slice(0, 300) : "erro" })
            .eq("id", event.id);
          return new Response("processing error", { status: 500 });
        }
      },
    },
  },
});
