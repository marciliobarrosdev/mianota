import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Saldo + últimos 20 lançamentos para a empresa exibida. O companyId explícito
// evita que um super admin em impersonação leia o primeiro tenant da conta.
export const getMyCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string }) => d)
  .handler(async ({ context, data }) => {
    const { assertUserPasswordReady, requireCompanyMemberAccess } = await import(
      "./company-admin-access.server"
    );
    await assertUserPasswordReady(context.supabase);
    await requireCompanyMemberAccess(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [comp, led] = await Promise.all([
      supabaseAdmin
        .from("company")
        .select("creditos_saldo, creditos_origem, creditos_resetam_em")
        .eq("id", data.companyId)
        .maybeSingle(),
      supabaseAdmin
        .from("credit_ledger")
        .select("delta, saldo_apos, motivo, ref, created_at")
        .eq("company_id", data.companyId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    return {
      saldo: comp.data?.creditos_saldo ?? 0,
      origem: comp.data?.creditos_origem ?? "trial",
      resetam_em: comp.data?.creditos_resetam_em ?? null,
      ledger: led.data ?? [],
    };
  });

// Admin: adiciona/remove créditos numa empresa
export const adminGrantCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; qtd: number; motivo?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: novo, error } = await context.supabase.rpc("grant_credits", {
      _company_id: data.companyId,
      _qtd: data.qtd,
      _motivo: data.motivo || "bonus_admin",
    });
    if (error) throw new Error(error.message);
    return { saldo: novo as number };
  });
