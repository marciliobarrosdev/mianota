// Transcrição de áudio oficial do MIAnota via Google Gemini ou OpenAI Whisper nativo.
// Totalmente independente de Lovable AI e sem exigir LOVABLE_API_KEY.
import {
  getAiProviderConfig,
  getProviderApiKey,
  geminiChat,
} from "@/lib/ai/ai-provider.server";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export async function transcribeAudioBase64(
  base64: string,
  mime: string | null,
): Promise<string> {
  const clean = base64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  const bin = atob(clean);
  if (!bin.length || bin.length > MAX_AUDIO_BYTES) {
    throw new Error("Áudio vazio ou grande demais.");
  }

  const rawMime = (mime || "audio/ogg").split(";")[0].trim() || "audio/ogg";
  const cfg = await getAiProviderConfig();

  // 1. Prioriza Google Gemini direto (gemini-3.8-flash nativo para áudio)
  const geminiKey = await getProviderApiKey("gemini");
  if (geminiKey) {
    try {
      const prompt =
        "Transcreva com máxima fidelidade e precisão este áudio em português brasileiro. Retorne APENAS o texto falado transcrito, sem introduções, explicações ou aspas. Se o áudio for inaudível ou não contiver fala reconhecível, responda exatamente: [ÁUDIO_INAUDÍVEL].";

      const out = await geminiChat(geminiKey, "gemini-3.8-flash", [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "file",
              file: {
                filename: "audio.ogg",
                file_data: `data:${rawMime};base64,${clean}`,
              },
            },
          ],
        },
      ]);

      const trimmed = out.trim();
      if (trimmed.includes("[ÁUDIO_INAUDÍVEL]")) {
        return "[áudio inaudível]";
      }
      if (trimmed) return trimmed;
    } catch (err) {
      console.warn(
        "[audio-transcribe] Gemini falhou, tentando rota alternativa:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // 2. Fallback para OpenAI Whisper (se OPENAI_API_KEY estiver configurada)
  const openAiKey = await getProviderApiKey("openai");
  if (openAiKey) {
    try {
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const ext = rawMime.includes("webm")
        ? "webm"
        : rawMime.includes("mpeg")
          ? "mp3"
          : rawMime.includes("mp4")
            ? "m4a"
            : rawMime.includes("wav")
              ? "wav"
              : "ogg";

      const form = new FormData();
      form.append("model", "whisper-1");
      form.append("file", new File([bytes], `audio.${ext}`, { type: rawMime }));
      form.append("response_format", "json");
      form.append("language", "pt");

      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openAiKey}` },
        body: form,
      });

      if (res.ok) {
        const d: any = await res.json();
        return String(d?.text || "").trim();
      }
    } catch (err) {
      console.warn(
        "[audio-transcribe] OpenAI Whisper falhou:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Se nenhum provedor com chave estiver acessível
  if (!geminiKey && !openAiKey) {
    throw new Error(
      "Nenhum provedor de transcrição configurado. Adicione GEMINI_API_KEY ou OPENAI_API_KEY no arquivo de ambiente.",
    );
  }

  return "[áudio não pôde ser transcrito]";
}

export function dataUrlParts(dataUrl: string) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  return m ? { mime: m[1], base64: m[2] } : null;
}
