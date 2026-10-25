/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/whatsapp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload: any = await request.json().catch(() => ({}));
          const event = String(payload?.event || "");
          const instanceName = String(
            payload?.instance || payload?.instanceName || payload?.data?.instance || "",
          ).trim();
          if (!instanceName) return ok("no_instance");
          if (event && event !== "messages.upsert" && event !== "MESSAGES_UPSERT")
            return ok("ignored");

          const data = payload?.data ?? payload;
          const key = data?.key ?? {};
          const remoteJid = String(key.remoteJid || "");
          if (!remoteJid || remoteJid.endsWith("@g.us") || key.fromMe) return ok("ignored_sender");
          const phone = remoteJid.split("@")[0].replace(/\D/g, "");
          if (!phone) return ok("invalid_sender");
          const messageId = typeof key.id === "string" && key.id.trim() ? key.id.trim() : null;
          const pushName = String(data?.pushName || "").trim() || null;
          const message = data?.message ?? {};
          const hasImage = Boolean(message.imageMessage);
          const hasAudio = Boolean(message.audioMessage);
          const body = String(
            message.conversation ||
              message.extendedTextMessage?.text ||
              message.imageMessage?.caption ||
              message.documentMessage?.caption ||
              (hasImage
                ? "Comprovante enviado por imagem"
                : hasAudio
                  ? "Áudio enviado pelo WhatsApp"
                  : ""),
          ).trim();
          if (!body) return ok("empty");

          const token =
            new URL(request.url).searchParams.get("t") ||
            request.headers.get("x-webhook-token") ||
            "";
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as any;
          const instance = await db
            .from("whatsapp_instances")
            .select("company_id,user_id,instance_name,webhook_token")
            .eq("instance_name", instanceName)
            .maybeSingle();
          if (instance.error || !instance.data) return ok("unknown_instance");
          if (!token || token !== instance.data.webhook_token)
            return new Response("invalid webhook", { status: 401 });
          const companyId = instance.data.company_id as string;
          const instanceUserId = instance.data.user_id as string;

          try {
            const { assertCompanyOperational } = await import("@/lib/plan-limits.server");
            await assertCompanyOperational(companyId);
          } catch (error: any) {
            console.warn("[finance-whatsapp.entitlement]", companyId, error?.message);
            return ok("company_inactive");
          }

          if (messageId) {
            const duplicate = await db
              .from("mensagens")
              .select("id")
              .eq("company_id", companyId)
              .eq("whatsapp_message_id", messageId)
              .maybeSingle();
            if (duplicate.data) return ok("duplicate");
          }

          const inbound = await db.from("mensagens").insert({
            company_id: companyId,
            user_id: instanceUserId,
            numero: phone,
            contato_nome: pushName,
            direcao: "entrada",
            autor: "contato",
            texto: hasImage ? `${body} [imagem]` : body,
            whatsapp_message_id: messageId,
            created_at: new Date().toISOString(),
          });
          if (inbound.error) {
            if (inbound.error.code === "23505") return ok("duplicate");
            throw new Error(inbound.error.message);
          }

          const { pairFinanceWhatsapp, handleFinanceWhatsapp } =
            await import("@/lib/finance-whatsapp.server");
          const paired = await pairFinanceWhatsapp({
            db,
            companyId,
            phone,
            displayName: pushName,
            message: body,
          });
          if (paired) {
            await deliver({
              db,
              companyId,
              instanceName,
              instanceUserId,
              phone,
              pushName,
              reply: paired.reply,
              ref: `pair:${messageId || crypto.randomUUID()}`,
            });
            return ok(paired.ok ? "paired" : "pairing_invalid");
          }

          if (hasAudio) {
            const identity = await db
              .from("fin_whatsapp_identity")
              .select("user_id")
              .eq("company_id", companyId)
              .eq("phone_e164", `+${phone}`)
              .eq("active", true)
              .maybeSingle();
            const audioReply = identity.data
              ? "Para lançar por voz, toque no microfone dentro do aplicativo. Aqui no WhatsApp você pode escrever ou enviar a foto de um comprovante."
              : "Este celular ainda não está vinculado. Abra o aplicativo, vá em Canais e conexões e gere seu código de segurança.";
            await deliver({
              db,
              companyId,
              instanceName,
              instanceUserId: identity.data?.user_id || instanceUserId,
              phone,
              pushName,
              reply: audioReply,
              ref: `audio-help:${messageId || crypto.randomUUID()}`,
            });
            return ok(identity.data ? "audio_redirected" : "not_linked");
          }

          let imageDataUrl: string | null = null;
          if (hasImage) {
            try {
              const { evoGetMediaBase64 } = await import("@/lib/evolution.server");
              const media = await evoGetMediaBase64(instanceName, data);
              const mime = media.mimetype?.startsWith("image/") ? media.mimetype : "image/jpeg";
              imageDataUrl = `data:${mime};base64,${media.base64}`;
            } catch (error: any) {
              console.error("[finance-whatsapp.media]", error?.message);
              await deliver({
                db,
                companyId,
                instanceName,
                instanceUserId,
                phone,
                pushName,
                reply:
                  "Não consegui ler essa foto. Tente novamente com boa luz ou escreva o valor e a descrição.",
                ref: `media-error:${messageId || crypto.randomUUID()}`,
              });
              return ok("media_unavailable");
            }
          }

          const recent = await db
            .from("mensagens")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("numero", phone)
            .eq("direcao", "saida")
            .eq("autor", "ia")
            .gte("created_at", new Date(Date.now() - 60_000).toISOString());
          if ((recent.count || 0) >= 5) return ok("rate_limited");

          const outboundRef = `finance:${messageId || crypto.randomUUID()}`;
          const { reserveMessageQuota, settleMessageQuota } =
            await import("@/lib/plan-limits.server");
          if (!(await reserveMessageQuota(companyId, outboundRef, 1))) return ok("quota_limited");
          let result: Awaited<ReturnType<typeof handleFinanceWhatsapp>> | null = null;
          try {
            result = await handleFinanceWhatsapp({
              db,
              companyId,
              phone,
              message: body,
              imageDataUrl,
            });
            await deliver({
              db,
              companyId,
              instanceName,
              instanceUserId: result.userId || instanceUserId,
              phone,
              pushName,
              reply: result.reply,
              ref: outboundRef,
              quotaReserved: true,
            });
            return ok(result.authorized ? "ok" : "not_linked");
          } catch (error) {
            if (!result) await settleMessageQuota(companyId, outboundRef, 0).catch(() => undefined);
            if (result?.creditRef) {
              await db
                .rpc("refund_ai_credit", {
                  _company_id: companyId,
                  _ref: result.creditRef,
                })
                .catch(() => undefined);
            }
            throw error;
          }
        } catch (error: any) {
          console.error("[finance-whatsapp.webhook]", error?.message, error?.stack);
          return ok("error");
        }
      },
      GET: async () => {
        const { loadCloneBrandServer } = await import("@/lib/brand.server");
        const cloneBrand = await loadCloneBrandServer();
        return new Response(`${cloneBrand.assistantName} finance webhook online`, { status: 200 });
      },
    },
  },
});

function ok(message: string) {
  return new Response(message, { status: 200 });
}

async function deliver(input: {
  db: any;
  companyId: string;
  instanceName: string;
  instanceUserId: string;
  phone: string;
  pushName: string | null;
  reply: string;
  ref: string;
  quotaReserved?: boolean;
}) {
  const reply = input.reply
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1400);
  if (!reply) return;
  const {
    markMessageQuotaAttempt,
    persistOutboundMessagesAndFinalizeQuota,
    reserveMessageQuota,
    settleMessageQuota,
  } = await import("@/lib/plan-limits.server");
  if (!input.quotaReserved && !(await reserveMessageQuota(input.companyId, input.ref, 1))) return;
  let attempted = false;
  try {
    const { evoSendPresence, evoSendText } = await import("@/lib/evolution.server");
    const delay = Math.min(2400, 650 + reply.length * 12);
    await evoSendPresence(input.instanceName, input.phone, "composing", delay);
    await new Promise((resolve) => setTimeout(resolve, delay));
    await markMessageQuotaAttempt(input.companyId, input.ref, 1);
    attempted = true;
    await evoSendText(input.instanceName, input.phone, reply);
    await persistOutboundMessagesAndFinalizeQuota({
      companyId: input.companyId,
      ref: input.ref,
      userId: input.instanceUserId,
      number: input.phone,
      contactName: input.pushName,
      author: "ia",
      messages: [reply],
    });
  } catch (error) {
    if (!attempted) await settleMessageQuota(input.companyId, input.ref, 0).catch(() => undefined);
    else {
      await persistOutboundMessagesAndFinalizeQuota({
        companyId: input.companyId,
        ref: input.ref,
        userId: input.instanceUserId,
        number: input.phone,
        contactName: input.pushName,
        author: "ia",
        messages: [],
        uncertainCount: 1,
      }).catch(() => undefined);
    }
    throw error;
  }
}
