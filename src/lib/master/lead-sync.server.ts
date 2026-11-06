/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-only hooks that keep the Master CRM in sync. Never throw into signup/payment flows.

export async function createLeadFromFreeSignup(params: {
  companyId: string;
  userId: string;
  email: string | null;
  nome: string;
  telefone?: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: lead } = await admin
      .from("master_lead")
      .upsert(
        {
          company_id: params.companyId,
          user_id: params.userId,
          nome: params.nome || params.email || "Lead",
          email: params.email,
          telefone: params.telefone ?? null,
          empresa: params.nome,
          origem: "plano_gratis",
          stage: "novo",
        },
        { onConflict: "company_id", ignoreDuplicates: true },
      )
      .select("id")
      .maybeSingle();
    if (lead?.id) {
      await admin.from("master_lead_activity").insert({
        lead_id: lead.id, kind: "sistema", body: "Cadastro no Plano Grátis",
      });
    }
  } catch (e) {
    console.warn("[lead-sync.free]", e instanceof Error ? e.message : e);
  }
}

export async function markLeadConverted(companyId: string, planId: string | null) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: lead } = await admin
      .from("master_lead").select("id, stage").eq("company_id", companyId).maybeSingle();
    if (!lead) return;
    let planName: string | null = null;
    let price = 0;
    if (planId) {
      const { data: p } = await admin.from("plan").select("nome, is_free, price_cents").eq("id", planId).maybeSingle();
      if (p?.is_free) return;
      planName = p?.nome ?? null;
      price = Number(p?.price_cents ?? 0) || 0;
    }
    if (lead.stage === "convertido") return;
    const now = new Date().toISOString();
    await admin.from("master_lead").update({
      stage: "convertido", auto_moved: true, stage_changed_at: now, updated_at: now,
      plano_convertido: planName, ...(price ? { valor_cents: price } : {}),
    }).eq("id", lead.id);
    await admin.from("master_lead_activity").insert({
      lead_id: lead.id, kind: "etapa", body: `Pagamento confirmado${planName ? ` (${planName})` : ""} → Convertido`,
    });
  } catch (e) {
    console.warn("[lead-sync.convert]", e instanceof Error ? e.message : e);
  }
}
