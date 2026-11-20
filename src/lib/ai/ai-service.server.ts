// Interface oficial provider-agnostic para serviços de Inteligência Artificial do MIAnota.
// Totalmente independente de Lovable AI e conectada ao orquestrador com fallback.
import { orchestratedAiChat } from "@/lib/ai/ai-orchestrator.server";
import type { ChatMsg, AiExecutionOptions } from "@/lib/ai/ai-types";

export type { ChatMsg, AiExecutionOptions };

/**
 * Ponto de entrada padrão para chamadas de IA no MIAnota.
 * Executa o modelo ativo configurado no Master com suporte a fallback e circuit-breaker.
 */
export async function aiChat(
  messages: ChatMsg[],
  optionsOrModel?: string | AiExecutionOptions,
): Promise<string> {
  const options: AiExecutionOptions =
    typeof optionsOrModel === "string" ? { forceModel: optionsOrModel } : (optionsOrModel || {});

  return orchestratedAiChat(messages, options);
}

// Re-exportação com alias de compatibilidade transitória
export const chatWithAi = aiChat;
