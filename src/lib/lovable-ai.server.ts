// IA centralizada no Lovable AI. O projeto recebe LOVABLE_API_KEY de forma
// gerenciada; o aluno nunca informa ou armazena chaves de provedores no app.

import { LOVABLE_AI_MODEL } from "./lovable-ai-config";
import { fetchAiProvider } from "./ai-request.server";

export interface ChatMsg {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
        | { type: "file"; file: { filename: string; file_data: string } }
      >;
}

export interface LovableAiConfig {
  model?: string;
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function lovableAiChat(
  messages: ChatMsg[],
  modelOrConfig: string | LovableAiConfig = LOVABLE_AI_MODEL,
): Promise<string> {
  const cfg: LovableAiConfig =
    typeof modelOrConfig === "string" ? { model: modelOrConfig } : modelOrConfig;
  // BYOK opcional (OpenAI ou Anthropic) só quando ativado e testado no Master.
  const { maybeByokChat } = await import("./ai-provider.server");
  const byok = await maybeByokChat(messages);
  if (byok !== null) return byok;
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente.");
  // Modelo escolhido no Master vale quando o chamador usa o padrão e o modo otimizado está desligado.
  const { getAiProviderConfig } = await import("./ai-provider.server");
  const providerCfg = await getAiProviderConfig();
  const chosen =
    providerCfg?.mode === "lovable" && providerCfg?.optimized === false && providerCfg?.model
      ? String(providerCfg.model)
      : null;
  const requested = cfg.model || LOVABLE_AI_MODEL;
  const model = chosen && requested === LOVABLE_AI_MODEL ? chosen : requested;
  const res = await fetchAiProvider("Lovable AI", GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429)
      throw new Error("Limite de uso da IA atingido. Tente em alguns minutos.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados no workspace.");
    throw new Error(`Lovable AI: ${res.status} ${t}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.toString().trim() || "";
}
