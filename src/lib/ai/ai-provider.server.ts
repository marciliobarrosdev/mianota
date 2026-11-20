/* eslint-disable @typescript-eslint/no-explicit-any */
// Adaptadores oficiais dos provedores de IA: Google Gemini, OpenRouter, DeepSeek, xAI/Grok, OpenAI e Anthropic.
// Chaves privadas de ambiente ou banco são lidas exclusivamente no servidor via resolveIntegration.
import type { ChatMsg } from "@/lib/ai/ai-types";
import { fetchAiProvider } from "@/lib/ai/ai-request.server";
import {
  AI_MODEL_OPTIONS,
  EMBEDDING_OPTIONS,
  resolveModel,
  type ActiveAiProvider,
  type AiMode,
} from "@/lib/ai/ai-model-rules";
import {
  circuitAfterFailure,
  circuitAfterSuccess,
  isProviderPaused,
  type CircuitState,
} from "@/lib/ai/ai-circuit-rules";
import {
  partSupported,
  partsNeedingConversion,
  readGeminiText,
  toGeminiRequest,
  type ModelCaps,
} from "@/lib/ai/ai-media-rules";

export { AI_MODEL_OPTIONS, EMBEDDING_OPTIONS };
export type { ActiveAiProvider, AiMode, ChatMsg };

let cache: { at: number; value: any } | null = null;

export async function getAiProviderConfig(fresh = false) {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.value;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("ai_provider_config")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    cache = {
      at: Date.now(),
      value: data ?? {
        mode: "gemini",
        model: "gemini-3.8-flash",
        optimized: true,
        fallback_enabled: false,
        embedding_provider: "gemini",
        embedding_model: "gemini-embedding-2",
        embedding_dimension: 768,
      },
    };
  } catch {
    cache = {
      at: Date.now(),
      value: {
        mode: "gemini",
        model: "gemini-3.8-flash",
        optimized: true,
        fallback_enabled: false,
        embedding_provider: "gemini",
        embedding_model: "gemini-embedding-2",
        embedding_dimension: 768,
      },
    };
  }
  return cache.value;
}

export function clearAiProviderCache() {
  cache = null;
}

export const AI_INTEGRATION_MAP = {
  gemini: "ai_gemini",
  openrouter: "ai_openrouter",
  deepseek: "ai_deepseek",
  xai: "ai_xai",
  openai: "ai_openai",
  anthropic: "ai_anthropic",
  lovable: "ai_gemini",
} as const;

export async function getProviderApiKey(provider: AiMode): Promise<string> {
  const integrationKey = AI_INTEGRATION_MAP[provider as keyof typeof AI_INTEGRATION_MAP];
  if (!integrationKey) return "";
  const { resolveIntegration } = await import("@/lib/common/integration-secrets.server");
  const secrets = await resolveIntegration(integrationKey as any);
  return secrets.api_key || "";
}

/** Catálogo de modelos lido do banco (ai_model_catalog) */
export async function loadModelCatalog(kind: "llm" | "embedding" = "llm"): Promise<any[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as any)
    .from("ai_model_catalog")
    .select("*")
    .eq("active", true)
    .eq("kind", kind)
    .order("sort");
  return data ?? [];
}

export async function recordProviderCircuit(message: string | null, circuit: CircuitState) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any)
      .from("ai_provider_config")
      .update({ last_error: message, ...circuit })
      .eq("id", true);
  } catch {
    /* ignora */
  }
}

/** Converte anexos que o modelo de destino não lê nativamente (imagem/PDF/áudio) em texto descritivo. */
export async function convertUnsupportedMedia(
  messages: ChatMsg[],
  caps: ModelCaps,
): Promise<ChatMsg[]> {
  if (partsNeedingConversion(messages as any, caps).length === 0) return messages;
  const geminiKey = await getProviderApiKey("gemini");
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
      if (geminiKey) {
        try {
          const converted = await geminiChat(geminiKey, "gemini-3.8-flash", [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Transcreva fielmente todo o texto e valores deste anexo (OCR/transcrição). Inclua datas, valores, estabelecimento e itens. Responda apenas com o conteúdo extraído.",
                },
                p,
              ],
            },
          ]);
          if (converted) {
            text = `[Conteúdo do anexo convertido em texto]\n${converted.trim()}`;
          }
        } catch (error) {
          console.error(
            "[ai] conversão de anexo falhou via Gemini:",
            error instanceof Error ? error.message : error,
          );
        }
      }
      parts.push({ type: "text", text });
    }
    out.push({ ...m, content: parts });
  }
  return out;
}

export function classifyAiError(
  error: unknown,
  status?: number,
): {
  type: "credential" | "permission" | "quota" | "transient" | "invalid_input" | "config";
  message: string;
} {
  const msg = error instanceof Error ? error.message : String(error || "Erro desconhecido");
  if (status === 401 || /unauthorized|api key|chave|invalid_api_key/i.test(msg)) {
    return { type: "credential", message: "Chave de API inválida, ausente ou não autorizada." };
  }
  if (status === 403 || /forbidden|access denied|permission/i.test(msg)) {
    return { type: "permission", message: "Acesso negado ao modelo ou recurso solicitado." };
  }
  if (status === 402 || /payment required|insufficient_quota|saldo|créditos esgotados/i.test(msg)) {
    return { type: "quota", message: "Limite de cota ou saldo esgotado no provedor." };
  }
  if (
    status === 429 ||
    status === 408 ||
    (status && status >= 500) ||
    /timeout|timed out|abort|rate limit|temporarily unavailable|overloaded/i.test(msg)
  ) {
    return { type: "transient", message: `Falha temporária no provedor (${msg}).` };
  }
  if (status === 400 || /bad request|invalid request|schema/i.test(msg)) {
    return { type: "invalid_input", message: `Requisição inválida: ${msg}` };
  }
  return { type: "config", message: msg };
}

async function providerError(label: string, res: Response): Promise<Error> {
  let detail = "";
  try {
    const body: any = await res.json();
    detail = String(body?.error?.message || body?.message || "").slice(0, 300);
  } catch {
    /* ignora */
  }
  const err = new Error(
    `${label} recusou a chamada (${res.status})${detail ? `: ${detail}` : ""}.`,
  );
  (err as any).status = res.status;
  return err;
}

// ==========================================
// 1. ADAPTADOR: GOOGLE GEMINI (DIRETO)
// ==========================================
export async function geminiChat(key: string, model: string, messages: ChatMsg[]): Promise<string> {
  if (!key) throw new Error("Chave do Google Gemini (GEMINI_API_KEY) não configurada.");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetchAiProvider("Google Gemini", url, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(toGeminiRequest(messages as any)),
  });
  if (!res.ok) throw await providerError("Google Gemini", res);
  return readGeminiText(await res.json());
}

export async function geminiEmbedding(
  key: string,
  model = "gemini-embedding-2",
  text: string,
  dimension = 768,
): Promise<number[]> {
  if (!key) throw new Error("Chave do Google Gemini (GEMINI_API_KEY) não configurada.");
  const cleanModel = model.replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:embedContent`;
  const res = await fetchAiProvider("Google Gemini Embedding", url, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${cleanModel}`,
      content: { parts: [{ text: text.slice(0, 8000) }] },
      outputDimensionality: dimension,
    }),
  });
  if (!res.ok) throw await providerError("Google Gemini Embedding", res);
  const data: any = await res.json();
  const vector = data?.embedding?.values;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("O Google Gemini não retornou vetor de embedding válido.");
  }
  return vector;
}

// ==========================================
// 2. ADAPTADOR: OPENROUTER
// ==========================================
export async function openRouterChat(
  key: string,
  model: string,
  messages: ChatMsg[],
): Promise<string> {
  if (!key) throw new Error("Chave do OpenRouter (OPENROUTER_API_KEY) não configurada.");
  const res = await fetchAiProvider("OpenRouter", "https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://mianota.dev",
      "X-Title": "MIAnota",
    },
    body: JSON.stringify({ model, messages, max_tokens: 4000 }),
  });
  if (!res.ok) throw await providerError("OpenRouter", res);
  const data: any = await res.json();
  if (data?.error)
    throw new Error(`OpenRouter: ${String(data.error.message || "erro").slice(0, 200)}`);
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

export async function openRouterEmbedding(
  key: string,
  model = "google/gemini-embedding-2",
  text: string,
): Promise<number[]> {
  if (!key) throw new Error("Chave do OpenRouter (OPENROUTER_API_KEY) não configurada.");
  const res = await fetchAiProvider("OpenRouter Embedding", "https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://mianota.dev",
      "X-Title": "MIAnota",
    },
    body: JSON.stringify({ model, input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw await providerError("OpenRouter Embedding", res);
  const data: any = await res.json();
  const vector = data?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("OpenRouter não retornou vetor de embedding válido.");
  }
  return vector;
}

// ==========================================
// 3. ADAPTADOR: DEEPSEEK
// ==========================================
export async function deepSeekChat(
  key: string,
  model: string,
  messages: ChatMsg[],
): Promise<string> {
  if (!key) throw new Error("Chave da DeepSeek (DEEPSEEK_API_KEY) não configurada.");
  const res = await fetchAiProvider("DeepSeek", "https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "deepseek-chat",
      messages: messages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      max_tokens: 4000,
    }),
  });
  if (!res.ok) throw await providerError("DeepSeek", res);
  const data: any = await res.json();
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

// ==========================================
// 4. ADAPTADOR: xAI / GROK
// ==========================================
export async function xAiChat(key: string, model: string, messages: ChatMsg[]): Promise<string> {
  if (!key) throw new Error("Chave da xAI / Grok (XAI_API_KEY) não configurada.");
  const res = await fetchAiProvider("xAI", "https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "grok-4.7",
      messages: messages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      max_tokens: 4000,
    }),
  });
  if (!res.ok) throw await providerError("xAI", res);
  const data: any = await res.json();
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

// ==========================================
// 5. ADAPTADOR: OPENAI
// ==========================================
export async function openAiChat(key: string, model: string, messages: ChatMsg[]): Promise<string> {
  if (!key) throw new Error("Chave da OpenAI (OPENAI_API_KEY) não configurada.");
  const res = await fetchAiProvider("OpenAI", "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_completion_tokens: 4000 }),
  });
  if (!res.ok) throw await providerError("OpenAI", res);
  const data: any = await res.json();
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

export async function openAiEmbedding(
  key: string,
  model = "text-embedding-3-small",
  text: string,
  dimension?: number,
): Promise<number[]> {
  if (!key) throw new Error("Chave da OpenAI (OPENAI_API_KEY) não configurada.");
  const body: any = { model, input: text.slice(0, 8000) };
  if (dimension) body.dimensions = dimension;
  const res = await fetchAiProvider("OpenAI Embedding", "https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await providerError("OpenAI Embedding", res);
  const data: any = await res.json();
  const vector = data?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("OpenAI não retornou vetor de embedding válido.");
  }
  return vector;
}

// ==========================================
// 6. ADAPTADOR: ANTHROPIC
// ==========================================
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

export async function anthropicChat(
  key: string,
  model: string,
  messages: ChatMsg[],
): Promise<string> {
  if (!key) throw new Error("Chave da Anthropic (ANTHROPIC_API_KEY) não configurada.");
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
  if (!res.ok) throw await providerError("Anthropic", res);
  const data: any = await res.json();
  return String((data?.content ?? []).find((c: any) => c.type === "text")?.text || "").trim();
}

// ==========================================
// DESPACHO UNIFICADO POR PROVEDOR
// ==========================================
export async function executeProviderChat(
  provider: AiMode,
  key: string,
  model: string,
  messages: ChatMsg[],
): Promise<string> {
  if (provider === "gemini") {
    return geminiChat(key, model, messages);
  }
  if (provider === "openrouter") {
    return openRouterChat(key, model, messages);
  }
  if (provider === "deepseek") {
    return deepSeekChat(key, model, messages);
  }
  if (provider === "xai") {
    return xAiChat(key, model, messages);
  }
  if (provider === "openai") {
    return openAiChat(key, model, messages);
  }
  if (provider === "anthropic") {
    return anthropicChat(key, model, messages);
  }
  // Se for lovable antigo, usa Gemini direto
  return geminiChat(key, "gemini-3.8-flash", messages);
}
