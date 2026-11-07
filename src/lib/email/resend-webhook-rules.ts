// Pure helpers for Resend (Svix) webhook verification and event mapping.
// Uses Web Crypto so it runs on Workers.

const TOLERANCE_SECONDS = 5 * 60;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: ArrayBuffer): string {
  let s = "";
  const v = new Uint8Array(bytes);
  for (let i = 0; i < v.length; i++) s += String.fromCharCode(v[i]);
  return btoa(s);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function signSvix(secret: string, id: string, timestamp: string, body: string): Promise<string> {
  const keyBytes = b64ToBytes(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  return bytesToB64(sig);
}

export async function verifySvix(params: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
  nowSeconds?: number;
}): Promise<boolean> {
  const { secret, id, timestamp, signature, body } = params;
  if (!secret || !id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > TOLERANCE_SECONDS) return false;
  const expected = await signSvix(secret, id, timestamp, body);
  return signature
    .split(" ")
    .map((p) => p.split(",")[1] ?? "")
    .some((s) => safeEqual(s, expected));
}

export const EMAIL_EVENT_LABELS: Record<string, string> = {
  "email.sent": "Enviado",
  "email.delivered": "Entregue",
  "email.delivery_delayed": "Atrasado",
  "email.opened": "Aberto",
  "email.clicked": "Clicado",
  "email.bounced": "Devolvido",
  "email.complained": "Reclamação",
  "email.failed": "Falhou",
  "email.scheduled": "Agendado",
};

export function emailEventLabel(type: string): string {
  return EMAIL_EVENT_LABELS[type] ?? type;
}

export function mapResendEvent(payload: any): {
  event_type: string;
  message_id: string | null;
  recipient: string | null;
  subject: string | null;
  occurred_at: string | null;
} {
  const d = payload?.data ?? {};
  const to = Array.isArray(d.to) ? d.to[0] : d.to;
  return {
    event_type: String(payload?.type ?? "unknown").slice(0, 80),
    message_id: d.email_id ? String(d.email_id) : null,
    recipient: to ? String(to).slice(0, 320) : null,
    subject: d.subject ? String(d.subject).slice(0, 500) : null,
    occurred_at: payload?.created_at ? String(payload.created_at) : null,
  };
}
