/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { OnboardingSignals } from "@/lib/finance/onboarding-rules";

/** Sinais reais de configuração da conta para o guia "Comece aqui". */
export const getOnboardingProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<OnboardingSignals & { planName: string | null; periodEnd: string | null }> => {
    const { requireCompanyMemberAccess } = await import("@/lib/common/company-admin-access.server");
    await requireCompanyMemberAccess(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const c = data.companyId;
    const today = new Date().toISOString().slice(0, 10);
    const count = (q: any) => q.then((r: any) => Number(r.count || 0)).catch(() => 0);
    const [movements, wa, future, recur, push, budgets, goals, company, sub] = await Promise.all([
      count(db.from("fin_lancamento").select("id", { count: "exact", head: true }).eq("company_id", c).neq("status", "cancelado")),
      db.from("fin_whatsapp_identity").select("id").eq("company_id", c).eq("user_id", context.userId).eq("active", true).limit(1).maybeSingle(),
      count(db.from("fin_lancamento").select("id", { count: "exact", head: true }).eq("company_id", c).neq("status", "cancelado").gte("vencimento", today)),
      count(db.from("fin_recorrencia").select("id", { count: "exact", head: true }).eq("company_id", c)),
      count(db.from("marcia_push_subscription").select("id", { count: "exact", head: true }).eq("company_id", c).eq("user_id", context.userId).eq("active", true)),
      count(db.from("fin_orcamento").select("id", { count: "exact", head: true }).eq("company_id", c)),
      count(db.from("fin_meta").select("id", { count: "exact", head: true }).eq("company_id", c)),
      db.from("company").select("finance_profile").eq("id", c).maybeSingle(),
      db.from("subscription").select("status,current_period_end,trial_ends_at,plan:plan(nome,is_free,preco_cents)").eq("company_id", c).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const profile = company.data?.finance_profile;
    const plan = sub.data?.plan;
    const paidPlan = Boolean(plan && !plan.is_free && Number(plan.preco_cents) > 0 && sub.data?.status === "active");
    return {
      movements,
      whatsappLinked: Boolean(wa.data),
      scheduled: future + recur,
      pushDevices: push,
      profileCustomized: Boolean(profile && typeof profile === "object" && Object.keys(profile).length > 0),
      budgetsOrGoals: budgets + goals,
      paidPlan,
      planName: plan?.nome ?? null,
      periodEnd: sub.data?.current_period_end || sub.data?.trial_ends_at || null,
    };
  });
