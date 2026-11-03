// Regras puras para provedores BYOK (sem I/O) — testadas em tests/ai-media-rules.test.ts.
type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: string } }
  | { type: "file"; file: { filename: string; file_data: string } };
export type RuleMsg = { role: "system" | "user" | "assistant"; content: string | Part[] };
export type ModelCaps = { vision: boolean; pdf: boolean; audio: boolean };

export function parseDataUrl(url: string): { mime: string; data: string } | null {
  const m = String(url || "").match(/^data:([^;]+);base64,(.+)$/s);
  return m ? { mime: m[1], data: m[2] } : null;
}

function partMime(part: Part): string | null {
  if (part.type === "text") return null;
  const url = part.type === "image_url" ? part.image_url.url : part.file.file_data;
  return parseDataUrl(url)?.mime ?? (part.type === "image_url" ? "image/*" : "application/octet-stream");
}

/** O modelo aceita esse anexo nativamente? */
export function partSupported(part: Part, caps: ModelCaps): boolean {
  const mime = partMime(part);
  if (!mime) return true;
  if (mime.startsWith("image/")) return caps.vision;
  if (mime === "application/pdf") return caps.pdf;
  if (mime.startsWith("audio/")) return caps.audio;
  return false;
}

/** Lista os anexos que precisam virar texto (OCR/transcrição) antes do envio. */
export function partsNeedingConversion(messages: RuleMsg[], caps: ModelCaps): Part[] {
  const out: Part[] = [];
  for (const m of messages)
    if (Array.isArray(m.content))
      for (const p of m.content) if (!partSupported(p, caps)) out.push(p);
  return out;
}

/** Converte mensagens no formato OpenAI para o corpo do Gemini generateContent. */
export function toGeminiRequest(messages: RuleMsg[]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : m.content.map((p) => (p.type === "text" ? p.text : "")).join("\n")))
    .filter(Boolean)
    .join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts:
        typeof m.content === "string"
          ? [{ text: m.content }]
          : m.content.map((p) => {
              if (p.type === "text") return { text: p.text };
              const url = p.type === "image_url" ? p.image_url.url : p.file.file_data;
              const d = parseDataUrl(url);
              return d ? { inline_data: { mime_type: d.mime, data: d.data } } : { text: "[anexo não suportado]" };
            }),
    }));
  return {
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    contents,
    generationConfig: { maxOutputTokens: 4000 },
  };
}

export function readGeminiText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: any) => (typeof p?.text === "string" ? p.text : "")).join("").trim();
}

/** Máscara exibida no painel: prefixo curto + 4 finais. */
export function maskKey(key: string): string {
  const k = String(key || "").trim();
  if (k.length < 8) return "••••";
  const prefix = k.match(/^[a-zA-Z]+-[a-zA-Z]+-|^[a-zA-Z]+-|^AIza/)?.[0] ?? "";
  return `${prefix}…${k.slice(-4)}`;
}
