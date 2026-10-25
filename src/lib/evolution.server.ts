// Wrapper server-only para a Evolution API v2.
// Arquivo *.server.ts é bloqueado do bundle client.

const supportNumber = String(process.env.SUPPORT_WHATSAPP || "").replace(/\D/g, "");
const SUPPORT_SUFFIX = supportNumber
  ? ` Se persistir, fale com o suporte: https://wa.me/${supportNumber}`
  : "";

async function env() {
  const { resolveIntegration } = await import("./integration-secrets.server");
  const cfg = await resolveIntegration("evolution");
  const url = cfg.api_url;
  const key = cfg.api_key;
  if (!url || !key) {
    throw new Error(
      `Servidor do WhatsApp ainda não preparado. O proprietário deve configurar e testar a Evolution em Super admin → Integrações antes de gerar o QR Code.${SUPPORT_SUFFIX}`,
    );
  }
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("protocol");
  } catch {
    throw new Error(
      `Endereço do servidor do WhatsApp inválido. O proprietário deve corrigir a URL em Super admin → Integrações.${SUPPORT_SUFFIX}`,
    );
  }
  return { url: url.replace(/\/+$/, ""), key };
}

async function evo<T = any>(path: string, init: RequestInit & { json?: any } = {}): Promise<T> {
  const { url, key } = await env();
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  let res: Response | null = null;
  let networkError: unknown = null;
  const attempts = (init.method || "GET").toUpperCase() === "GET" ? 3 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      res = await fetch(`${url}${path}`, {
        ...init,
        headers,
        body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      });
      if (![429, 502, 503, 504].includes(res.status) || attempt === attempts - 1) break;
    } catch (error) {
      networkError = error;
      if (attempt === attempts - 1) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
  }
  if (!res) {
    const message = networkError instanceof Error ? networkError.message : "falha de rede";
    throw new Error(`Evolution API indisponível: ${message}.${SUPPORT_SUFFIX}`);
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || text || `HTTP ${res.status}`;
    throw new Error(`Evolution API: ${msg}.${SUPPORT_SUFFIX}`);
  }
  return data as T;
}

export async function evoCreateInstance(instanceName: string, webhookUrl?: string) {
  // Evolution v2: POST /instance/create
  const body: any = {
    instanceName,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
  };
  if (webhookUrl) {
    body.webhook = {
      url: webhookUrl,
      byEvents: false,
      base64: false,
      events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE"],
    };
  }
  return evo(`/instance/create`, { method: "POST", json: body });
}

export async function evoConnect(
  instanceName: string,
): Promise<{ base64?: string; code?: string; pairingCode?: string }> {
  // GET /instance/connect/{instance} → { base64, code, pairingCode }
  return evo(`/instance/connect/${encodeURIComponent(instanceName)}`, { method: "GET" });
}

function asImageDataUrl(value: unknown, allowRawBase64 = false): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  if (text.startsWith("data:image/")) return text;
  const base64 = text.includes("base64,") ? text.split("base64,").pop()?.trim() : text;
  if (
    allowRawBase64 &&
    base64 &&
    base64.length > 120 &&
    /^[A-Za-z0-9+/=\s]+$/.test(base64) &&
    looksLikeImageBase64(base64)
  ) {
    return `data:image/png;base64,${base64.replace(/\s/g, "")}`;
  }
  return null;
}

function looksLikeImageBase64(base64: string) {
  try {
    const bin = atob(base64.replace(/\s/g, "").slice(0, 64));
    return (
      (bin.charCodeAt(0) === 0x89 && bin.slice(1, 4) === "PNG") ||
      (bin.charCodeAt(0) === 0xff && bin.charCodeAt(1) === 0xd8) ||
      (bin.slice(0, 4) === "RIFF" && bin.slice(8, 12) === "WEBP")
    );
  } catch {
    return false;
  }
}

function extractQrCode(payload: any): string | null {
  const candidates = [
    payload?.code,
    payload?.data?.code,
    payload?.qrcode?.code,
    payload?.data?.qrcode?.code,
    payload?.instance?.qrcode?.code,
    payload?.qrCode,
    payload?.qrcode,
    payload?.qr,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim() && !asImageDataUrl(value, false))
      return value.trim();
  }
  return null;
}

export function evoParseQrPayload(payload: any): {
  qrBase64: string | null;
  code: string | null;
  pairingCode: string | null;
} {
  const image =
    asImageDataUrl(payload?.base64, true) ||
    asImageDataUrl(payload?.data?.base64, true) ||
    asImageDataUrl(payload?.qrcode?.base64, true) ||
    asImageDataUrl(payload?.data?.qrcode?.base64, true) ||
    asImageDataUrl(payload?.instance?.qrcode?.base64, true) ||
    asImageDataUrl(payload?.qr?.base64, true) ||
    asImageDataUrl(payload?.qrcode, true) ||
    asImageDataUrl(payload?.qr, true);
  const code = extractQrCode(payload);
  const rawPairingCode =
    payload?.pairingCode ??
    payload?.data?.pairingCode ??
    payload?.qrcode?.pairingCode ??
    payload?.data?.qrcode?.pairingCode;
  const pairingCode =
    typeof rawPairingCode === "string" || typeof rawPairingCode === "number"
      ? String(rawPairingCode).trim() || null
      : null;

  // Evolution v2 normalmente já devolve a imagem em base64. Se a instalação
  // devolver apenas o payload bruto, não transformamos esse segredo em QR no
  // backend: mantemos o código de pareamento oficial quando ele existir e a
  // interface informa que o servidor precisa habilitar a resposta base64.
  const numericCode =
    code && /^\d{6,10}$/.test(code.replace(/[\s-]/g, "")) ? code.replace(/[\s-]/g, "") : null;
  return { qrBase64: image, code, pairingCode: pairingCode || numericCode };
}

export async function evoGetQr(
  instanceName: string,
): Promise<{ qrBase64: string | null; code: string | null; pairingCode: string | null }> {
  return evoParseQrPayload(await evoConnect(instanceName));
}

export async function evoState(
  instanceName: string,
): Promise<{ instance?: { state?: string }; state?: string }> {
  return evo(`/instance/connectionState/${encodeURIComponent(instanceName)}`, { method: "GET" });
}

export async function evoSetWebhook(instanceName: string, webhookUrl: string) {
  return evo(`/webhook/set/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    json: {
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE"],
      },
    },
  });
}

export async function evoSendText(instanceName: string, number: string, text: string) {
  return evo(`/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    json: { number, text },
  });
}

export async function evoGetMediaBase64(
  instanceName: string,
  message: any,
): Promise<{
  base64: string;
  mimetype: string | null;
}> {
  const data: any = await evo(
    `/chat/getBase64FromMediaMessage/${encodeURIComponent(instanceName)}`,
    { method: "POST", json: { message, convertToMp4: false } },
  );
  const base64 = String(data?.base64 || data?.data?.base64 || "")
    .replace(/^data:[^;]+;base64,/, "")
    .replace(/\s/g, "");
  if (!base64 || base64.length > 12_000_000) {
    throw new Error("A mídia recebida não pôde ser lida ou excede o limite seguro.");
  }
  const mimetype = String(data?.mimetype || data?.mediaType || data?.data?.mimetype || "").trim();
  return { base64, mimetype: mimetype || null };
}

export async function evoSendPresence(
  instanceName: string,
  number: string,
  presence: "composing" | "paused" | "available",
  delayMs = 1500,
) {
  try {
    await evo(`/chat/sendPresence/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      json: { number, presence, delay: delayMs },
    });
  } catch {
    // best-effort
  }
}

export async function evoLogout(instanceName: string) {
  return evo(`/instance/logout/${encodeURIComponent(instanceName)}`, { method: "DELETE" });
}

export async function evoDelete(instanceName: string) {
  return evo(`/instance/delete/${encodeURIComponent(instanceName)}`, { method: "DELETE" });
}

export async function evoFetchNumberFromInstance(instanceName: string): Promise<string | null> {
  try {
    const data: any = await evo(
      `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
      {
        method: "GET",
      },
    );
    const inst = Array.isArray(data) ? data[0] : (data?.[0] ?? data);
    return inst?.instance?.owner || inst?.owner || inst?.number || null;
  } catch {
    return null;
  }
}
