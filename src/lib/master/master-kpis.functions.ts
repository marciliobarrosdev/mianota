/** Indicadores da Visão geral do Master e lista de assinaturas. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSuper } from "@/lib/master/master-guards";

export const masterKpis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { from?: string; to?: string }) => {
    const today = new Date();
    const defaultTo = today.toISOString().slice(0, 10);
    const defaultFromDate = new Date(today);
    defaultFromDate.setDate(defaultFromDate.getDate() - 29);
    const defaultFrom = defaultFromDate.toISOString().slice(0, 10);
    const from = /^\d{4}-\d{2}-\d{2}$/.test(input?.from ?? "") ? input!.from! : defaultFrom;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(input?.to ?? "") ? input!.to! : defaultTo;
    if (from > to) throw new Error("A data inicial precisa ser anterior à data final.");
    return {
      from,
      to,
      fromIso: `${from}T00:00:00.000Z`,
      toIso: `${to}T23:59:59.999Z`,
    };
  })
  .handler(async ({ context, data }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [
      { data: companies, error: companiesError },
      { count: transactionCount, error: transactionError },
      { count: accountCount, error: accountError },
      { count: aiCommandCount, error: aiCommandError },
      { data: subscriptions, error: subscriptionsError },
    ] = await Promise.all([
      supabaseAdmin
        .from("company")
        .select(
          "id, nome, email_corporativo, status_cobranca, trial_ate, creditos_saldo, created_at",
        ),
      (supabaseAdmin as any)
        .from("fin_lancamento")
        .select("id", { count: "exact", head: true })
        .gte("created_at", data.fromIso)
        .lte("created_at", data.toIso),
      (supabaseAdmin as any)
        .from("fin_conta")
        .select("id", { count: "exact", head: true })
        .gte("created_at", data.fromIso)
        .lte("created_at", data.toIso),
      (supabaseAdmin as any)
        .from("marcia_ai_command")
        .select("id", { count: "exact", head: true })
        .gte("created_at", data.fromIso)
        .lte("created_at", data.toIso),
      supabaseAdmin.from("subscription").select("status, plan:plan(preco_cents)"),
    ]);
    const readError =
      companiesError || transactionError || accountError || aiCommandError || subscriptionsError;
    if (readError)
      throw new Error(`Não foi possível carregar os indicadores do sistema: ${readError.message}`);
    const now = new Date();
    const fromTime = new Date(data.fromIso).getTime();
    const toTime = new Date(data.toIso).getTime();
    const all = companies ?? [];
    const subs = subscriptions ?? [];
    const companiesInPeriod = all.filter((company: any) => {
      const createdAt = new Date(company.created_at).getTime();
      return createdAt >= fromTime && createdAt <= toTime;
    });
    const expiringLimit = new Date(now);
    expiringLimit.setDate(expiringLimit.getDate() + 7);
    const stats = {
      total: all.length,
      ativas: all.filter((c: any) => c.status_cobranca === "ativo").length,
      trial: all.filter((c: any) => c.status_cobranca === "trial").length,
      suspensas: all.filter((c: any) => c.status_cobranca === "suspenso").length,
      pendentes: all.filter((c: any) =>
        ["pendente", "checkout_pending"].includes(c.status_cobranca),
      ).length,
      novasPeriodo: companiesInPeriod.length,
      movimentacoes: transactionCount ?? 0,
      contas: accountCount ?? 0,
      comandosIa: aiCommandCount ?? 0,
      assinaturasAtivas: subs.filter((s: any) => s.status === "active").length,
      assinaturasTrial: subs.filter((s: any) => s.status === "trialing").length,
      mrr: subs
        .filter((s: any) => s.status === "active")
        .reduce((sum: number, s: any) => sum + (s.plan?.preco_cents ?? 0), 0),
      trialsVencendo: all.filter((c: any) => {
        if (c.status_cobranca !== "trial" || !c.trial_ate) return false;
        const expiresAt = new Date(c.trial_ate).getTime();
        return expiresAt >= now.getTime() && expiresAt <= expiringLimit.getTime();
      }).length,
    };

    const rangeDays = Math.max(1, Math.ceil((toTime - fromTime) / 86_400_000) + 1);
    const bucketCount = Math.min(12, rangeDays);
    const bucketSize = Math.ceil(rangeDays / bucketCount);
    const series: { label: string; total: number }[] = [];
    for (let bucket = 0; bucket < bucketCount; bucket++) {
      const bucketStart = fromTime + bucket * bucketSize * 86_400_000;
      const bucketEnd = Math.min(toTime + 1, bucketStart + bucketSize * 86_400_000);
      series.push({
        label: new Date(bucketStart).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        }),
        total: companiesInPeriod.filter((company: any) => {
          const createdAt = new Date(company.created_at).getTime();
          return createdAt >= bucketStart && createdAt < bucketEnd;
        }).length,
      });
    }

    const recentCompanies = [...all]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);

    return {
      range: { from: data.from, to: data.to },
      stats,
      series,
      recentCompanies,
    };
  });

export const listMasterSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("subscription")
      .select(
        "*, plan:plan(nome,preco_cents,moeda,intervalo), company:company(nome,status_cobranca,email_corporativo,logo_url)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { rows: data ?? [] };
  });

