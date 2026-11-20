// Regras puras de escolha de modelo e provedores de IA (sem I/O) — testadas em tests/ai-model-rules.test.ts.

export type AiMode =
  | "gemini"
  | "openrouter"
  | "deepseek"
  | "xai"
  | "openai"
  | "anthropic"
  | "lovable";

export const AI_PROVIDERS = [
  "gemini",
  "openrouter",
  "deepseek",
  "xai",
  "openai",
  "anthropic",
] as const;

export type ActiveAiProvider = (typeof AI_PROVIDERS)[number];

export type ModelOption = {
  id: string;
  label: string;
  hint: string;
  kind?: "llm" | "embedding";
  supportsVision?: boolean;
  supportsPdf?: boolean;
  supportsAudio?: boolean;
  supportsStructured?: boolean;
  dimensions?: number[];
};

export const DEFAULT_AI_PROVIDER: ActiveAiProvider = "gemini";
export const DEFAULT_AI_MODEL = "gemini-3.8-flash";
export const DEFAULT_EMBEDDING_PROVIDER: "gemini" | "openrouter" | "openai" = "gemini";
export const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2";
export const DEFAULT_EMBEDDING_DIMENSION = 768;

export const AI_MODEL_OPTIONS: Record<AiMode, ModelOption[]> = {
  gemini: [
    {
      id: "gemini-3.8-flash",
      label: "Gemini 3.8 Flash (Padrão inicial)",
      hint: "Multimodal nativo (áudio, visão, PDF, structured)",
      supportsVision: true,
      supportsPdf: true,
      supportsAudio: true,
      supportsStructured: true,
    },
    {
      id: "gemini-3.6-flash",
      label: "Gemini 3.6 Flash",
      hint: "Rápido e econômico",
      supportsVision: true,
      supportsPdf: true,
      supportsAudio: true,
      supportsStructured: true,
    },
    {
      id: "gemini-3.5-flash-lite",
      label: "Gemini 3.5 Flash Lite",
      hint: "Altíssima velocidade",
      supportsVision: true,
      supportsPdf: true,
      supportsAudio: true,
      supportsStructured: true,
    },
    {
      id: "gemini-3.1-pro-preview",
      label: "Gemini 3.1 Pro",
      hint: "Maior capacidade analítica",
      supportsVision: true,
      supportsPdf: true,
      supportsAudio: true,
      supportsStructured: true,
    },
  ],
  openrouter: [
    {
      id: "google/gemini-3.8-flash",
      label: "Gemini 3.8 Flash (via OpenRouter)",
      hint: "Multimodal via gateway",
      supportsVision: true,
      supportsPdf: true,
      supportsAudio: true,
      supportsStructured: true,
    },
    {
      id: "anthropic/claude-3.5-sonnet",
      label: "Claude 3.5 Sonnet (OpenRouter)",
      hint: "Alta precisão com visão",
      supportsVision: true,
      supportsPdf: true,
      supportsAudio: false,
      supportsStructured: true,
    },
    {
      id: "deepseek/deepseek-chat",
      label: "DeepSeek Chat (OpenRouter)",
      hint: "Raciocínio econômico",
      supportsVision: false,
      supportsPdf: false,
      supportsAudio: false,
      supportsStructured: true,
    },
    {
      id: "meta-llama/llama-3.3-70b-instruct",
      label: "Llama 3.3 70B (OpenRouter)",
      hint: "Modelo aberto robusto",
      supportsVision: false,
      supportsPdf: false,
      supportsAudio: false,
      supportsStructured: true,
    },
  ],
  deepseek: [
    {
      id: "deepseek-chat",
      label: "DeepSeek Chat",
      hint: "Rápido e altamente econômico",
      supportsVision: false,
      supportsPdf: false,
      supportsAudio: false,
      supportsStructured: true,
    },
    {
      id: "deepseek-reasoner",
      label: "DeepSeek Reasoner (R1)",
      hint: "Raciocínio profundo passo a passo",
      supportsVision: false,
      supportsPdf: false,
      supportsAudio: false,
      supportsStructured: true,
    },
  ],
  xai: [
    {
      id: "grok-4.7",
      label: "Grok 4.7",
      hint: "Visão e raciocínio avançado xAI",
      supportsVision: true,
      supportsPdf: false,
      supportsAudio: false,
      supportsStructured: true,
    },
    {
      id: "grok-2-1212",
      label: "Grok 2",
      hint: "Modelo estável xAI",
      supportsVision: true,
      supportsPdf: false,
      supportsAudio: false,
      supportsStructured: true,
    },
  ],
  openai: [
    {
      id: "gpt-6-sol",
      label: "GPT-6 Sol",
      hint: "Próxima geração OpenAI",
      supportsVision: true,
      supportsPdf: false,
      supportsAudio: false,
      supportsStructured: true,
    },
    {
      id: "gpt-6-luna",
      label: "GPT-6 Luna",
      hint: "Alta velocidade e inteligência",
      supportsVision: true,
      supportsPdf: false,
      supportsAudio: false,
      supportsStructured: true,
    },
    {
      id: "gpt-5-mini",
      label: "GPT-5 Mini",
      hint: "Econômico e rápido",
      supportsVision: true,
      supportsPdf: false,
      supportsAudio: false,
      supportsStructured: true,
    },
  ],
  anthropic: [
    {
      id: "claude-sonnet-5-5",
      label: "Claude Sonnet 5.5",
      hint: "Excelente compreensão de texto e documentos",
      supportsVision: true,
      supportsPdf: true,
      supportsAudio: false,
      supportsStructured: true,
    },
    {
      id: "claude-haiku-5-5",
      label: "Claude Haiku 5.5",
      hint: "Rápido e econômico",
      supportsVision: true,
      supportsPdf: true,
      supportsAudio: false,
      supportsStructured: true,
    },
  ],
  // Modo legado transitório para instalações antigas
  lovable: [
    {
      id: "google/gemini-3.8-flash",
      label: "Gemini 3.8 Flash (legado)",
      hint: "Migre para Gemini direto no Master",
      supportsVision: true,
      supportsPdf: true,
      supportsAudio: true,
      supportsStructured: true,
    },
    {
      id: "google/gemini-3.1-pro-preview",
      label: "Gemini 3.1 Pro (legado)",
      hint: "Modelo pro legado",
      supportsVision: true,
      supportsPdf: true,
      supportsAudio: true,
      supportsStructured: true,
    },
  ],
};

/** Catálogo de Embeddings suportados por provedor */
export const EMBEDDING_OPTIONS: Record<string, ModelOption[]> = {
  gemini: [
    {
      id: "gemini-embedding-2",
      label: "Gemini Embedding 2 (Padrão inicial)",
      hint: "Dimensão 768 · Rápido e de alta precisão",
      kind: "embedding",
      dimensions: [768],
    },
    {
      id: "text-embedding-004",
      label: "Gemini Text Embedding 004",
      hint: "Dimensão 768",
      kind: "embedding",
      dimensions: [768],
    },
  ],
  openrouter: [
    {
      id: "google/gemini-embedding-2",
      label: "Gemini Embedding 2 (OpenRouter)",
      hint: "Dimensão 768",
      kind: "embedding",
      dimensions: [768],
    },
    {
      id: "mongodb/voyage-4",
      label: "Voyage 4 (OpenRouter)",
      hint: "Dimensão 1024",
      kind: "embedding",
      dimensions: [1024],
    },
    {
      id: "mongodb/voyage-4-large",
      label: "Voyage 4 Large (OpenRouter)",
      hint: "Dimensão 1536",
      kind: "embedding",
      dimensions: [1536],
    },
  ],
  openai: [
    {
      id: "text-embedding-3-small",
      label: "Text Embedding 3 Small",
      hint: "Dimensão 1536",
      kind: "embedding",
      dimensions: [1536],
    },
    {
      id: "text-embedding-3-large",
      label: "Text Embedding 3 Large",
      hint: "Dimensão 3072",
      kind: "embedding",
      dimensions: [3072],
    },
  ],
};

/** Modelo econômico usado quando o "Modo otimizado" está ligado. */
export const ECONOMY_MODEL: Record<AiMode, string> = {
  gemini: "gemini-3.8-flash",
  openrouter: "google/gemini-3.8-flash",
  deepseek: "deepseek-chat",
  xai: "grok-4.7",
  openai: "gpt-5-mini",
  anthropic: "claude-haiku-5-5",
  lovable: "google/gemini-3.8-flash",
};

/** Provedores cujo catálogo de modelos vem dinamicamente do gateway (ai_model_catalog). */
export const CATALOG_MODES = ["openrouter"] as const;
export function isCatalogMode(mode: string): boolean {
  return (CATALOG_MODES as readonly string[]).includes(mode);
}

export function isKnownModel(mode: AiMode, model: string | null | undefined): boolean {
  if (!model) return false;
  return (AI_MODEL_OPTIONS[mode] || []).some((m) => m.id === model);
}

/** Otimizado → modelo econômico; senão o modelo escolhido (se válido). */
export function resolveModel(
  mode: AiMode,
  chosen: string | null | undefined,
  optimized: boolean,
): string {
  if (optimized) return ECONOMY_MODEL[mode] || DEFAULT_AI_MODEL;
  if (isCatalogMode(mode)) return String(chosen || ECONOMY_MODEL[mode]);
  return isKnownModel(mode, chosen) ? String(chosen) : (ECONOMY_MODEL[mode] || DEFAULT_AI_MODEL);
}

export function resolveEmbeddingDimension(provider: string, model: string): number {
  const options = EMBEDDING_OPTIONS[provider] || [];
  const found = options.find((o) => o.id === model);
  return found?.dimensions?.[0] || 768;
}

/** Modelos que exigem reasoning_effort no chat completions. */
export function needsReasoningEffort(model: string): boolean {
  return /^openai\/gpt-(5|6)/.test(model);
}
