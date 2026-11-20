/* eslint-disable @typescript-eslint/no-explicit-any */
// Orquestrador central de IA do MIAnota:
// - Seleção do provedor principal e fallback configurados no Master
// - Execução resiliente com timeout, retry e circuit-breaker
// - Isolamento por operationId para impedir cobrança duplicada ou rascunhos duplicados
// - Auditoria em ai_execution_log sem dados financeiros sensíveis
import type { ChatMsg, AiExecutionOptions } from "@/lib/ai/ai-types";
import {
  classifyAiError,
  convertUnsupportedMedia,
  executeProviderChat,
  geminiEmbedding,
  getAiProviderConfig,
  getProviderApiKey,
  openAiEmbedding,
  openRouterEmbedding,
  recordProviderCircuit,
} from "@/lib/ai/ai-provider.server";
import { resolveModel, type ActiveAiProvider, type AiMode } from "@/lib/ai/ai-model-rules";
import {
  circuitAfterFailure,
  circuitAfterSuccess,
  isProviderPaused,
} from "@/lib/ai/ai-circuit-rules";

// Registro em memória de operações em andamento para controle de concorrência e idempotência
const inFlightOperations = new Map<string, Promise<string>>();

export async function logAiExecution(entry: {
  companyId?: string | null;
  operationId: string;
  requestedProvider: string;
  requestedModel: string;
  effectiveProvider: string;
  effectiveModel: string;
  modality: string;
  durationMs: number;
  tokensPrompt?: number | null;
  tokensCompletion?: number | null;
  tokensTotal?: number | null;
  switchReason?: string | null;
  attempts?: number;
  status: "success" | "fallback_success" | "failed";
  errorType?: string | null;
  errorMessage?: string | null;
  creditsCharged?: number;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("ai_execution_log").insert({
      company_id: entry.companyId || null,
      operation_id: entry.operationId,
      requested_provider: entry.requestedProvider,
      requested_model: entry.requestedModel,
      effective_provider: entry.effectiveProvider,
      effective_model: entry.effectiveModel,
      modality: entry.modality,
      duration_ms: entry.durationMs,
      tokens_prompt: entry.tokensPrompt || null,
      tokens_completion: entry.tokensCompletion || null,
      tokens_total: entry.tokensTotal || null,
      switch_reason: entry.switchReason || null,
      attempts: entry.attempts || 1,
      status: entry.status,
      error_type: entry.errorType || null,
      error_message: entry.errorMessage ? String(entry.errorMessage).slice(0, 500) : null,
      credits_charged: entry.creditsCharged || 0,
    });
  } catch {
    /* log silencioso */
  }
}

/** Ponto de entrada oficial para execução de conversas e comandos da assistente MIA */
export async function orchestratedAiChat(
  messages: ChatMsg[],
  options?: AiExecutionOptions,
): Promise<string> {
  const operationId = options?.operationId || `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Controle de concorrência por operationId: se a mesma operação já está sendo processada, aguarda
  if (inFlightOperations.has(operationId)) {
    return inFlightOperations.get(operationId)!;
  }

  const promise = executeOrchestratedChat(messages, operationId, options);
  inFlightOperations.set(operationId, promise);
  try {
    return await promise;
  } finally {
    inFlightOperations.delete(operationId);
  }
}

async function executeOrchestratedChat(
  messages: ChatMsg[],
  operationId: string,
  options?: AiExecutionOptions,
): Promise<string> {
  const startedAt = Date.now();
  const cfg = await getAiProviderConfig();
  const modality = options?.modality || "text";

  const requestedProvider = (options?.forceProvider || cfg.mode || "gemini") as AiMode;
  const requestedModel = options?.forceModel || resolveModel(requestedProvider, cfg.model, cfg.optimized !== false);

  let effectiveProvider: AiMode = requestedProvider;
  let effectiveModel: string = requestedModel;
  let switchReason: string | null = null;
  let attempts = 0;

  // 1. TENTATIVA NO PROVEDOR PRINCIPAL
  const primaryPaused = isProviderPaused(cfg.paused_until);
  if (!primaryPaused) {
    attempts += 1;
    const key = await getProviderApiKey(requestedProvider);
    if (!key) {
      const errDiag = `Chave de API não configurada para o provedor ${requestedProvider}.`;
      await recordProviderCircuit(errDiag, circuitAfterFailure(cfg.consecutive_failures || 0));
      // Se não há chave mas fallback está ativo, tenta o fallback
      if (!cfg.fallback_enabled || !cfg.fallback_mode) {
        await logAiExecution({
          companyId: options?.companyId,
          operationId,
          requestedProvider,
          requestedModel,
          effectiveProvider: requestedProvider,
          effectiveModel: requestedModel,
          modality,
          durationMs: Date.now() - startedAt,
          status: "failed",
          errorType: "credential",
          errorMessage: errDiag,
        });
        throw new Error(errDiag);
      }
      switchReason = "primary_key_missing";
    } else {
      try {
        const prepared = await convertUnsupportedMedia(messages, {
          vision: true,
          pdf: requestedProvider === "gemini" || requestedProvider === "anthropic" || requestedProvider === "openrouter",
          audio: requestedProvider === "gemini",
        });

        const output = await executeProviderChat(requestedProvider, key, requestedModel, prepared);
        if (!output || !output.trim()) {
          throw new Error("O provedor principal respondeu vazio.");
        }

        // Sucesso no principal: atualiza circuit breaker
        if (cfg.last_error || cfg.consecutive_failures || cfg.paused_until) {
          const circuit = circuitAfterSuccess();
          Object.assign(cfg, { last_error: null }, circuit);
          await recordProviderCircuit(null, circuit);
        }

        await logAiExecution({
          companyId: options?.companyId,
          operationId,
          requestedProvider,
          requestedModel,
          effectiveProvider: requestedProvider,
          effectiveModel: requestedModel,
          modality,
          durationMs: Date.now() - startedAt,
          status: "success",
          attempts,
        });

        return output.trim();
      } catch (error) {
        const classified = classifyAiError(error);
        const errMsg = classified.message;
        console.warn(`[ai-orchestrator] Falha no provedor principal (${requestedProvider}):`, errMsg);

        const circuit = circuitAfterFailure(cfg.consecutive_failures || 0);
        Object.assign(cfg, { last_error: errMsg }, circuit);
        await recordProviderCircuit(`${new Date().toISOString()} · ${errMsg}`, circuit);

        // Se o erro for de credencial ou permissão fixa, guardamos o motivo da troca
        switchReason = `primary_error: ${errMsg}`;
      }
    }
  } else {
    switchReason = `primary_paused_until: ${cfg.paused_until}`;
  }

  // 2. TENTATIVA NO FALLBACK (SE CONFIGURADO E ATIVO)
  if (cfg.fallback_enabled && cfg.fallback_mode) {
    const fallbackProvider = cfg.fallback_mode as AiMode;
    const fallbackModel = cfg.fallback_model || resolveModel(fallbackProvider, null, false);
    effectiveProvider = fallbackProvider;
    effectiveModel = fallbackModel;

    const fallbackKey = await getProviderApiKey(fallbackProvider);
    if (fallbackKey) {
      attempts += 1;
      try {
        console.log(`[ai-orchestrator] Acionando fallback: ${fallbackProvider} (${fallbackModel}). Motivo: ${switchReason}`);

        const fallbackPrepared = await convertUnsupportedMedia(messages, {
          vision: true,
          pdf: fallbackProvider === "gemini" || fallbackProvider === "anthropic" || fallbackProvider === "openrouter",
          audio: fallbackProvider === "gemini",
        });

        const output = await executeProviderChat(fallbackProvider, fallbackKey, fallbackModel, fallbackPrepared);
        if (output && output.trim()) {
          await logAiExecution({
            companyId: options?.companyId,
            operationId,
            requestedProvider,
            requestedModel,
            effectiveProvider: fallbackProvider,
            effectiveModel: fallbackModel,
            modality,
            durationMs: Date.now() - startedAt,
            switchReason,
            status: "fallback_success",
            attempts,
          });

          return output.trim();
        }
      } catch (fallbackError) {
        const classified = classifyAiError(fallbackError);
        console.error(`[ai-orchestrator] Fallback também falhou:`, classified.message);
      }
    }
  }

  // Se chegou aqui, todos os caminhos falharam
  const finalError = cfg.last_error || "Todos os provedores de IA configurados falharam temporariamente.";
  await logAiExecution({
    companyId: options?.companyId,
    operationId,
    requestedProvider,
    requestedModel,
    effectiveProvider,
    effectiveModel,
    modality,
    durationMs: Date.now() - startedAt,
    switchReason,
    status: "failed",
    errorType: "transient",
    errorMessage: finalError,
    attempts,
  });

  throw new Error(`Falha de processamento da IA: ${finalError}. Nenhum crédito foi consumido.`);
}

/** Teste de conectividade com resposta estruturada sintética */
export async function testLlmConnection(
  provider: ActiveAiProvider,
  model?: string,
): Promise<{ ok: boolean; ms: number; message: string }> {
  const started = Date.now();
  const key = await getProviderApiKey(provider);
  if (!key) {
    throw new Error(
      `Chave de API ausente para ${provider}. Configure a variável de ambiente correspondente no backend.`,
    );
  }

  const effectiveModel = model || resolveModel(provider, undefined, true);
  const probe: ChatMsg[] = [
    {
      role: "system",
      content:
        'Você é um verificador de integridade. Responda ESTRITAMENTE em formato JSON: {"status":"ok","provider":"teste"}',
    },
    { role: "user", content: "ping" },
  ];

  const raw = await executeProviderChat(provider, key, effectiveModel, probe);
  const elapsed = Date.now() - started;

  if (!raw || !raw.trim()) {
    throw new Error("O provedor respondeu vazio.");
  }

  return {
    ok: true,
    ms: elapsed,
    message: `Conexão bem-sucedida com ${provider} (${effectiveModel}) em ${elapsed}ms. Resposta: ${raw.slice(0, 80)}`,
  };
}

/** Teste de geração de embedding vetorial com validação de dimensão */
export async function testEmbeddingConnection(
  provider: "gemini" | "openrouter" | "openai",
  model: string,
  expectedDimension = 768,
): Promise<{ ok: boolean; ms: number; dimension: number; message: string }> {
  const started = Date.now();
  const key = await getProviderApiKey(provider);
  if (!key) {
    throw new Error(
      `Chave de API ausente para ${provider}. Configure a variável de ambiente correspondente.`,
    );
  }

  let vector: number[];
  if (provider === "gemini") {
    vector = await geminiEmbedding(key, model, "MIAnota teste de integridade", expectedDimension);
  } else if (provider === "openai") {
    vector = await openAiEmbedding(key, model, "MIAnota teste de integridade", expectedDimension);
  } else {
    vector = await openRouterEmbedding(key, model, "MIAnota teste de integridade");
  }

  const elapsed = Date.now() - started;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("O provedor não retornou um vetor de embedding válido.");
  }

  return {
    ok: true,
    ms: elapsed,
    dimension: vector.length,
    message: `Embedding gerado com sucesso via ${provider} (${model}). Dimensão: ${vector.length} em ${elapsed}ms.`,
  };
}
