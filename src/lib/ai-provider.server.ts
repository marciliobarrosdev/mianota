/* eslint-disable @typescript-eslint/no-explicit-any */
// Seleção do provedor de IA: Lovable AI (padrão) ou BYOK OpenAI/Anthropic,
// um único ativo por vez. A chave nunca sai do servidor.
import type { ChatMsg } from "./lovable-ai.server";
import { fetchAiProvider } from "./ai-request.server";
import { AI_MODEL_OPTIONS, resolveModel, type AiMode } from "./ai-model-rules";

export { AI_MODEL_OPTIONS };
export type { AiMode };

let cache: { at: number; value: any } | null = null;

export async function getAiProviderConfig(fresh = false) {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return cache.value;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("ai_provider_config")
      .select("mode,model,optimized,test_ok,last_error")
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

async function recordByokError(message: string | null) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any)
      .from("ai_provider_config")
      .update({ last_error: message })
      .eq("id", true);
  } catch {
    /* ignora */
  }
}

/** Retorna null quando o modo ativo é Lovable AI, ou quando o BYOK falha (cai para Lovable AI). */
export async function maybeByokChat(messages: ChatMsg[]): Promise<string | null> {
  const cfg = await getAiProviderConfig();
  if (!cfg || cfg.mode === "lovable" || cfg.test_ok !== true) return null;
  const mode = cfg.mode as "openai" | "anthropic";
  const key = await byokKey(mode);
  if (!key) return null;
  const model = resolveModel(mode, cfg.model, cfg.optimized !== false);
  try {
    const out =
      mode === "openai"
        ? await openAiChat(key, model, messages)
        : await anthropicChat(key, model, messages);
    if (cfg.last_error) {
      cfg.last_error = null;
      await recordByokError(null);
    }
    return out;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no provedor.";
    console.error("[ai] BYOK falhou, usando Lovable AI:", message);
    cfg.last_error = message;
    await recordByokError(`${new Date().toISOString()} · ${message}`);
    return null;
  }
}

export async function openAiChat(key: string, model: string, messages: ChatMsg[]) {
  const res = await fetchAiProvider("OpenAI", "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_completion_tokens: 4000 }),
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
      max_tokens: 4000,
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
