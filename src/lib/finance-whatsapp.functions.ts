/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function validateCompany(input: { companyId: string }) {
  const companyId = String(input?.companyId || "").trim();
  if (!companyId) throw new Error("Conta não informada.");
  return { companyId };
}

async function authorize(context: any, companyId: string) {
  const { requireCompanyMemberAccess } = await import("./company-admin-access.server");
  await requireCompanyMemberAccess(context.supabase, context.userId, companyId);
  const { assertCompanyPlanFeature } = await import("./plan-limits.server");
  await assertCompanyPlanFeature(
    companyId,
    "automacoes",
    "O WhatsApp financeiro está disponível no plano Pro.",
  );
}

export const getFinanceWhatsappIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateCompany)
  .handler(async ({ context, data }) => {
    await authorize(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: identity, error } = await (supabaseAdmin as any)
      .from("fin_whatsapp_identity")
      .select("phone_e164,display_name,verified_at,last_used_at,active")
      .eq("company_id", data.companyId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { identity: identity || null };
  });

export const getFinanceWhatsappChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateCompany)
  .handler(async ({ context, data }) => {
    await authorize(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await (supabaseAdmin as any)
      .from("platform_support_channel")
      .select("provider,active_provider,status,instance_name,phone_e164,last_error")
      .eq("id", true)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    const { isActiveChannelConnected } = await import("./purchase-onboarding-rules");
    const connected = isActiveChannelConnected(result.data);
    return {
      connected,
      provider: result.data?.active_provider || null,
      phone: connected ? result.data?.phone_e164 || null : null,
      status: connected ? "connected" : result.data?.status === "connected" ? "disconnected" : result.data?.status || "disconnected",
      lastError: result.data?.last_error || null,
    };
  });

export const createFinanceWhatsappPairing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateCompany)
  .handler(async ({ context, data }) => {
    await authorize(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    let code = "";
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = String(
        crypto.getRandomValues(new Uint32Array(1))[0] % 100_000_000,
      ).padStart(8, "0");
      const collision = await db
        .from("fin_whatsapp_pairing")
        .select("id")
        .eq("code", candidate)
        .limit(1);
      if (collision.error) throw new Error(collision.error.message);
      if (!collision.data?.length) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error("Não foi possível gerar um código único. Tente novamente.");
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
    const saved = await db.from("fin_whatsapp_pairing").upsert(
      {
        company_id: data.companyId,
        user_id: context.userId,
        code,
        expires_at: expiresAt,
        used_at: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: "company_id,user_id" },
    );
    if (saved.error) throw new Error(saved.error.message);
    return { code, expiresAt, command: `VINCULAR ${code}` };
  });

export const revokeFinanceWhatsappIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateCompany)
  .handler(async ({ context, data }) => {
    await authorize(context, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await (supabaseAdmin as any)
      .from("fin_whatsapp_identity")
      .update({ active: false })
      .eq("company_id", data.companyId)
      .eq("user_id", context.userId);
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });
