/* eslint-disable @typescript-eslint/no-explicit-any */
// Superadmin: "IA e créditos". Nenhuma chave é reexibida; apenas estado e máscara.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSuperAdmin } from "@/lib/master/master-guards";
import type { IntegrationProvider } from "@/lib/common/integration-secrets.server";

async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export type AiMode = "gemini" | "openrouter" | "deepseek" | "xai" | "openai" | "anthropic" | "lovable";
export type Byok = "gemini" | "openrouter" | "deepseek" | "xai" | "openai" | "anthropic";
export const MODES: AiMode[] = ["gemini", "openrouter", "deepseek", "xai", "openai", "anthropic"];

const INTEGRATION: Record<Byok, IntegrationProvider> = {
  gemini: "ai_gemini",
  openrouter: "ai_openrouter",
  deepseek: "ai_deepseek",
  xai: "ai_xai",
  openai: "ai_openai",
  anthropic: "ai_anthropic",
};

/** Modelos válidos por provedor carregados do catálogo `ai_model_catalog` */
async function modelOptions() {
  const { loadModelCatalog } = await import("@/lib/ai/ai-provider.server");
  const catalog = await loadModelCatalog();
  const byProvider: Record<string, { id: string; label: string; hint: string; isEmbedding: boolean; dimension: number | null }[]> = {
    gemini: [],
    openrouter: [],
    deepseek: [],
    xai: [],
    openai: [],
    anthropic: [],
    lovable: [],
  };

  for (const c of catalog) {
    if (!byProvider[c.provider]) byProvider[c.provider] = [];
    byProvider[c.provider].push({
      id: c.model_id,
      label: c.label,
      hint: c.is_embedding
        ? `Embedding · ${c.embedding_dimension || 768} dim`
        : [c.supports_vision && "imagem", c.supports_pdf && "PDF", c.supports_audio && "áudio"].filter(Boolean).join(" · ") || "texto",
      isEmbedding: Boolean(c.is_embedding),
      dimension: c.embedding_dimension ?? null,
    });
  }

  // Se lovable não tiver itens próprios, herda gemini para compatibilidade
  if (byProvider.lovable.length === 0) {
    byProvider.lovable = byProvider.gemini;
  }

  return byProvider;
}

export const getAiOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { days?: number }) => ({
    days: [7, 30, 90].includes(Number(data?.days)) ? Number(data.days) : 30,
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const db = await adminDb();
    const { describeIntegration } = await import("@/lib/common/integration-secrets.server");
    const { getEmbeddingCoverageStats } = await import("@/lib/ai/ai-embeddings.server");
    const since = new Date(Date.now() - data.days * 86400_000).toISOString();

    const [
      config,
      gemini,
      openrouter,
      deepseek,
      xai,
      openai,
      anthropic,
      models,
      coverage,
      ledger,
      companies,
    ] = await Promise.all([
      db.from("ai_provider_config").select("*").eq("id", true).maybeSingle(),
      describeIntegration("ai_gemini"),
      describeIntegration("ai_openrouter"),
      describeIntegration("ai_deepseek"),
      describeIntegration("ai_xai"),
      describeIntegration("ai_openai"),
      describeIntegration("ai_anthropic"),
      modelOptions(),
      getEmbeddingCoverageStats(),
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
    const cfg = config.data ?? {
      mode: "gemini",
      model: "gemini-3.8-flash",
      optimized: true,
      embedding_provider: "gemini",
      embedding_model: "gemini-embedding-2",
      embedding_dimension: 768,
    };

    const mask = (item: any) => ({
      configured: item.fields[0]?.configured ?? false,
      source: item.fields[0]?.source ?? "none",
      envVar: item.fields[0]?.envVar ?? "",
      last4: item.fields[0]?.last4 ?? null,
      testedAt: item.testedAt,
      testOk: item.testOk,
      lastError: item.lastError,
    });

    const providerMasks = {
      gemini: mask(gemini),
      openrouter: mask(openrouter),
      deepseek: mask(deepseek),
      xai: mask(xai),
      openai: mask(openai),
      anthropic: mask(anthropic),
    };

    return {
      config: {
        mode: (cfg.mode || "gemini") as AiMode,
        model: (cfg.model ?? "gemini-3.8-flash") as string,
        optimized: cfg.optimized !== false,
        fallbackEnabled: Boolean(cfg.fallback_enabled),
        fallbackMode: (cfg.fallback_mode ?? null) as string | null,
        fallbackModel: (cfg.fallback_model ?? null) as string | null,
        embeddingProvider: (cfg.embedding_provider ?? "gemini") as string,
        embeddingModel: (cfg.embedding_model ?? "gemini-embedding-2") as string,
        embeddingDimension: (cfg.embedding_dimension ?? 768) as number,
        fallbackEmbeddingProvider: (cfg.fallback_embedding_provider ?? null) as string | null,
        fallbackEmbeddingModel: (cfg.fallback_embedding_model ?? null) as string | null,
        testedAt: cfg.tested_at ?? null,
        testOk: cfg.test_ok ?? null,
        lastError: cfg.last_error ?? null,
        lastTestMs: (cfg.last_test_ms ?? null) as number | null,
      },
      models,
      coverage,
      providers: providerMasks,
      byok: providerMasks,
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
  .inputValidator(
    (data: {
      mode: string;
      model?: string | null;
      optimized: boolean;
      fallbackEnabled?: boolean;
      fallbackMode?: string | null;
      fallbackModel?: string | null;
      embeddingProvider?: string | null;
      embeddingModel?: string | null;
      embeddingDimension?: number | null;
      fallbackEmbeddingProvider?: string | null;
      fallbackEmbeddingModel?: string | null;
    }) => data,
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { clearAiProviderCache } = await import("@/lib/ai/ai-provider.server");
    const db = await adminDb();

    const { error } = await db.from("ai_provider_config").upsert({
      id: true,
      mode: data.mode,
      model: data.model || null,
      optimized: data.optimized !== false,
      fallback_enabled: Boolean(data.fallbackEnabled),
      fallback_mode: data.fallbackMode || null,
      fallback_model: data.fallbackModel || null,
      embedding_provider: data.embeddingProvider || "gemini",
      embedding_model: data.embeddingModel || "gemini-embedding-2",
      embedding_dimension: data.embeddingDimension || 768,
      embedding_fallback_provider: data.fallbackEmbeddingProvider || null,
      embedding_fallback_model: data.fallbackEmbeddingModel || null,
      fallback_embedding_provider: data.fallbackEmbeddingProvider || null,
      fallback_embedding_model: data.fallbackEmbeddingModel || null,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    clearAiProviderCache();
    const { writeMasterAudit } = await import("@/lib/master/master-audit.server");
    await writeMasterAudit({
      actorId: context.userId,
      action: "ai_provider_activated",
      target: `${data.mode}:${data.model ?? "padrão"}`,
    } as any);

    return { ok: true, message: "Configurações de IA salvas. A MIA já usa este modelo." };
  });

export const testAiProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { provider: string; model?: string | null }) => data)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { testLlmConnection } = await import("@/lib/ai/ai-orchestrator.server");
    try {
      const result = await testLlmConnection(data.provider as any, data.model || undefined);
      return result;
    } catch (error) {
      return {
        ok: false,
        ms: 0,
        message: error instanceof Error ? error.message : "Falha na conexão com o modelo de IA.",
      };
    }
  });

export const testAiEmbedding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { provider?: string; model?: string; dimension?: number }) => data)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { testEmbeddingConnection } = await import("@/lib/ai/ai-orchestrator.server");
    try {
      const provider = (data.provider || "gemini") as "gemini" | "openrouter" | "openai";
      const model = data.model || "gemini-embedding-2";
      const dim = data.dimension || 768;
      const result = await testEmbeddingConnection(provider, model, dim);
      return result;
    } catch (error) {
      return {
        ok: false,
        ms: 0,
        dimension: 0,
        message: error instanceof Error ? error.message : "Falha ao gerar embedding vetorial.",
      };
    }
  });

export const reindexAllEmbeddings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase);
    const db = await adminDb();
    const { data: lancamentos } = await db
      .from("fin_lancamento")
      .select("id,company_id,descricao")
      .neq("status", "cancelado")
      .limit(100);

    const { indexTransactionEmbedding, getEmbeddingCoverageStats } = await import(
      "@/lib/ai/ai-embeddings.server"
    );
    let indexed = 0;
    for (const l of lancamentos || []) {
      if (l.descricao) {
        await indexTransactionEmbedding(l.id, l.company_id, l.descricao);
        indexed++;
      }
    }
    const coverage = await getEmbeddingCoverageStats();
    return {
      ok: true,
      indexed,
      coverage,
      message: `${indexed} lançamentos reindexados com pgvector com sucesso.`,
    };
  });

export const saveByokKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { provider: Byok; apiKey: string; model?: string | null }) => {
    if (!(data?.provider in INTEGRATION)) throw new Error("Provedor inválido.");
    const apiKey = String(data?.apiKey || "").trim();
    if (apiKey.length < 10 || apiKey.length > 300 || /\s/.test(apiKey))
      throw new Error("Chave em formato inválido.");
    return {
      provider: data.provider,
      apiKey,
      model: data?.model ? String(data.model).slice(0, 80) : undefined,
    };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { saveIntegrationValues, recordIntegrationTest } = await import(
      "@/lib/common/integration-secrets.server"
    );
    const { testLlmConnection } = await import("@/lib/ai/ai-orchestrator.server");
    await testLlmConnection(data.provider, data.model);
    await saveIntegrationValues(
      INTEGRATION[data.provider],
      { api_key: data.apiKey },
      context.userId,
    );
    await recordIntegrationTest(INTEGRATION[data.provider], true, null);
    return { ok: true, message: "Chave validada e salva com segurança." };
  });

export const deleteByokKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { provider: Byok }) => {
    if (!(data?.provider in INTEGRATION)) throw new Error("Provedor inválido.");
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
      throw new Error("Mude para outro provedor antes de remover a chave do provedor ativo.");
    const { deleteIntegrationValues } = await import("@/lib/common/integration-secrets.server");
    await deleteIntegrationValues(INTEGRATION[data.provider]);
    return { ok: true };
  });
