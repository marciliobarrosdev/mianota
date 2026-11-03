/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CompanyInput = z.object({ companyId: z.string().uuid() });

/** Plano, validade, créditos, histórico de pagamentos e planos ativos para comparação. */
export const getAccountOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CompanyInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireCompanyMemberAccess } = await import("@/lib/common/company-admin-access.server");
    await requireCompanyMemberAccess(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [sub, comp, events, plans] = await Promise.all([
      db
        .from("subscription")
        .select("status,provider,current_period_end,trial_ends_at,plan:plan(id,slug,nome,preco_cents,moeda,intervalo,is_free,creditos_mensais,limite_mensagens,limite_usuarios)")
        .eq("company_id", data.companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from("company").select("creditos_saldo,creditos_resetam_em,status_cobranca,trial_ate").eq("id", data.companyId).maybeSingle(),
      db
        .from("billing_event_log")
        .select("id,provider,event_type,processed,payload,created_at")
        .eq("matched_company_id", data.companyId)
        .order("created_at", { ascending: false })
        .limit(12),
      db
        .from("plan")
        .select("id,slug,nome,descricao,preco_cents,moeda,intervalo,is_free,free_days,creditos_mensais,features,destaque")
        .eq("ativo", true)
        .order("ordem"),
    ]);
    const payments = (events.data || []).map((e: any) => {
      const p = e.payload || {};
      const cents = Number(p.paid_amount ?? p.amount ?? p.amount_cents ?? 0) || 0;
      return {
        id: e.id as string,
        provider: String(e.provider || ""),
        eventType: String(e.event_type || ""),
        ok: Boolean(e.processed),
        amountCents: cents,
        createdAt: e.created_at as string,
      };
    });
    return {
      subscription: sub.data
        ? {
            status: sub.data.status as string,
            provider: (sub.data.provider as string) || null,
            periodEnd: (sub.data.current_period_end || sub.data.trial_ends_at || comp.data?.trial_ate || null) as string | null,
            plan: sub.data.plan || null,
          }
        : null,
      billingStatus: (comp.data?.status_cobranca as string) || null,
      credits: { balance: Number(comp.data?.creditos_saldo || 0), resetsAt: (comp.data?.creditos_resetam_em as string) || null },
      payments,
      plans: (plans.data || []) as any[],
    };
  });

/** Status real dos canais para o usuário atual. */
export const getChannelStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CompanyInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireCompanyMemberAccess } = await import("@/lib/common/company-admin-access.server");
    await requireCompanyMemberAccess(context.supabase, context.userId, data.companyId);
    const db = context.supabase as any;
    const [wa, push, pref] = await Promise.all([
      db.from("fin_whatsapp_identity").select("phone_e164,active,verified_at").eq("company_id", data.companyId).eq("user_id", context.userId).eq("active", true).limit(1).maybeSingle(),
      db.from("marcia_push_subscription").select("id", { count: "exact", head: true }).eq("company_id", data.companyId).eq("user_id", context.userId).eq("active", true),
      db.from("notification_preference").select("whatsapp_enabled,monthly_report").eq("user_id", context.userId).maybeSingle(),
    ]);
    let centralConnected = false;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: ch } = await (supabaseAdmin as any).from("platform_support_channel").select("*").limit(1).maybeSingle();
      const { isActiveChannelConnected } = await import("@/lib/whatsapp/purchase-onboarding-rules");
      centralConnected = isActiveChannelConnected(ch as any);
    } catch {
      centralConnected = false;
    }
    return {
      whatsappPhone: (wa.data?.phone_e164 as string) || null,
      pushDevices: push.count || 0,
      whatsappNotices: pref.data ? pref.data.whatsapp_enabled !== false : true,
      monthlyReport: pref.data ? pref.data.monthly_report !== false : true,
      centralConnected,
    };
  });

export const getDeletionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("account_deletion_request")
      .select("id,status,created_at")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .maybeSingle();
    return data as { id: string; status: string; created_at: string } | null;
  });

/** Pedido de exclusão (LGPD): exige o e-mail da conta como confirmação. */
export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ companyId: z.string().uuid(), confirmEmail: z.string().max(200), reason: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { requireCompanyMemberAccess } = await import("@/lib/common/company-admin-access.server");
    await requireCompanyMemberAccess(context.supabase, context.userId, data.companyId);
    const email = String((context.claims as any)?.email || "").trim().toLowerCase();
    if (!email || data.confirmEmail.trim().toLowerCase() !== email) throw new Error("O e-mail digitado não confere com o da conta.");
    const { error } = await (context.supabase as any).from("account_deletion_request").insert({
      company_id: data.companyId,
      user_id: context.userId,
      email,
      reason: data.reason?.trim() || null,
    });
    if (error) {
      if (String(error.code) === "23505") throw new Error("Você já tem um pedido em análise.");
      throw new Error("Não foi possível registrar o pedido agora.");
    }
    return { ok: true as const };
  });

export const cancelAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await (context.supabase as any)
      .from("account_deletion_request")
      .update({ status: "canceled", resolved_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("status", "pending");
    if (error) throw new Error("Não foi possível cancelar o pedido.");
    return { ok: true as const };
  });

async function assertSuperAdmin(supabase: any) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error || data !== true) throw new Error("Acesso restrito ao proprietário da instalação.");
}

export const listDeletionRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("account_deletion_request")
      .select("id,company_id,email,reason,status,created_at,company:company(nome)")
      .order("created_at", { ascending: false })
      .limit(50);
    return (data || []) as any[];
  });

export const resolveDeletionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected"]) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("account_deletion_request")
      .update({ status: data.status, resolved_at: new Date().toISOString(), resolved_by: context.userId })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error("Não foi possível atualizar o pedido.");
    return { ok: true as const };
  });

/** CSV dos lançamentos da empresa. */
export const exportTransactionsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CompanyInput.parse(d))
  .handler(async ({ context, data }) => {
    const { requireCompanyMemberAccess } = await import("@/lib/common/company-admin-access.server");
    await requireCompanyMemberAccess(context.supabase, context.userId, data.companyId);
    const db = context.supabase as any;
    const [rows, cats] = await Promise.all([
      db.from("fin_lancamento").select("*").eq("company_id", data.companyId).order("competencia", { ascending: false }).limit(5000),
      db.from("fin_categoria").select("id,nome").eq("company_id", data.companyId),
    ]);
    const names = new Map<string, string>((cats.data || []).map((c: any) => [c.id, c.nome]));
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Data", "Vencimento", "Tipo", "Descrição", "Categoria", "Valor (R$)", "Status"];
    const lines = (rows.data || []).map((r: any) =>
      [r.competencia, r.vencimento, r.tipo, r.descricao, names.get(r.categoria_id) || "", (Number(r.valor_cents || 0) / 100).toFixed(2).replace(".", ","), r.status]
        .map(esc)
        .join(";"),
    );
    return { csv: "\uFEFF" + [head.map(esc).join(";"), ...lines].join("\n") };
  });
