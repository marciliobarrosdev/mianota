/* eslint-disable @typescript-eslint/no-explicit-any */
import { isActiveChannelConnected } from "./purchase-onboarding-rules";

/** Número do WhatsApp vinculado ao usuário nesta conta (o mesmo que conversa com a MIA). */
export async function userWhatsappPhone(db: any, companyId: string, userId: string) {
  const { data } = await db
    .from("fin_whatsapp_identity")
    .select("phone_e164")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  return data?.phone_e164 ? String(data.phone_e164).replace(/\D/g, "") : null;
}

/**
 * Envia um texto pelo canal central ativo (QR Code ou Meta). Na Meta, mensagens livres só
 * chegam dentro da janela de 24h após a última mensagem do cliente; fora dela a Meta recusa
 * e devolvemos o erro para registro (o aviso continua na Central e no push).
 */
export async function sendCentralText(to: string, text: string) {
  const { getOrCreateSupportChannel, sendMetaText } = await import("./master-whatsapp.server");
  const channel: any = await getOrCreateSupportChannel();
  if (!isActiveChannelConnected(channel)) return { ok: false as const, error: "canal desconectado" };
  try {
    if (channel.active_provider === "evolution") {
      const { evoSendText } = await import("./evolution.server");
      await evoSendText(String(channel.instance_name), to, text);
    } else {
      await sendMetaText(to, text);
    }
    return { ok: true as const, provider: channel.active_provider as string };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message.slice(0, 200) : "falha" };
  }
}

/** Envia um PDF (base64) pelo canal QR Code. A Meta exige upload de mídia, então lá vai só o link. */
export async function sendCentralDocument(to: string, base64: string, fileName: string, caption: string) {
  const { getOrCreateSupportChannel } = await import("./master-whatsapp.server");
  const channel: any = await getOrCreateSupportChannel();
  if (!isActiveChannelConnected(channel) || channel.active_provider !== "evolution") return false;
  const { evoSendDocument } = await import("./evolution.server");
  try {
    await evoSendDocument(String(channel.instance_name), to, base64, fileName, caption);
    return true;
  } catch {
    return false;
  }
}

export async function dispatchNotificationWhatsapp(db: any, n: any, pref: any, hour: number) {
  const { shouldSendWhatsapp, whatsappText } = await import("./notification-rules");
  if (!shouldSendWhatsapp(n, pref, hour)) return "skipped";
  const phone = await userWhatsappPhone(db, n.company_id, n.recipient_user_id);
  if (!phone) return "no_phone";
  const r = await sendCentralText(phone, whatsappText(n));
  const status = r.ok ? "sent" : `failed: ${r.error}`;
  await db
    .from("marcia_notification")
    .update({ whatsapp_status: status, whatsapp_sent_at: r.ok ? new Date().toISOString() : null })
    .eq("id", n.id);
  return status;
}
