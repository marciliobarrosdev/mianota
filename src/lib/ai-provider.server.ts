/* eslint-disable @typescript-eslint/no-explicit-any */
// Seleção do provedor de IA: Lovable AI (padrão) ou BYOK OpenAI/Anthropic,
// um único ativo por vez. A chave nunca sai do servidor.
import type { ChatMsg } from "./lovable-ai.server";
import { LOVABLE_AI_MODEL } from "./lovable-ai-config";
import { fetchAiProvider } from "./ai-request.server";

export type AiMode = "lovable" | "openai" | "anthropic";

export const AI_MODEL_OPTIONS: Record<AiMode, { id: string; label: string; hint: string }[]> = {
  lovable: [
    {
      id: LOVABLE_AI_MODEL,
      label: "Padrão do app (Flash)",
      hint: "Rápido e econômico (recomendado)",
    },
    {
      id: "google/gemini-2.5-flash",
      label: "Gemini 2.5 Flash",
      hint: "Equilíbrio custo/qualidade",
    },
    { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Mais qualidade, mais custo" },
    { id: "openai/gpt-5-mini", label: "GPT-5 Mini", hint: "Bom raciocínio, custo médio" },
  ],
  openai: [
    { id: "gpt-5-mini", label: "GPT-5 Mini", hint: "Custo médio" },
    { id: "gpt-5", label: "GPT-5", hint: "Mais qualidade, mais custo" },
  ],
  anthropic: [
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", hint: "Rápido e econômico" },
    { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", hint: "Mais qualidade, mais custo" },
  ],
};

let cache: { at: number; value: any } | null = null;

export async function getAiProviderConfig(fresh = false) {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return cache.value;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("ai_provider_config")
      .select("mode,model,optimized,test_ok")
      .eq("id", true)
      .maybeSingle();
    cache = { at: Date.now(), value: data ?? { mode: "lovable" } };
  } catch {
    cache = { at: Date.now(), value: { mode: "lovable" } };
  }
  return cache.value;
}

export function clearAiProviderCache() {
  cache = null;
}

async function byokKey(mode: "openai" | "anthropic") {
  const { resolveIntegration } = await import("./integration-secrets.server");
  return (await resolveIntegration(mode === "openai" ? "ai_openai" : "ai_anthropic")).api_key || "";
}

/** Retorna null quando o modo ativo é Lovable AI (ou BYOK indisponível). */
export async function maybeByokChat(messages: ChatMsg[]): Promise<string | null> {
  const cfg = await getAiProviderConfig();
  if (!cfg || cfg.mode === "lovable" || cfg.test_ok !== true) return null;
  const mode = cfg.mode as "openai" | "anthropic";
  const key = await byokKey(mode);
  if (!key) return null;
  const model = cfg.model || AI_MODEL_OPTIONS[mode][0].id;
  return mode === "openai" ? openAiChat(key, model, messages) : anthropicChat(key, model, messages);
}

export async function openAiChat(key: string, model: string, messages: ChatMsg[]) {
  const res = await fetchAiProvider("OpenAI", "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) throw new Error(`OpenAI recusou a chamada (${res.status}).`);
  const data: any = await res.json();
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

function toAnthropicContent(content: ChatMsg["content"]) {
  if (typeof content === "string") return content;
  return content.map((part: any) => {
    if (part.type === "text") return { type: "text", text: part.text };
    const url = part.type === "image_url" ? part.image_url.url : part.file?.file_data || "";
    const match = String(url).match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return { type: "text", text: "[anexo não suportado]" };
    return match[1] === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: match[1], data: match[2] } }
      : { type: "image", source: { type: "base64", media_type: match[1], data: match[2] } };
  });
}

export async function anthropicChat(key: string, model: string, messages: ChatMsg[]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n\n");
  const res = await fetchAiProvider("Anthropic", "https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system: system || undefined,
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: toAnthropicContent(m.content) })),
    }),
  });
  if (!res.ok) throw new Error(`Anthropic recusou a chamada (${res.status}).`);
  const data: any = await res.json();
  return String((data?.content ?? []).find((c: any) => c.type === "text")?.text || "").trim();
}
