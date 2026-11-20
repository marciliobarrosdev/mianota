/* eslint-disable @typescript-eslint/no-explicit-any */
// Motor de Busca Semântica e Indexação de Embeddings (pgvector + Gemini Embedding 2)
// Garante que falhas de indexação ou busca nunca impeçam o registro financeiro.
import {
  geminiEmbedding,
  getAiProviderConfig,
  getProviderApiKey,
  openAiEmbedding,
  openRouterEmbedding,
} from "@/lib/ai/ai-provider.server";

function sha256(text: string): string {
  // Hash simples e estável para detectar edições de conteúdo
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash)}_${text.length}`;
}

export async function generateEmbeddingVector(
  text: string,
  preferredProvider?: "gemini" | "openrouter" | "openai",
  preferredModel?: string,
  preferredDimension?: number,
): Promise<{ vector: number[]; provider: string; model: string; dimension: number }> {
  const cfg = await getAiProviderConfig();
  const provider = preferredProvider || cfg.embedding_provider || "gemini";
  const model = preferredModel || cfg.embedding_model || "gemini-embedding-2";
  const dimension = preferredDimension || cfg.embedding_dimension || 768;

  const key = await getProviderApiKey(provider as any);
  if (!key) {
    throw new Error(`Chave ausente para o provedor de embedding ${provider}.`);
  }

  let vector: number[];
  if (provider === "gemini") {
    vector = await geminiEmbedding(key, model, text, dimension);
  } else if (provider === "openai") {
    vector = await openAiEmbedding(key, model, text, dimension);
  } else {
    vector = await openRouterEmbedding(key, model, text);
  }

  return { vector, provider, model, dimension: vector.length };
}

/**
 * Indexa um lançamento confirmado em segundo plano.
 * A falha de indexação é capturada e NUNCA quebra o lançamento.
 */
export async function indexTransactionEmbedding(
  lancamentoId: string,
  companyId: string,
  description: string,
): Promise<void> {
  if (!description || !description.trim()) return;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const contentHash = sha256(description.trim());

    // Verifica se já está indexado com o mesmo hash
    const { data: existing } = await (supabaseAdmin as any)
      .from("fin_lancamento_embedding")
      .select("id,content_hash")
      .eq("lancamento_id", lancamentoId)
      .maybeSingle();

    if (existing && existing.content_hash === contentHash) {
      return; // Conteúdo não mudou, indexação preservada
    }

    const { vector, provider, model, dimension } = await generateEmbeddingVector(description);

    // Formata o vetor para sintaxe pgvector "[0.1,0.2,...]"
    const vectorString = `[${vector.join(",")}]`;

    await (supabaseAdmin as any).from("fin_lancamento_embedding").upsert(
      {
        lancamento_id: lancamentoId,
        company_id: companyId,
        provider,
        model,
        dimension,
        index_version: 1,
        is_primary: true,
        embedding: vectorString,
        content_hash: contentHash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lancamento_id,provider,model" },
    );
  } catch (error) {
    console.warn(
      `[embeddings] Falha ao indexar lançamento ${lancamentoId} (não afeta o saldo):`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Busca semântica por descrição de lançamentos.
 * Se o embedding falhar, faz fallback transparente para busca textual SQL ILIKE.
 */
export async function searchTransactionsBySemantic(
  companyId: string,
  queryText: string,
  limit = 5,
): Promise<any[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Tentativa 1: Busca vetorial semântica usando pgvector
  try {
    const { vector } = await generateEmbeddingVector(queryText);
    const vectorString = `[${vector.join(",")}]`;

    const { data, error } = await (supabaseAdmin as any).rpc("search_lancamentos_semantic", {
      _company_id: companyId,
      _query_vector: vectorString,
      _limit: limit,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn(
      "[embeddings] Busca semântica indisponível, usando busca textual:",
      err instanceof Error ? err.message : err,
    );
  }

  // Tentativa 2 (Fallback): Busca textual padrão sobre lançamentos não cancelados
  const { data: textFallback } = await (supabaseAdmin as any)
    .from("fin_lancamento")
    .select(
      "id,descricao,valor_cents,tipo,status,competencia,vencimento,pago_em,anexo_url,observacao",
    )
    .eq("company_id", companyId)
    .neq("status", "cancelado")
    .ilike("descricao", `%${queryText.trim()}%`)
    .order("competencia", { ascending: false })
    .limit(limit);

  return textFallback ?? [];
}

/**
 * Estatísticas de cobertura do índice para exibição no Master
 */
export async function getEmbeddingCoverageStats(): Promise<{
  totalLancamentos: number;
  totalIndexed: number;
  coveragePct: number;
  provider: string;
  model: string;
}> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cfg = await getAiProviderConfig();

    const [totalRes, indexedRes] = await Promise.all([
      (supabaseAdmin as any)
        .from("fin_lancamento")
        .select("id", { count: "exact", head: true })
        .neq("status", "cancelado"),
      (supabaseAdmin as any)
        .from("fin_lancamento_embedding")
        .select("id", { count: "exact", head: true })
        .eq("is_primary", true),
    ]);

    const total = totalRes.count || 0;
    const indexed = indexedRes.count || 0;
    const pct = total > 0 ? Math.min(100, Math.round((indexed / total) * 100)) : 100;

    return {
      totalLancamentos: total,
      totalIndexed: indexed,
      coveragePct: pct,
      provider: cfg.embedding_provider || "gemini",
      model: cfg.embedding_model || "gemini-embedding-2",
    };
  } catch {
    return {
      totalLancamentos: 0,
      totalIndexed: 0,
      coveragePct: 100,
      provider: "gemini",
      model: "gemini-embedding-2",
    };
  }
}
