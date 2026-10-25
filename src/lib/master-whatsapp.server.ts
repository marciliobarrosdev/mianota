/* eslint-disable @typescript-eslint/no-explicit-any */
import { resolveIntegration } from "./integration-secrets.server";
import { SUGGESTED_META_TEMPLATE_BODY } from "./purchase-onboarding-rules";

export type SupportProvider = "evolution" | "meta";

export function digits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

export async function platformDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export async function getOrCreateSupportChannel() {
  const db = await platformDb();
  const existing = await db
    .from("platform_support_channel")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data;
  const created = await db
    .from("platform_support_channel")
    .insert({ id: true })
    .select("*")
    .single();
  if (created.error) throw new Error(created.error.message);
  return created.data;
}

export async function updateSupportChannel(values: Record<string, unknown>) {
  const db = await platformDb();
  // O canal ativo só muda pela RPC switch_central_channel (protegida por gatilho).
  const { active_provider: _ignored, ...safeValues } = values;
  values = safeValues;
  await getOrCreateSupportChannel();
  const result = await db
    .from("platform_support_channel")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("*")
    .single();
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function testMetaConnection() {
  const cfg = await resolveIntegration("whatsapp_meta");
  if (!cfg.waba_id || !cfg.phone_number_id || !cfg.access_token || !cfg.app_secret) {
    throw new Error("Preencha WABA ID, Phone Number ID, token permanente e App Secret.");
  }
  const version = /^v\d+\.\d+$/.test(cfg.api_version || "") ? cfg.api_version : "v24.0";
  const response = await fetch(
    `https://graph.facebook.com/${version}/${encodeURIComponent(cfg.phone_number_id)}?fields=display_phone_number,verified_name,quality_rating`,
    { headers: { Authorization: `Bearer ${cfg.access_token}` } },
  );
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `A Meta recusou as credenciais (${response.status}).`);
  }
  return {
    wabaId: cfg.waba_id,
    phoneNumberId: cfg.phone_number_id,
    displayPhone: String(data?.display_phone_number || ""),
    verifiedName: String(data?.verified_name || ""),
    qualityRating: String(data?.quality_rating || ""),
    version,
  };
}

export async function subscribeMetaApp() {
  const cfg = await resolveIntegration("whatsapp_meta");
  const version = /^v\d+\.\d+$/.test(cfg.api_version || "") ? cfg.api_version : "v24.0";
  const response = await fetch(
    `https://graph.facebook.com/${version}/${encodeURIComponent(cfg.waba_id)}/subscribed_apps`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.access_token}`, "Content-Type": "application/json" },
      body: "{}",
    },
  );
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok || data?.success !== true) {
    throw new Error(
      data?.error?.message || "Não foi possível assinar os eventos da conta WhatsApp.",
    );
  }
}

export async function sendMetaText(number: string, body: string) {
  const cfg = await resolveIntegration("whatsapp_meta");
  const version = /^v\d+\.\d+$/.test(cfg.api_version || "") ? cfg.api_version : "v24.0";
  const response = await fetch(
    `https://graph.facebook.com/${version}/${encodeURIComponent(cfg.phone_number_id)}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: digits(number),
        type: "text",
        text: { preview_url: false, body },
      }),
    },
  );
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data?.error?.message || `A Meta recusou o envio (${response.status}).`);
  return String(data?.messages?.[0]?.id || "") || null;
}

function metaVersion(cfg: Record<string, string>) {
  return /^v\d+\.\d+$/.test(cfg.api_version || "") ? cfg.api_version : "v24.0";
}

/** Envia um payload completo (ex.: template) pela API oficial e devolve o id da mensagem. */
export async function sendMetaPayload(payload: Record<string, unknown>) {
  const cfg = await resolveIntegration("whatsapp_meta");
  if (!cfg.phone_number_id || !cfg.access_token)
    throw new Error("API oficial Meta não configurada.");
  const response = await fetch(
    `https://graph.facebook.com/${metaVersion(cfg)}/${encodeURIComponent(cfg.phone_number_id)}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data?.error?.message || `A Meta recusou o envio (${response.status}).`);
  return String(data?.messages?.[0]?.id || "") || null;
}

export const SUGGESTED_TEMPLATE_BODY = SUGGESTED_META_TEMPLATE_BODY;

/** Lê o template configurado na Meta: status e se tem botão de resposta rápida. */
export async function getMetaTemplateInfo(name: string, language: string) {
  const cfg = await resolveIntegration("whatsapp_meta");
  if (!cfg.waba_id || !cfg.access_token) throw new Error("API oficial Meta não configurada.");
  const response = await fetch(
    `https://graph.facebook.com/${metaVersion(cfg)}/${encodeURIComponent(cfg.waba_id)}/message_templates?name=${encodeURIComponent(name)}&fields=name,status,language,components&limit=50`,
    { headers: { Authorization: `Bearer ${cfg.access_token}` } },
  );
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data?.error?.message || `A Meta recusou a consulta (${response.status}).`);
  const match = (data?.data ?? []).find((t: any) => t.name === name && t.language === language);
  if (!match) return { status: "MISSING", hasButton: false, bodyVariables: 0, bodyText: "" };
  const body = (match.components ?? []).find((c: any) => c.type === "BODY");
  const buttons = (match.components ?? []).find((c: any) => c.type === "BUTTONS");
  return {
    status: String(match.status || "UNKNOWN"),
    hasButton: Boolean(buttons?.buttons?.[0]?.type === "QUICK_REPLY"),
    bodyVariables: (String(body?.text || "").match(/\{\{\d+\}\}/g) || []).length,
    bodyText: String(body?.text || ""),
  };
}

export async function createSuggestedMetaTemplate(
  name: string,
  language: string,
  body = SUGGESTED_META_TEMPLATE_BODY,
) {
  const cfg = await resolveIntegration("whatsapp_meta");
  if (!cfg.waba_id || !cfg.access_token) throw new Error("API oficial Meta não configurada.");
  const response = await fetch(
    `https://graph.facebook.com/${metaVersion(cfg)}/${encodeURIComponent(cfg.waba_id)}/message_templates`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        language,
        category: "UTILITY",
        components: [
          {
            type: "BODY",
            text: body,
            example: { body_text: [["Ana", "K7P2QX"]] },
          },
          { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Começar" }] },
        ],
      }),
    },
  );
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data?.error?.message || `A Meta recusou o template (${response.status}).`);
  return String(data?.status || "PENDING");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export async function getMetaMediaDataUrl(mediaId: string) {
  if (!mediaId) return null;
  const cfg = await resolveIntegration("whatsapp_meta");
  const version = /^v\d+\.\d+$/.test(cfg.api_version || "") ? cfg.api_version : "v24.0";
  const metadataResponse = await fetch(
    `https://graph.facebook.com/${version}/${encodeURIComponent(mediaId)}`,
    { headers: { Authorization: `Bearer ${cfg.access_token}` } },
  );
  const metadata: any = await metadataResponse.json().catch(() => ({}));
  if (!metadataResponse.ok || !metadata?.url) {
    throw new Error(metadata?.error?.message || "A Meta não devolveu a mídia recebida.");
  }
  const mediaResponse = await fetch(String(metadata.url), {
    headers: { Authorization: `Bearer ${cfg.access_token}` },
  });
  if (!mediaResponse.ok) throw new Error("Não foi possível baixar a mídia recebida da Meta.");
  const mime = String(
    metadata?.mime_type || mediaResponse.headers.get("content-type") || "image/jpeg",
  );
  const bytes = new Uint8Array(await mediaResponse.arrayBuffer());
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

async function findCompanyByPhone(phone: string) {
  const db = await platformDb();
  const identity = await db
    .from("fin_whatsapp_identity")
    .select("company_id")
    .eq("phone_e164", `+${phone}`)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!identity.error && identity.data?.company_id) {
    const linkedCompany = await db
      .from("company")
      .select("id,nome,nome_fantasia,telefone")
      .eq("id", identity.data.company_id)
      .maybeSingle();
    if (!linkedCompany.error && linkedCompany.data) return linkedCompany.data;
  }
  const rows = await db.from("company").select("id,nome,nome_fantasia,telefone").limit(2000);
  if (rows.error) return null;
  return (
    (rows.data ?? []).find((row: any) => {
      const candidate = digits(row.telefone);
      return (
        candidate && (candidate === phone || candidate.endsWith(phone) || phone.endsWith(candidate))
      );
    }) ?? null
  );
}

export async function persistSupportInbound(input: {
  phone: string;
  contactName?: string | null;
  body: string;
  messageType?: string;
  providerMessageId?: string | null;
  payload?: unknown;
}) {
  const db = await platformDb();
  const phone = digits(input.phone);
  if (!phone || !input.body.trim()) return { duplicate: false, conversationId: null };
  if (input.providerMessageId) {
    const existing = await db
      .from("platform_support_message")
      .select("id")
      .eq("provider_message_id", input.providerMessageId)
      .maybeSingle();
    if (existing.data) return { duplicate: true, conversationId: null };
  }
  const company = await findCompanyByPhone(phone);
  const now = new Date().toISOString();
  const conversation = await db
    .from("platform_support_conversation")
    .upsert(
      {
        phone_e164: phone,
        contact_name: input.contactName?.trim() || null,
        subscriber_company_id: company?.id || null,
        status: "open",
        last_message_at: now,
        last_message_preview: input.body.slice(0, 180),
        updated_at: now,
      },
      { onConflict: "phone_e164" },
    )
    .select("id,unread_count")
    .single();
  if (conversation.error) throw new Error(conversation.error.message);
  await db
    .from("platform_support_conversation")
    .update({ unread_count: Number(conversation.data.unread_count || 0) + 1 })
    .eq("id", conversation.data.id);
  const inserted = await db.from("platform_support_message").insert({
    conversation_id: conversation.data.id,
    provider_message_id: input.providerMessageId || null,
    direction: "inbound",
    sender_type: "subscriber",
    message_type: input.messageType || "text",
    body: input.body.trim().slice(0, 5000),
    delivery_status: "received",
    provider_payload: input.payload || {},
    created_at: now,
  });
  if (inserted.error && inserted.error.code !== "23505") throw new Error(inserted.error.message);
  await updateSupportChannel({ last_sync_at: now, last_error: null });
  return { duplicate: inserted.error?.code === "23505", conversationId: conversation.data.id };
}

export async function persistSupportOutbound(input: {
  conversationId?: string | null;
  body: string;
  providerMessageId?: string | null;
  payload?: unknown;
}) {
  if (!input.conversationId || !input.body.trim()) return;
  const db = await platformDb();
  const now = new Date().toISOString();
  const inserted = await db.from("platform_support_message").insert({
    conversation_id: input.conversationId,
    provider_message_id: input.providerMessageId || null,
    direction: "outbound",
    sender_type: "system",
    message_type: "text",
    body: input.body.trim().slice(0, 5000),
    delivery_status: input.providerMessageId ? "sent" : "queued",
    provider_payload: input.payload || {},
    created_at: now,
  });
  if (inserted.error && inserted.error.code !== "23505") throw new Error(inserted.error.message);
  await db
    .from("platform_support_conversation")
    .update({
      last_message_at: now,
      last_message_preview: input.body.trim().slice(0, 180),
      updated_at: now,
    })
    .eq("id", input.conversationId);
}

export async function updateMetaDeliveryStatus(
  providerMessageId: string,
  status: string,
  payload: unknown,
) {
  if (!providerMessageId) return;
  const db = await platformDb();
  await db
    .from("platform_support_message")
    .update({ delivery_status: status, provider_payload: payload || {} })
    .eq("provider_message_id", providerMessageId);
  if (["sent", "delivered", "read", "failed"].includes(status)) {
    const { applyDeliveryStatus } = await import("./purchase-onboarding.server");
    const p: any = payload || {};
    const ts = Number(p?.timestamp) ? new Date(Number(p.timestamp) * 1000).toISOString() : null;
    const err = p?.errors?.[0]
      ? `${p.errors[0].code || ""} ${p.errors[0].title || p.errors[0].message || ""}`.trim()
      : null;
    await applyDeliveryStatus("meta", providerMessageId, status as any, ts, err);
  }
}

export async function secureCompare(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

export async function verifyMetaSignature(rawBody: string, signature: string | null) {
  if (!signature?.startsWith("sha256=")) return false;
  const cfg = await resolveIntegration("whatsapp_meta");
  if (!cfg.app_secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(cfg.app_secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)),
  );
  const expected = `sha256=${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  return secureCompare(expected, signature.toLowerCase());
}
