// Converte áudio do WhatsApp em texto via Lovable AI (speech-to-text).
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export async function transcribeAudioBase64(base64: string, mime: string | null) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");
  const clean = base64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  const bin = atob(clean);
  if (!bin.length || bin.length > MAX_AUDIO_BYTES) throw new Error("Áudio vazio ou grande demais");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const type = (mime || "audio/ogg").split(";")[0].trim() || "audio/ogg";
  const ext = type.includes("mpeg") ? "mp3" : type.includes("mp4") ? "m4a" : type.includes("wav") ? "wav" : "ogg";
  const form = new FormData();
  form.append("model", "openai/gpt-transcribe");
  form.append("file", new File([bytes], `audio.${ext}`, { type }));
  form.append("response_format", "json");
  form.append("languages", "pt");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Transcrição falhou [${res.status}]: ${raw.slice(0, 300)}`);
  let text = "";
  try {
    text = String(JSON.parse(raw)?.text || "");
  } catch {
    text = raw;
  }
  return text.trim();
}

export function dataUrlParts(dataUrl: string) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  return m ? { mime: m[1], base64: m[2] } : null;
}
