/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  describeIntegration,
  recordIntegrationTest,
  saveIntegrationValues,
} from "./integration-secrets.server";

async function assertSuperAdmin(supabase: any) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error || data !== true) throw new Error("Acesso restrito ao proprietário da instalação.");
}

function currentOrigin() {
  const request = getRequest();
  const url = new URL(request.url);
  const protocol = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${protocol}://${host}`;
}

export const getMasterWhatsappOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase);
    const { getOrCreateSupportChannel, platformDb } = await import("./master-whatsapp.server");
    const db = await platformDb();
    const channel = await getOrCreateSupportChannel();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [evolution, meta, identities, messagesToday, activeCodes] = await Promise.all([
      describeIntegration("evolution"),
      describeIntegration("whatsapp_meta"),
      db
        .from("fin_whatsapp_identity")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
      db
        .from("mensagens")
        .select("id", { count: "exact", head: true })
        .eq("direcao", "entrada")
        .gte("created_at", today.toISOString()),
      db
        .from("fin_whatsapp_pairing")
        .select("company_id", { count: "exact", head: true })
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString()),
    ]);
    const origin = currentOrigin();
    return {
      channel: {
        provider: channel.provider as "evolution" | "meta",
        activeProvider: (channel.active_provider ?? null) as "evolution" | "meta" | null,
        status: channel.status as "disconnected" | "connecting" | "connected" | "error",
        phone: channel.phone_e164 as string | null,
        lastSyncAt: channel.last_sync_at as string | null,
        lastError: channel.last_error as string | null,
      },
      evolution,
      meta,
      callbackUrl: `${origin}/api/public/support-whatsapp-webhook`,
      verifyToken: String(channel.webhook_token),
      stats: {
        total: identities.count || 0,
        unread: messagesToday.count || 0,
        open: activeCodes.count || 0,
      },
    };
  });

export const startSupportQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase);
    const { getOrCreateSupportChannel, updateSupportChannel } =
      await import("./master-whatsapp.server");
    const { evoCreateInstance, evoGetQr, evoSetWebhook, evoState, evoFetchNumberFromInstance } =
      await import("./evolution.server");
    const channel = await getOrCreateSupportChannel();
    const instanceName =
      String(channel.instance_name || "").trim() ||
      `marcia-support-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    const webhookUrl = `${currentOrigin()}/api/public/support-whatsapp-webhook?t=${encodeURIComponent(channel.webhook_token)}`;
    try {
      let state = "";
      if (channel.instance_name) {
        state = String((await evoState(instanceName)).instance?.state || "");
      }
      if (!channel.instance_name || !state) await evoCreateInstance(instanceName, webhookUrl);
      await evoSetWebhook(instanceName, webhookUrl);
      const connection = await evoState(instanceName).catch(() => ({ instance: { state: "" } }));
      const connected = connection.instance?.state === "open";
      const qr = connected ? { qrBase64: null, pairingCode: null } : await evoGetQr(instanceName);
      const phone = connected ? await evoFetchNumberFromInstance(instanceName) : null;
      await updateSupportChannel({
        provider: "evolution",
        status: connected ? "connected" : "connecting",
        instance_name: instanceName,
        phone_e164: phone,
        webhook_configured_at: new Date().toISOString(),
        last_error: null,
      });
      return { connected, phone, qrBase64: qr.qrBase64, pairingCode: qr.pairingCode };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível gerar o QR Code.";
      await updateSupportChannel({ provider: "evolution", status: "error", last_error: message });
      throw new Error(message);
    }
  });

export const checkSupportWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase);
    const { getOrCreateSupportChannel, updateSupportChannel, testMetaConnection } =
      await import("./master-whatsapp.server");
    const channel = await getOrCreateSupportChannel();
    try {
      if (channel.provider === "meta") {
        const meta = await testMetaConnection();
        await updateSupportChannel({
          status: "connected",
          phone_e164: meta.displayPhone,
          last_error: null,
        });
        return { connected: true, phone: meta.displayPhone, qrBase64: null, pairingCode: null };
      }
      if (!channel.instance_name)
        return { connected: false, phone: null, qrBase64: null, pairingCode: null };
      const { evoFetchNumberFromInstance, evoGetQr, evoState } = await import("./evolution.server");
      const result = await evoState(channel.instance_name);
      const connected = result.instance?.state === "open";
      const phone = connected ? await evoFetchNumberFromInstance(channel.instance_name) : null;
      const qr = connected
        ? { qrBase64: null, pairingCode: null }
        : await evoGetQr(channel.instance_name);
      await updateSupportChannel({
        status: connected ? "connected" : "connecting",
        phone_e164: phone,
        last_error: null,
      });
      return { connected, phone, qrBase64: qr.qrBase64, pairingCode: qr.pairingCode };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao conferir a conexão.";
      await updateSupportChannel({ status: "error", last_error: message });
      return { connected: false, phone: null, qrBase64: null, pairingCode: null, error: message };
    }
  });

export const disconnectSupportWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase);
    const { getOrCreateSupportChannel, updateSupportChannel } =
      await import("./master-whatsapp.server");
    const channel = await getOrCreateSupportChannel();
    if (channel.provider === "evolution" && channel.instance_name) {
      const { evoLogout } = await import("./evolution.server");
      await evoLogout(channel.instance_name).catch(() => undefined);
    }
    await updateSupportChannel({ status: "disconnected", phone_e164: null, last_error: null });
    return { ok: true };
  });

export const saveMetaSupportWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      wabaId: string;
      phoneNumberId: string;
      accessToken: string;
      appSecret: string;
      apiVersion?: string;
    }) => {
      const wabaId = String(data?.wabaId || "").trim();
      const phoneNumberId = String(data?.phoneNumberId || "").trim();
      const accessToken = String(data?.accessToken || "").trim();
      const appSecret = String(data?.appSecret || "").trim();
      const apiVersion = String(data?.apiVersion || "v24.0").trim();
      if (wabaId && !/^\d{6,30}$/.test(wabaId)) throw new Error("WABA ID inválido.");
      if (phoneNumberId && !/^\d{6,30}$/.test(phoneNumberId))
        throw new Error("Phone Number ID inválido.");
      if (apiVersion && !/^v\d+\.\d+$/.test(apiVersion))
        throw new Error("A versão deve seguir o formato v24.0.");
      for (const value of [accessToken, appSecret]) {
        if (value.length > 4000) throw new Error("Credencial muito longa.");
      }
      return { wabaId, phoneNumberId, accessToken, appSecret, apiVersion };
    },
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { updateSupportChannel, testMetaConnection, subscribeMetaApp } =
      await import("./master-whatsapp.server");
    await saveIntegrationValues(
      "whatsapp_meta",
      {
        waba_id: data.wabaId,
        phone_number_id: data.phoneNumberId,
        access_token: data.accessToken,
        app_secret: data.appSecret,
        api_version: data.apiVersion,
      },
      context.userId,
    );
    try {
      const result = await testMetaConnection();
      await subscribeMetaApp();
      await recordIntegrationTest("whatsapp_meta", true, null);
      await updateSupportChannel({
        provider: "meta",
        status: "connected",
        phone_e164: result.displayPhone,
        webhook_configured_at: new Date().toISOString(),
        last_error: null,
      });
      return { ok: true, message: "Meta conectada e eventos assinados.", account: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : "A Meta recusou a configuração.";
      await recordIntegrationTest("whatsapp_meta", false, message);
      await updateSupportChannel({ provider: "meta", status: "error", last_error: message });
      return { ok: false, message, account: null };
    }
  });

export const getSupportInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conversationId?: string | null }) => ({
    conversationId: data?.conversationId ? String(data.conversationId) : null,
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { platformDb, getOrCreateSupportChannel } = await import("./master-whatsapp.server");
    const db = await platformDb();
    const [channel, conversations] = await Promise.all([
      getOrCreateSupportChannel(),
      db
        .from("platform_support_conversation")
        .select(
          "id,phone_e164,contact_name,subscriber_company_id,status,unread_count,last_message_at,last_message_preview",
        )
        .order("last_message_at", { ascending: false })
        .limit(250),
    ]);
    if (conversations.error) throw new Error(conversations.error.message);
    const companyIds = Array.from(
      new Set(
        (conversations.data ?? []).map((item: any) => item.subscriber_company_id).filter(Boolean),
      ),
    );
    let companies: any[] = [];
    if (companyIds.length) {
      const companyRows = await db
        .from("company")
        .select("id,nome,nome_fantasia")
        .in("id", companyIds);
      if (companyRows.error) throw new Error(companyRows.error.message);
      companies = companyRows.data ?? [];
    }
    const conversationRows = (conversations.data ?? []).map((item: any) => ({
      ...item,
      company: companies.find((company: any) => company.id === item.subscriber_company_id) || null,
    }));
    let messages: any[] = [];
    if (data.conversationId) {
      const result = await db
        .from("platform_support_message")
        .select(
          "id,conversation_id,direction,sender_type,message_type,body,delivery_status,created_at",
        )
        .eq("conversation_id", data.conversationId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (result.error) throw new Error(result.error.message);
      messages = result.data ?? [];
      await db
        .from("platform_support_conversation")
        .update({ unread_count: 0 })
        .eq("id", data.conversationId);
    }
    return {
      channel: {
        provider: channel.active_provider || channel.provider,
        status: channel.status,
        phone: channel.phone_e164,
      },
      conversations: conversationRows,
      messages,
    };
  });

export const sendSupportReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conversationId: string; body: string }) => {
    const conversationId = String(data?.conversationId || "");
    const body = String(data?.body || "").trim();
    if (!conversationId) throw new Error("Selecione uma conversa.");
    if (!body || body.length > 4000)
      throw new Error("Escreva uma mensagem de até 4.000 caracteres.");
    return { conversationId, body };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { getOrCreateSupportChannel, platformDb, sendMetaText } =
      await import("./master-whatsapp.server");
    const db = await platformDb();
    const [channel, conversation, recentInbound] = await Promise.all([
      getOrCreateSupportChannel(),
      db
        .from("platform_support_conversation")
        .select("id,phone_e164")
        .eq("id", data.conversationId)
        .single(),
      db
        .from("platform_support_message")
        .select("created_at")
        .eq("conversation_id", data.conversationId)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (conversation.error || !conversation.data) throw new Error("Conversa não encontrada.");
    if (channel.status !== "connected" || !channel.active_provider)
      throw new Error("Ative e conecte o canal central antes de responder.");
    const inboundAt = recentInbound.data?.created_at ? +new Date(recentInbound.data.created_at) : 0;
    if (channel.active_provider === "meta" && Date.now() - inboundAt > 24 * 60 * 60 * 1000) {
      throw new Error(
        "A janela de 24 horas terminou. Inicie o contato com um modelo aprovado pela Meta.",
      );
    }
    let providerMessageId: string | null = null;
    if (channel.active_provider === "meta") {
      providerMessageId = await sendMetaText(conversation.data.phone_e164, data.body);
    } else {
      if (!channel.instance_name) throw new Error("Instância do QR Code indisponível.");
      const { evoSendText } = await import("./evolution.server");
      const sent: any = await evoSendText(
        channel.instance_name,
        conversation.data.phone_e164,
        data.body,
      );
      providerMessageId = String(sent?.key?.id || sent?.messageId || "") || null;
    }
    const now = new Date().toISOString();
    const inserted = await db
      .from("platform_support_message")
      .insert({
        conversation_id: data.conversationId,
        provider_message_id: providerMessageId,
        direction: "outbound",
        sender_type: "owner",
        message_type: "text",
        body: data.body,
        delivery_status: providerMessageId ? "sent" : "queued",
        created_at: now,
      })
      .select(
        "id,conversation_id,direction,sender_type,message_type,body,delivery_status,created_at",
      )
      .single();
    if (inserted.error) throw new Error(inserted.error.message);
    await db
      .from("platform_support_conversation")
      .update({
        last_message_at: now,
        last_message_preview: data.body.slice(0, 180),
        updated_at: now,
      })
      .eq("id", data.conversationId);
    return inserted.data;
  });

export const updateSupportConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conversationId: string; status: string }) => {
    const status = String(data?.status || "");
    if (!["open", "pending", "resolved"].includes(status)) throw new Error("Status inválido.");
    return { conversationId: String(data?.conversationId || ""), status };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { platformDb } = await import("./master-whatsapp.server");
    const db = await platformDb();
    const updated = await db
      .from("platform_support_conversation")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);
    if (updated.error) throw new Error(updated.error.message);
    return { ok: true };
  });
