/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/support-whatsapp-webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token") || "";
        const challenge = url.searchParams.get("hub.challenge") || "";
        if (mode !== "subscribe" || !challenge) {
          return new Response("MIAnota support webhook online", { status: 200 });
        }
        const { getOrCreateSupportChannel, secureCompare } =
          await import("@/lib/whatsapp/master-whatsapp.server");
        const channel = await getOrCreateSupportChannel();
        if (!(await secureCompare(String(channel.webhook_token), token))) {
          return new Response("invalid verify token", { status: 403 });
        }
        return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
      },
      POST: async ({ request }) => {
        const rawBody = await request.text();
        let payload: any = {};
        try {
          payload = JSON.parse(rawBody || "{}");
        } catch {
          return new Response("invalid json", { status: 400 });
        }
        const {
          digits,
          getMetaMediaDataUrl,
          getOrCreateSupportChannel,
          persistSupportInbound,
          persistSupportOutbound,
          secureCompare,
          sendMetaText,
          updateMetaDeliveryStatus,
          updateSupportChannel,
          verifyMetaSignature,
        } = await import("@/lib/whatsapp/master-whatsapp.server");
        const channel = await getOrCreateSupportChannel();

        try {
          if (payload?.object === "whatsapp_business_account") {
            if (!(await verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256")))) {
              return new Response("invalid signature", { status: 401 });
            }
            const { shouldProcessInbound } = await import("@/lib/whatsapp/purchase-onboarding-rules");
            const metaActive = shouldProcessInbound(channel.active_provider, "meta");
            for (const entry of payload.entry ?? []) {
              for (const change of entry.changes ?? []) {
                const value = change?.value ?? {};
                const contacts = new Map<string, string | null>(
                  (value.contacts ?? []).map((contact: any) => [
                    digits(contact?.wa_id),
                    String(contact?.profile?.name || "") || null,
                  ]),
                );
                // Canal inativo: mensagens são ignoradas (sem resposta nem vínculo).
                for (const message of metaActive ? (value.messages ?? []) : []) {
                  const phone = digits(message?.from);
                  const type = String(message?.type || "text");
                  let body = metaBody(message, type);
                  if (!phone || !body) continue;
                  if ((type === "audio" || type === "voice") && (message?.audio?.id || message?.voice?.id)) {
                    try {
                      const url = await getMetaMediaDataUrl(String(message?.audio?.id || message?.voice?.id));
                      const { transcribeAudioBase64, dataUrlParts } = await import("@/lib/ai/audio-transcribe.server");
                      const parts = url ? dataUrlParts(url) : null;
                      const text = parts ? await transcribeAudioBase64(parts.base64, parts.mime) : "";
                      if (text) body = text;
                    } catch (error) {
                      console.error("[support-whatsapp.audio]", error instanceof Error ? error.message : error);
                    }
                  }
                  const mediaId = type === "image" ? message?.image?.id : type === "document" ? message?.document?.id : null;
                  let imageDataUrl: string | null = mediaId
                    ? await getMetaMediaDataUrl(String(mediaId)).catch(() => null)
                    : null;
                  if (imageDataUrl) {
                    const m = /^data:([^;]+);base64,/.exec(imageDataUrl);
                    const mime = receiptMime(String(m?.[1] || message?.document?.mime_type || ""), type);
                    imageDataUrl = mime ? imageDataUrl.replace(/^data:[^;]+;/, `data:${mime};`) : null;
                  }
                  const monitored = await persistSupportInbound({
                    phone,
                    contactName: contacts.get(phone) || null,
                    body,
                    messageType: type,
                    providerMessageId: String(message?.id || "") || null,
                    payload: message,
                  });
                  const { processCentralFinanceWhatsapp } =
                    await import("@/lib/whatsapp/central-finance-whatsapp.server");
                  await processCentralFinanceWhatsapp({
                    phone,
                    displayName: contacts.get(phone) || null,
                    message: body,
                    messageType: type,
                    providerMessageId: String(message?.id || "") || null,
                    imageDataUrl,
                    buttonPayload:
                      String(
                        message?.button?.payload || message?.interactive?.button_reply?.id || "",
                      ) || null,
                    sendText: async (reply) => {
                      const providerMessageId = await sendMetaText(phone, reply);
                      await persistSupportOutbound({
                        conversationId: monitored.conversationId,
                        body: reply,
                        providerMessageId,
                      });
                    },
                  });
                }
                for (const status of value.statuses ?? []) {
                  await updateMetaDeliveryStatus(
                    String(status?.id || ""),
                    String(status?.status || "unknown"),
                    status,
                  );
                }
              }
            }
            await updateSupportChannel({
              last_sync_at: new Date().toISOString(),
              last_error: null,
            });
            if (metaActive) await runOnboardingRecovery();
            return new Response("EVENT_RECEIVED", { status: 200 });
          }

          const receivedToken =
            new URL(request.url).searchParams.get("t") ||
            request.headers.get("x-webhook-token") ||
            "";
          if (!(await secureCompare(String(channel.webhook_token), receivedToken))) {
            return new Response("invalid webhook", { status: 401 });
          }
          const event = String(payload?.event || "")
            .toUpperCase()
            .replace(".", "_");
          const { shouldProcessInbound, mapEvolutionAck } =
            await import("@/lib/whatsapp/purchase-onboarding-rules");
          if (event === "MESSAGES_UPDATE") {
            const updates = Array.isArray(payload?.data) ? payload.data : [payload?.data ?? {}];
            const { applyDeliveryStatus } = await import("@/lib/whatsapp/purchase-onboarding.server");
            for (const update of updates) {
              const id = String(update?.keyId || update?.key?.id || "");
              const status = mapEvolutionAck(update?.status ?? update?.update?.status);
              if (id && status) await applyDeliveryStatus("evolution", id, status, null, null);
            }
            return new Response("ok", { status: 200 });
          }
          if (event && event !== "MESSAGES_UPSERT") return new Response("ignored", { status: 200 });
          if (!shouldProcessInbound(channel.active_provider, "evolution")) {
            return new Response("inactive channel", { status: 200 });
          }
          const data = payload?.data ?? payload;
          const key = data?.key ?? {};
          const remoteJid = String(key.remoteJid || "");
          if (!remoteJid || remoteJid.endsWith("@g.us") || key.fromMe) {
            return new Response("ignored", { status: 200 });
          }
          const phone = digits(remoteJid.split("@")[0]);
          const message = data?.message ?? {};
          const type = evolutionType(message);
          let body = evolutionBody(message, type);
          if (type === "audio" && channel.instance_name && phone) {
            try {
              const { evoGetMediaBase64 } = await import("@/lib/whatsapp/evolution.server");
              const media = await evoGetMediaBase64(String(channel.instance_name), data);
              const { transcribeAudioBase64 } = await import("@/lib/ai/audio-transcribe.server");
              const text = await transcribeAudioBase64(media.base64, media.mimetype || message?.audioMessage?.mimetype || null);
              if (text) body = text;
            } catch (error) {
              console.error("[support-whatsapp.audio]", error instanceof Error ? error.message : error);
            }
          }
          if (phone && body) {
            let imageDataUrl: string | null = null;
            if ((type === "image" || type === "document") && channel.instance_name) {
              const { evoGetMediaBase64 } = await import("@/lib/whatsapp/evolution.server");
              const media = await evoGetMediaBase64(String(channel.instance_name), data).catch(
                (error) => {
                  console.error("[support-whatsapp.media]", error instanceof Error ? error.message : error);
                  return null;
                },
              );
              if (media?.base64) {
                const declared = String(
                  media.mimetype || message?.documentMessage?.mimetype || message?.imageMessage?.mimetype || "",
                ).split(";")[0].trim();
                const mime = receiptMime(declared, type);
                if (mime) imageDataUrl = `data:${mime};base64,${media.base64}`;
              }
            }
            const { processCentralFinanceWhatsapp } =
              await import("@/lib/whatsapp/central-finance-whatsapp.server");
            const { evoSendText } = await import("@/lib/whatsapp/evolution.server");
            const monitored = await persistSupportInbound({
              phone,
              contactName: String(data?.pushName || "") || null,
              body,
              messageType: type,
              providerMessageId: String(key?.id || "") || null,
              payload: data,
            });
            await processCentralFinanceWhatsapp({
              phone,
              displayName: String(data?.pushName || "") || null,
              message: body,
              messageType: type,
              providerMessageId: String(key?.id || "") || null,
              imageDataUrl,
              sendText: async (reply) => {
                const sent: any = await evoSendText(String(channel.instance_name), phone, reply);
                await persistSupportOutbound({
                  conversationId: monitored.conversationId,
                  body: reply,
                  providerMessageId: String(sent?.key?.id || sent?.messageId || "") || null,
                });
              },
            });
          }
          await runOnboardingRecovery();
          return new Response("ok", { status: 200 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Falha ao sincronizar conversa.";
          console.error("[support-whatsapp.webhook]", message);
          await updateSupportChannel({ last_error: message }).catch(() => undefined);
          return new Response("accepted", { status: 200 });
        }
      },
    },
  },
});

async function runOnboardingRecovery() {
  try {
    const { processDueOnboardings } = await import("@/lib/whatsapp/purchase-onboarding.server");
    await processDueOnboardings(3);
  } catch (error) {
    console.error("[onboarding.recovery]", error instanceof Error ? error.message : "falha");
  }
}

function metaBody(message: any, type: string) {
  if (type === "text") return String(message?.text?.body || "").trim();
  if (type === "image") return String(message?.image?.caption || "Imagem recebida").trim();
  if (type === "document")
    return String(
      message?.document?.caption || message?.document?.filename || "Documento recebido",
    ).trim();
  if (type === "audio" || type === "voice") return "Áudio recebido";
  if (type === "video") return String(message?.video?.caption || "Vídeo recebido").trim();
  if (type === "location") return "Localização recebida";
  if (type === "button") return String(message?.button?.text || "Botão respondido").trim();
  if (type === "interactive")
    return String(
      message?.interactive?.button_reply?.title || message?.interactive?.list_reply?.title || "Botão respondido",
    ).trim();
  return `Mensagem recebida (${type})`;
}

function evolutionType(message: any) {
  if (message?.imageMessage) return "image";
  if (message?.audioMessage) return "audio";
  if (message?.documentMessage) return "document";
  if (message?.videoMessage) return "video";
  return "text";
}

function evolutionBody(message: any, type: string) {
  return String(
    message?.conversation ||
      message?.extendedTextMessage?.text ||
      message?.imageMessage?.caption ||
      message?.documentMessage?.caption ||
      (type === "image"
        ? "Imagem recebida"
        : type === "audio"
          ? "Áudio recebido"
          : type === "document"
            ? "Documento recebido"
            : type === "video"
              ? "Vídeo recebido"
              : ""),
  ).trim();
}

// Só imagens e PDFs seguem para a IA ler o comprovante.
function receiptMime(declared: string, type: string) {
  const mime = declared.toLowerCase();
  if (mime === "application/pdf") return mime;
  if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(mime)) return mime === "image/jpg" ? "image/jpeg" : mime;
  if (type === "image") return "image/jpeg";
  return null;
}
