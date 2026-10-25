/* eslint-disable @typescript-eslint/no-explicit-any */
import { handleFinanceWhatsapp, pairFinanceWhatsapp } from "./finance-whatsapp.server";

type CentralInbound = {
  phone: string;
  displayName?: string | null;
  message: string;
  messageType?: string;
  providerMessageId?: string | null;
  imageDataUrl?: string | null;
  buttonPayload?: string | null;
  sendText: (reply: string) => Promise<void>;
};

function digits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function pairingCode(message: string) {
  return (
    message
      .trim()
      .toUpperCase()
      .match(/^VINCULAR\s+([0-9]{8})$/)?.[1] || null
  );
}

async function resolveTenant(db: any, phone: string, message: string) {
  const code = pairingCode(message);
  if (code) {
    const pairings = await db
      .from("fin_whatsapp_pairing")
      .select("company_id,user_id")
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(2);
    if (pairings.error) throw new Error(pairings.error.message);
    if ((pairings.data || []).length === 1) {
      return { ...pairings.data[0], pairing: true };
    }
    return { company_id: null, user_id: null, pairing: true };
  }

  const identities = await db
    .from("fin_whatsapp_identity")
    .select("company_id,user_id")
    .eq("phone_e164", `+${phone}`)
    .eq("active", true)
    .limit(2);
  if (identities.error) throw new Error(identities.error.message);
  if ((identities.data || []).length === 1) {
    return { ...identities.data[0], pairing: false };
  }
  return { company_id: null, user_id: null, pairing: false };
}

async function persistInbound(db: any, input: CentralInbound, companyId: string, userId: string) {
  if (input.providerMessageId) {
    const duplicate = await db
      .from("mensagens")
      .select("id")
      .eq("whatsapp_message_id", input.providerMessageId)
      .maybeSingle();
    if (duplicate.error) throw new Error(duplicate.error.message);
    if (duplicate.data) return false;
  }
  const inserted = await db.from("mensagens").insert({
    company_id: companyId,
    user_id: userId,
    numero: input.phone,
    contato_nome: input.displayName || null,
    direcao: "entrada",
    autor: "contato",
    texto: input.imageDataUrl ? `${input.message} [imagem]` : input.message,
    whatsapp_message_id: input.providerMessageId || null,
    created_at: new Date().toISOString(),
  });
  if (inserted.error) {
    if (inserted.error.code === "23505") return false;
    throw new Error(inserted.error.message);
  }
  return true;
}

async function deliver(
  db: any,
  input: CentralInbound,
  companyId: string,
  userId: string,
  reply: string,
  ref: string,
  quotaReserved: boolean,
) {
  const clean = reply
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1400);
  if (!clean) return;
  const {
    markMessageQuotaAttempt,
    persistOutboundMessagesAndFinalizeQuota,
    reserveMessageQuota,
    settleMessageQuota,
  } = await import("./plan-limits.server");
  if (!quotaReserved && !(await reserveMessageQuota(companyId, ref, 1))) return;
  let attempted = false;
  try {
    await markMessageQuotaAttempt(companyId, ref, 1);
    attempted = true;
    await input.sendText(clean);
    await persistOutboundMessagesAndFinalizeQuota({
      companyId,
      ref,
      userId,
      number: input.phone,
      contactName: input.displayName || null,
      author: "ia",
      messages: [clean],
    });
  } catch (error) {
    if (!attempted) await settleMessageQuota(companyId, ref, 0).catch(() => undefined);
    else {
      await persistOutboundMessagesAndFinalizeQuota({
        companyId,
        ref,
        userId,
        number: input.phone,
        contactName: input.displayName || null,
        author: "ia",
        messages: [],
        uncertainCount: 1,
      }).catch(() => undefined);
    }
    throw error;
  }
}

export async function processCentralFinanceWhatsapp(input: CentralInbound) {
  const phone = digits(input.phone);
  if (!phone || !input.message.trim()) return { status: "ignored" };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;

  // Confirmação da compra aprovada (COMEÇAR <código> ou botão Começar da Meta).
  const { tryActivatePurchase } = await import("./purchase-onboarding.server");
  const activation = await tryActivatePurchase({
    phone,
    displayName: input.displayName || null,
    message: input.message,
    buttonPayload: input.buttonPayload || null,
  });
  if (activation.handled) {
    if (!activation.ok || !activation.companyId || !activation.userId) {
      await input.sendText(activation.reply);
      return { status: "activation_invalid" };
    }
    const accepted = await persistInbound(db, input, activation.companyId, activation.userId);
    if (!accepted) return { status: "duplicate" };
    await deliver(
      db,
      input,
      activation.companyId,
      activation.userId,
      activation.reply,
      `central-activation:${input.providerMessageId || crypto.randomUUID()}`,
      false,
    ).catch((error) => {
      // O vínculo já foi gravado; uma falha no envio da pergunta não desfaz o pareamento.
      console.error("[central.activation.reply]", error instanceof Error ? error.message : "falha");
    });
    return { status: "paired" };
  }

  const tenant = await resolveTenant(db, phone, input.message);
  if (!tenant.company_id || !tenant.user_id) {
    await input.sendText(
      tenant.pairing
        ? "Esse código venceu ou não existe. Abra o aplicativo, gere um novo código em WhatsApp e tente novamente."
        : "Seu celular ainda não está vinculado. Entre no aplicativo, abra WhatsApp, gere o código seguro e envie a mensagem pronta por aqui.",
    );
    return { status: tenant.pairing ? "pairing_invalid" : "not_linked" };
  }

  const companyId = String(tenant.company_id);
  const userId = String(tenant.user_id);
  const accepted = await persistInbound(db, input, companyId, userId);
  if (!accepted) return { status: "duplicate" };

  if (tenant.pairing) {
    const paired = await pairFinanceWhatsapp({
      db,
      companyId,
      phone,
      displayName: input.displayName || null,
      message: input.message,
    });
    if (!paired) return { status: "pairing_invalid" };
    await deliver(
      db,
      input,
      companyId,
      paired.userId || userId,
      paired.reply,
      `central-pair:${input.providerMessageId || crypto.randomUUID()}`,
      false,
    );
    return { status: paired.ok ? "paired" : "pairing_invalid" };
  }

  const { assertCompanyOperational, reserveMessageQuota, settleMessageQuota } =
    await import("./plan-limits.server");
  await assertCompanyOperational(companyId);
  const recent = await db
    .from("mensagens")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("numero", phone)
    .eq("direcao", "saida")
    .eq("autor", "ia")
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((recent.count || 0) >= 5) return { status: "rate_limited" };

  const ref = `central-finance:${input.providerMessageId || crypto.randomUUID()}`;
  if (!(await reserveMessageQuota(companyId, ref, 1))) return { status: "quota_limited" };
  let result: Awaited<ReturnType<typeof handleFinanceWhatsapp>> | null = null;
  try {
    result = await handleFinanceWhatsapp({
      db,
      companyId,
      phone,
      message: input.message,
      imageDataUrl: input.imageDataUrl || null,
    });
    await deliver(db, input, companyId, result.userId || userId, result.reply, ref, true);
    return { status: result.authorized ? "ok" : "not_linked" };
  } catch (error) {
    if (!result) await settleMessageQuota(companyId, ref, 0).catch(() => undefined);
    if (result?.creditRef) {
      await db
        .rpc("refund_ai_credit", { _company_id: companyId, _ref: result.creditRef })
        .catch(() => undefined);
    }
    throw error;
  }
}
