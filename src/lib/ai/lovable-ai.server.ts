// Camada de compatibilidade retroativa para chamadores legados.
// Redireciona 100% das chamadas para o aiChat agnóstico de provedor sem exigir LOVABLE_API_KEY.
import { aiChat } from "@/lib/ai/ai-service.server";
import type { ChatMsg } from "@/lib/ai/ai-types";

export type { ChatMsg };

export interface LovableAiConfig {
  model?: string;
}

export async function lovableAiChat(
  messages: ChatMsg[],
  modelOrConfig?: string | LovableAiConfig,
): Promise<string> {
  const model = typeof modelOrConfig === "string" ? modelOrConfig : modelOrConfig?.model;
  return aiChat(messages, model ? { forceModel: model } : undefined);
}
