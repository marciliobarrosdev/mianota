// Regras puras de escolha de modelo (sem I/O) — testadas em tests/ai-model-rules.test.ts.
export type AiMode = "lovable" | "openai" | "anthropic" | "openrouter" | "gemini";
/** Provedores cujo catálogo de modelos vem do banco (ai_model_catalog). */
export const CATALOG_MODES = ["openrouter", "gemini"] as const;
export function isCatalogMode(mode: string): mode is "openrouter" | "gemini" {
  return (CATALOG_MODES as readonly string[]).includes(mode);
}
export type ModelOption = { id: string; label: string; hint: string };

export const LOVABLE_DEFAULT_MODEL = "google/gemini-3.8-flash";

export const AI_MODEL_OPTIONS: Record<AiMode, ModelOption[]> = {
  lovable: [
    { id: LOVABLE_DEFAULT_MODEL, label: "Gemini 3.8 Flash (padrão)", hint: "Rápido e econômico" },
    { id: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", hint: "O mais barato" },
    { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", hint: "Mais qualidade" },
    { id: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini", hint: "Bom raciocínio, custo médio" },
    { id: "openai/gpt-6-astra", label: "GPT-6 Astra", hint: "Máxima qualidade, mais custo" },
  ],
  openai: [
    { id: "gpt-5-mini", label: "GPT-5 Mini", hint: "Rápido e econômico" },
    { id: "gpt-5-nano", label: "GPT-5 Nano", hint: "O mais barato" },
    { id: "gpt-5", label: "GPT-5", hint: "Mais qualidade" },
    { id: "gpt-5.2", label: "GPT-5.2", hint: "Máxima qualidade, mais custo" },
  ],
  anthropic: [
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", hint: "Rápido e econômico" },
    { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", hint: "Mais qualidade" },
    { id: "claude-opus-4-1", label: "Claude Opus 4.1", hint: "Máxima qualidade, mais custo" },
  ],
  // Catálogo carregado do banco em tempo de execução.
  openrouter: [],
  gemini: [],
};

/** Modelo econômico usado quando o "Modo otimizado" está ligado. */
export const ECONOMY_MODEL: Record<AiMode, string> = {
  lovable: LOVABLE_DEFAULT_MODEL,
  openai: "gpt-5-mini",
  anthropic: "claude-haiku-4-5",
  openrouter: "",
  gemini: "",
};

export function isKnownModel(mode: AiMode, model: string | null | undefined) {
  return !!model && AI_MODEL_OPTIONS[mode].some((m) => m.id === model);
}

/** Otimizado → modelo econômico; senão o modelo escolhido (se válido). */
export function resolveModel(
  mode: AiMode,
  chosen: string | null | undefined,
  optimized: boolean,
): string {
  // Provedores de catálogo: o modelo ativado no Master é sempre o usado (validado ao ativar).
  if (isCatalogMode(mode)) return String(chosen || "");
  if (optimized) return ECONOMY_MODEL[mode];
  return isKnownModel(mode, chosen) ? String(chosen) : ECONOMY_MODEL[mode];
}

/** Modelos do gateway que exigem reasoning_effort no chat completions. */
export function needsReasoningEffort(model: string) {
  return /^openai\/gpt-(5|6)/.test(model);
}
