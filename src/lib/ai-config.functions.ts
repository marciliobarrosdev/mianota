/* eslint-disable @typescript-eslint/no-explicit-any */
// Superadmin: "IA e créditos". Nenhuma chave é reexibida; apenas estado e máscara.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperAdmin(supabase: any) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error || data !== true) throw new Error("Acesso restrito ao proprietário da instalação.");
}

async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

type Mode = "lovable" | "openai" | "anthropic";

async function probeAiProvider(provider: Mode, providedKey?: string) {
  const probe = [{ role: "user" as const, content: "Responda apenas: ok" }];
  if (provider === "lovable") {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Lovable AI não está disponível neste ambiente.");
    const { LOVABLE_AI_MODEL } = await import("./lovable-ai-config");
    const { fetchAiProvider } = await import("./ai-request.server");
    const res = await fetchAiProvider(
      "Lovable AI",
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: LOVABLE_AI_MODEL, messages: probe }),
      },
    );
    if (!res.ok) throw new Error(`Lovable AI respondeu ${res.status}.`);
    return;
  }

  let key = String(providedKey || "").trim();
  if (!key) {
    const { resolveIntegration } = await import("./integration-secrets.server");
    key = (await resolveIntegration(provider === "openai" ? "ai_openai" : "ai_anthropic")).api_key;
  }
  if (!key) throw new Error("Nenhuma chave salva para este provedor.");
  const { openAiChat, anthropicChat, AI_MODEL_OPTIONS } = await import("./ai-provider.server");
  const model = AI_MODEL_OPTIONS[provider][0].id;
  if (provider === "openai") await openAiChat(key, model, probe);
  else await anthropicChat(key, model, probe);
}

export const getAiOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { days?: number }) => ({
    days: [7, 30, 90].includes(Number(data?.days)) ? Number(data.days) : 30,
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const db = await adminDb();
    const { AI_MODEL_OPTIONS } = await import("./ai-provider.server");
    const { describeIntegration } = await import("./integration-secrets.server");
    const since = new Date(Date.now() - data.days * 86400_000).toISOString();
    const [config, openai, anthropic, ledger, companies] = await Promise.all([
      db.from("ai_provider_config").select("*").eq("id", true).maybeSingle(),
      describeIntegration("ai_openai"),
      describeIntegration("ai_anthropic"),
      db
        .from("credit_ledger")
        .select("company_id,delta,motivo,created_at")
        .gte("created_at", since)
        .limit(20000),
      db.from("company").select("id,nome,nome_fantasia,creditos_saldo,trial_ate").limit(5000),
    ]);
    const rows = ledger.data ?? [];
    const consumed = rows.filter((r: any) => r.delta < 0);
    const refunds = rows.filter(
      (r: any) => r.delta > 0 && /reembolso|refund|estorno/i.test(String(r.motivo || "")),
    );
    const granted = rows.filter((r: any) => r.delta > 0 && !refunds.includes(r));
    const perCompany = new Map<string, number>();
    for (const r of consumed)
      perCompany.set(r.company_id, (perCompany.get(r.company_id) || 0) + Math.abs(r.delta));
    const companyRows = companies.data ?? [];
    const top = Array.from(perCompany.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, used]) => {
        const c = companyRows.find((x: any) => x.id === id);
        return {
          id,
          name: c ? c.nome_fantasia || c.nome : "Assinante",
          used,
          balance: Number(c?.creditos_saldo || 0),
        };
      });
    const days = new Map<string, number>();
    for (const r of consumed) {
      const d = String(r.created_at).slice(0, 10);
      days.set(d, (days.get(d) || 0) + Math.abs(r.delta));
    }
    const cfg = config.data ?? { mode: "lovable", optimized: true };
    const mask = (item: any) => ({
      configured: item.fields[0]?.configured ?? false,
      last4: item.fields[0]?.last4 ?? null,
      testedAt: item.testedAt,
      testOk: item.testOk,
    });
    return {
      config: {
        mode: cfg.mode as Mode,
        model: (cfg.model ?? null) as string | null,
        optimized: cfg.optimized !== false,
        testedAt: cfg.tested_at ?? null,
        testOk: cfg.test_ok ?? null,
        lastError: cfg.last_error ?? null,
      },
      models: AI_MODEL_OPTIONS,
      byok: { openai: mask(openai), anthropic: mask(anthropic) },
      metrics: {
        days: data.days,
        aiActions: consumed.length,
        creditsConsumed: consumed.reduce((s: number, r: any) => s + Math.abs(r.delta), 0),
        refunds: refunds.length,
        creditsGranted: granted.reduce((s: number, r: any) => s + r.delta, 0),
        totalBalance: companyRows.reduce(
          (s: number, c: any) => s + Number(c.creditos_saldo || 0),
          0,
        ),
        subscribersInTrial: companyRows.filter(
          (c: any) => c.trial_ate && new Date(c.trial_ate).getTime() > Date.now(),
        ).length,
        top,
        daily: Array.from(days.entries())
          .sort()
          .map(([day, used]) => ({ day, used })),
      },
    };
  });

export const saveAiMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { mode: Mode; model?: string | null; optimized: boolean }) => {
    if (!["lovable", "openai", "anthropic"].includes(data?.mode)) throw new Error("Modo inválido.");
    return {
      mode: data.mode,
      model: data?.model ? String(data.model).slice(0, 80) : null,
      optimized: Boolean(data?.optimized),
    };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { AI_MODEL_OPTIONS, clearAiProviderCache } = await import("./ai-provider.server");
    if (data.model && !AI_MODEL_OPTIONS[data.mode].some((m) => m.id === data.model))
      throw new Error("Modelo não disponível para este provedor.");
    const db = await adminDb();
    let testOk: boolean | null = null;
    if (data.mode !== "lovable") {
      const { describeIntegration, recordIntegrationTest } =
        await import("./integration-secrets.server");
      const item = await describeIntegration(data.mode === "openai" ? "ai_openai" : "ai_anthropic");
      if (!item.configured) throw new Error("Salve a chave deste provedor antes de ativá-lo.");
      if (item.testOk !== true) {
        const integration = data.mode === "openai" ? "ai_openai" : "ai_anthropic";
        try {
          await probeAiProvider(data.mode);
          await recordIntegrationTest(integration, true, null);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Provedor indisponível.";
          await recordIntegrationTest(integration, false, message);
          throw new Error(`Não foi possível ativar automaticamente: ${message}`);
        }
      }
      testOk = true;
    } else {
      testOk = Boolean(process.env.LOVABLE_API_KEY);
    }
    const { error } = await db.from("ai_provider_config").upsert({
      id: true,
      mode: data.mode,
      model: data.model,
      optimized: data.optimized,
      test_ok: testOk,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    clearAiProviderCache();
    return { ok: true };
  });

export const saveByokKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { provider: "openai" | "anthropic"; apiKey: string }) => {
    if (!["openai", "anthropic"].includes(data?.provider)) throw new Error("Provedor inválido.");
    const apiKey = String(data?.apiKey || "").trim();
    if (apiKey.length < 20 || apiKey.length > 300 || /\s/.test(apiKey))
      throw new Error("Chave em formato inválido.");
    return { provider: data.provider, apiKey };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { saveIntegrationValues, recordIntegrationTest } =
      await import("./integration-secrets.server");
    await probeAiProvider(data.provider, data.apiKey);
    await saveIntegrationValues(
      data.provider === "openai" ? "ai_openai" : "ai_anthropic",
      { api_key: data.apiKey },
      context.userId,
    );
    await recordIntegrationTest(
      data.provider === "openai" ? "ai_openai" : "ai_anthropic",
      true,
      null,
    );
    return { ok: true, message: "Chave validada e salva com segurança." };
  });

export const deleteByokKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { provider: "openai" | "anthropic" }) => {
    if (!["openai", "anthropic"].includes(data?.provider)) throw new Error("Provedor inválido.");
    return { provider: data.provider };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const db = await adminDb();
    const { data: cfg } = await db
      .from("ai_provider_config")
      .select("mode")
      .eq("id", true)
      .maybeSingle();
    if (cfg?.mode === data.provider)
      throw new Error("Volte para Lovable AI antes de remover a chave do provedor ativo.");
    const { deleteIntegrationValues } = await import("./integration-secrets.server");
    await deleteIntegrationValues(data.provider === "openai" ? "ai_openai" : "ai_anthropic");
    return { ok: true };
  });

export const testAiProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { provider: Mode }) => {
    if (!["lovable", "openai", "anthropic"].includes(data?.provider))
      throw new Error("Provedor inválido.");
    return { provider: data.provider };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const started = Date.now();
    try {
      await probeAiProvider(data.provider);
      if (data.provider !== "lovable") {
        const { recordIntegrationTest } = await import("./integration-secrets.server");
        const provider = data.provider === "openai" ? "ai_openai" : "ai_anthropic";
        await recordIntegrationTest(provider, true, null);
      }
      return { ok: true, ms: Date.now() - started, message: "Provedor respondeu corretamente." };
    } catch (error) {
      if (data.provider !== "lovable") {
        const { recordIntegrationTest } = await import("./integration-secrets.server");
        const provider = data.provider === "openai" ? "ai_openai" : "ai_anthropic";
        await recordIntegrationTest(
          provider,
          false,
          error instanceof Error ? error.message : "falha",
        ).catch(() => undefined);
      }
      return {
        ok: false,
        ms: Date.now() - started,
        message: error instanceof Error ? error.message : "Falha no teste.",
      };
    }
  });
