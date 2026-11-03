/* eslint-disable @typescript-eslint/no-explicit-any */
// Seleção do provedor de IA: Lovable AI (padrão) ou BYOK OpenAI/Anthropic/OpenRouter/Gemini,
// um único ativo por vez. A chave nunca sai do servidor.
import type { ChatMsg } from "@/lib/ai/lovable-ai.server";
import { fetchAiProvider } from "@/lib/ai/ai-request.server";
import { AI_MODEL_OPTIONS, resolveModel, type AiMode } from "@/lib/ai/ai-model-rules";
import {
  partSupported,
  partsNeedingConversion,
  readGeminiText,
  toGeminiRequest,
  type ModelCaps,
} from "@/lib/ai/ai-media-rules";

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

export const BYOK_INTEGRATION = {
  openai: "ai_openai",
  anthropic: "ai_anthropic",
  openrouter: "ai_openrouter",
  gemini: "ai_gemini",
} as const;
export type ByokMode = keyof typeof BYOK_INTEGRATION;

async function byokKey(mode: ByokMode) {
  const { resolveIntegration } = await import("@/lib/common/integration-secrets.server");
  return (await resolveIntegration(BYOK_INTEGRATION[mode])).api_key || "";
}

/** Catálogo de modelos (OpenRouter/Gemini) lido do banco — nada fixo no código. */
export async function loadModelCatalog(): Promise<
  { provider: "openrouter" | "gemini"; model_id: string; label: string; supports_vision: boolean; supports_pdf: boolean; supports_audio: boolean }[]
> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as any)
    .from("ai_model_catalog")
    .select("provider,model_id,label,supports_vision,supports_pdf,supports_audio")
    .eq("active", true)
    .order("sort");
  return data ?? [];
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

/** Converte anexos que o modelo não lê (imagem/PDF/áudio) em texto via Lovable AI. */
async function convertUnsupportedMedia(messages: ChatMsg[], caps: ModelCaps): Promise<ChatMsg[]> {
  if (partsNeedingConversion(messages as any, caps).length === 0) return messages;
  const key = process.env.LOVABLE_API_KEY;
  const out: ChatMsg[] = [];
  for (const m of messages) {
    if (!Array.isArray(m.content)) {
      out.push(m);
      continue;
    }
    const parts: any[] = [];
    for (const p of m.content as any[]) {
      if (partSupported(p, caps)) {
        parts.push(p);
        continue;
      }
      let text = "[anexo não pôde ser lido]";
      if (key) {
        try {
          const res = await fetchAiProvider("Lovable AI", "https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3.8-flash",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Transcreva fielmente todo o texto e valores deste anexo (OCR/transcrição). Inclua datas, valores, estabelecimento e itens. Responda só com o conteúdo." },
                    p,
                  ],
                },
              ],
            }),
          });
          if (res.ok) {
            const d: any = await res.json();
            text = `[Conteúdo do anexo convertido em texto]\n${String(d?.choices?.[0]?.message?.content || "").trim()}`;
          }
        } catch (error) {
          console.error("[ai] conversão de anexo falhou:", error instanceof Error ? error.message : error);
        }
      }
      parts.push({ type: "text", text });
    }
    out.push({ ...m, content: parts });
  }
  return out;
}

export async function byokChat(mode: ByokMode, key: string, model: string, messages: ChatMsg[]) {
  if (mode === "openai") return openAiChat(key, model, messages);
  if (mode === "anthropic") return anthropicChat(key, model, messages);
  const catalog = await loadModelCatalog();
  const entry = catalog.find((c) => c.provider === mode && c.model_id === model);
  if (!entry) throw new Error("Modelo não está no catálogo ativo.");
  const prepared = await convertUnsupportedMedia(messages, {
    vision: entry.supports_vision,
    pdf: entry.supports_pdf,
    audio: entry.supports_audio,
  });
  return mode === "openrouter" ? openRouterChat(key, model, prepared) : geminiChat(key, model, prepared);
}

/** Retorna null quando o modo ativo é Lovable AI, ou quando o BYOK falha (cai para Lovable AI). */
export async function maybeByokChat(messages: ChatMsg[]): Promise<string | null> {
  const cfg = await getAiProviderConfig();
  if (!cfg || cfg.mode === "lovable" || cfg.test_ok !== true) return null;
  const mode = cfg.mode as ByokMode;
  if (!(mode in BYOK_INTEGRATION)) return null;
  const key = await byokKey(mode);
  if (!key) return null;
  const model = resolveModel(mode, cfg.model, cfg.optimized !== false);
  if (!model) return null;
  try {
    const out = await byokChat(mode, key, model, messages);
    if (!out) throw new Error("O provedor respondeu vazio.");
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

async function providerError(label: string, res: Response) {
  let detail = "";
  try {
    const body: any = await res.json();
    detail = String(body?.error?.message || body?.message || "").slice(0, 200);
  } catch {
    /* ignora */
  }
  return new Error(`${label} recusou a chamada (${res.status})${detail ? `: ${detail}` : ""}.`);
}

export async function openRouterChat(key: string, model: string, messages: ChatMsg[]) {
  const res = await fetchAiProvider("OpenRouter", "https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://mianota.lovable.app",
      "X-Title": "MIAnota",
    },
    body: JSON.stringify({ model, messages, max_tokens: 4000 }),
  });
  if (!res.ok) throw await providerError("OpenRouter", res);
  const data: any = await res.json();
  if (data?.error) throw new Error(`OpenRouter: ${String(data.error.message || "erro").slice(0, 200)}`);
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

export async function geminiChat(key: string, model: string, messages: ChatMsg[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetchAiProvider("Google Gemini", url, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(toGeminiRequest(messages as any)),
  });
  if (!res.ok) throw await providerError("Google Gemini", res);
  return readGeminiText(await res.json());
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
