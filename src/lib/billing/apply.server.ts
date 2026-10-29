/* eslint-disable @typescript-eslint/no-explicit-any */
// Aplica um evento de cobrança normalizado (assinatura, créditos, onboarding).
import type { NormalizedBillingEvent } from "@/lib/billing/normalize";

export async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function findCompanyByEmail(supabase: any, email: string): Promise<string | null> {
  // Buyer identity is authoritative only in auth.users. profiles.email is a
  // display mirror and must never decide which tenant receives an entitlement.
  const { data: authUserId, error: authLookupError } = await supabase.rpc(
    "marcia_find_auth_user_by_email",
    { _email: email },
  );
  if (authLookupError) {
    throw new Error(`Falha ao resolver identidade Auth do comprador: ${authLookupError.message}`);
  }
  if (!authUserId) return null;
  const { data: cu } = await supabase
    .from("company_user")
    .select("company_id")
    .eq("user_id", authUserId)
    .eq("ativo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return cu?.company_id ?? null;
}

async function findPlanByRef(supabase: any, ref: string | null): Promise<string | null> {
  if (!ref) return null;
  const { data: bySlug } = await supabase.from("plan").select("id").eq("slug", ref).maybeSingle();
  if (bySlug?.id) return bySlug.id;
  const { data: byCheckout } = await supabase
    .from("plan")
    .select("id")
    .ilike("checkout_url", `%${ref}%`)
    .maybeSingle();
  return byCheckout?.id ?? null;
}

export async function applyEvent(evt: NormalizedBillingEvent, eventKey: string) {
  const supabase = await getAdmin();

  const logRow: any = {
    provider: evt.provider,
    event_type: evt.rawEventName || evt.eventType,
    external_id: evt.externalSubscriptionId,
    buyer_email: evt.buyerEmail,
    payload: evt as any,
    event_key: eventKey,
  };

  const { data: log, error: logError } = await supabase
    .from("billing_event_log")
    .insert(logRow)
    .select("id")
    .maybeSingle();
  if (logError?.code === "23505") return { duplicate: true };
  if (logError || !log)
    throw new Error(logError?.message || "Falha ao registrar evento de cobrança");
  const finishLog = (patch: Record<string, unknown>) =>
    supabase
      .from("billing_event_log")
      .update(patch as any)
      .eq("id", log.id);

  if (!evt.buyerEmail) {
    await finishLog({ error: "sem email do comprador" });
    return { duplicate: false };
  }

  const companyId = evt.companyId ?? (await findCompanyByEmail(supabase, evt.buyerEmail));
  if (!companyId) {
    await finishLog({ error: "empresa não encontrada para o email" });
    if (evt.eventType === "purchase_approved") await startOnboarding(evt, eventKey, null);
    return { duplicate: false };
  }

  const planId = await findPlanByRef(supabase, evt.productRef);

  // Map status / billing
  let subStatus: string | null = null;
  let companyStatus: string | null = null;

  switch (evt.eventType) {
    case "purchase_approved":
    case "subscription_renewed":
      subStatus = "active";
      companyStatus = "ativo";
      break;
    case "subscription_canceled":
      subStatus = "canceled";
      companyStatus = "suspenso";
      break;
    case "refunded":
    case "chargeback":
      subStatus = "canceled";
      companyStatus = "suspenso";
      break;
    case "payment_failed":
      subStatus = "past_due";
      companyStatus = "pendente";
      break;
    default:
      await finishLog({
        matched_company_id: companyId,
        processed: true,
        error: "evento ignorado",
      });
      return { duplicate: false };
  }

  const subPayload: any = {
    company_id: companyId,
    provider: evt.provider,
    external_subscription_id: evt.externalSubscriptionId,
    external_customer_id: evt.externalCustomerId,
    buyer_email: evt.buyerEmail,
    status: subStatus,
    updated_at: new Date().toISOString(),
  };
  if (planId) subPayload.plan_id = planId;
  if (evt.periodEnd) subPayload.current_period_end = evt.periodEnd;
  if (subStatus === "canceled") subPayload.canceled_at = new Date().toISOString();

  // Upsert por company_id (1 assinatura por empresa).
  await supabase.from("subscription").upsert(subPayload, { onConflict: "company_id" });

  if (companyStatus) {
    await supabase.from("company").update({ status_cobranca: companyStatus }).eq("id", companyId);
  }

  // Recarrega créditos do plano quando assinatura ativa/renova
  if (subStatus === "active" && planId) {
    const { data: planRow } = await supabase
      .from("plan")
      .select("slug")
      .eq("id", planId)
      .maybeSingle();
    if (planRow?.slug) {
      await supabase.rpc("topup_plan_credits", {
        _company_id: companyId,
        _plan_slug: planRow.slug,
      });
    }
  }

  await finishLog({
    matched_company_id: companyId,
    processed: true,
  });
  // Onboarding de WhatsApp: depois da ativação e dos créditos; nunca derruba a compra.
  if (evt.eventType === "purchase_approved" || evt.eventType === "subscription_renewed") {
    const { notifyPaymentConfirmed } = await import("@/lib/notification-jobs.server");
    await notifyPaymentConfirmed(supabase, companyId, evt.periodEnd ?? null, `${evt.provider}:${eventKey}`);
    await startOnboarding(evt, eventKey, companyId);
  }
  return { duplicate: false };
}

async function startOnboarding(
  evt: NormalizedBillingEvent,
  eventKey: string,
  companyId: string | null,
) {
  try {
    const { enqueuePurchaseOnboarding } = await import("@/lib/purchase-onboarding.server");
    await enqueuePurchaseOnboarding({
      source: evt.provider,
      eventKey: `${evt.provider}:${eventKey}`,
      kind: evt.eventType === "subscription_renewed" ? "renewal" : "purchase",
      companyId,
      buyerName: evt.buyerName,
      buyerEmail: evt.buyerEmail,
      buyerPhone: evt.buyerPhone,
    });
  } catch (error) {
    console.error("[billing.onboarding]", error instanceof Error ? error.message : "falha");
  }
}

