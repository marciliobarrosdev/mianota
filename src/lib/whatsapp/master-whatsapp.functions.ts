/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  describeIntegration,
  recordIntegrationTest,
  saveIntegrationValues,
} from "@/lib/common/integration-secrets.server";
import { assertSuperAdmin } from "@/lib/master/master-guards";
import {
  chunkList,
  clampWindow,
  fetchWindow,
  hasMore,
  safeSearchTerm,
} from "@/lib/common/pagination-rules";
import { resolveConversationRecipient } from "@/lib/whatsapp/support-inbox-rules";

/** Conversas por "Carregar mais" e mensagens por "Mensagens anteriores". */
export const SUPPORT_PAGE = 30;
export const SUPPORT_MESSAGES_PAGE = 100;

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
    const { getOrCreateSupportChannel, platformDb } = await import("@/lib/whatsapp/master-whatsapp.server");
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
      await import("@/lib/whatsapp/master-whatsapp.server");
    const { evoCreateInstance, evoGetQr, evoSetWebhook, evoState, evoFetchNumberFromInstance } =
      await import("@/lib/whatsapp/evolution.server");
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
      await import("@/lib/whatsapp/master-whatsapp.server");
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
      const { evoFetchNumberFromInstance, evoGetQr, evoState } = await import("@/lib/whatsapp/evolution.server");
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
      await import("@/lib/whatsapp/master-whatsapp.server");
    const channel = await getOrCreateSupportChannel();
    if (channel.provider === "evolution" && channel.instance_name) {
      const { evoLogout } = await import("@/lib/whatsapp/evolution.server");
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
      await import("@/lib/whatsapp/master-whatsapp.server");
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
  .inputValidator(
    (data: {
      conversationId?: string | null;
      limit?: number;
      messageLimit?: number;
      filter?: string;
      search?: string;
    }) => ({
      conversationId: data?.conversationId ? String(data.conversationId) : null,
      limit: clampWindow(data?.limit, SUPPORT_PAGE),
      messageLimit: clampWindow(data?.messageLimit, SUPPORT_MESSAGES_PAGE),
      filter: (["all", "pending", "open", "resolved", "unread"].includes(String(data?.filter))
        ? data.filter
        : "all") as "all" | "pending" | "open" | "resolved" | "unread",
      search: safeSearchTerm(data?.search),
    }),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { platformDb, getOrCreateSupportChannel } = await import(
      "@/lib/whatsapp/master-whatsapp.server"
    );
    const db = await platformDb();
    const fields =
      "id,phone_e164,contact_name,subscriber_company_id,status,unread_count,last_message_at,last_message_preview,assigned_to,assigned_name,assigned_at,resolved_by,resolved_at,avatar_url,lid_jid,pn_jid";

    // A busca também encontra pelo nome/e-mail do assinante: primeiro achamos as empresas.
    let companyMatches: string[] = [];
    if (data.search) {
      const like = `%${data.search}%`;
      const found = await db
        .from("company")
        .select("id")
        .or(`nome.ilike.${like},nome_fantasia.ilike.${like},email_corporativo.ilike.${like}`)
        .limit(200);
      if (found.error) throw new Error(found.error.message);
      companyMatches = (found.data ?? []).map((row: any) => row.id);
    }

    const filtered = (from: number, to: number) => {
      let q = db
        .from("platform_support_conversation")
        .select(fields, { count: "exact" })
        .is("deleted_at", null)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: true })
        .range(from, to);

      if (data.filter === "unread") q = q.gt("unread_count", 0);
      else if (data.filter === "pending") q = q.eq("status", "pending");
      else if (data.filter === "open") q = q.eq("status", "open");
      else if (data.filter === "resolved") q = q.eq("status", "resolved");

      if (data.search) {
        const like = `%${data.search}%`;
        const parts = [
          `contact_name.ilike.${like}`,
          `phone_e164.ilike.${like}`,
          `assigned_name.ilike.${like}`,
        ];
        if (companyMatches.length)
          parts.push(`subscriber_company_id.in.(${companyMatches.join(",")})`);
        q = q.or(parts.join(","));
      }
      return q.then(({ data: rows, count, error }: any) => {
        if (error) throw new Error(error.message);
        return { rows: (rows ?? []) as any[], count: count as number | null };
      });
    };

    const countWhere = async (apply: (q: any) => any) => {
      const { count, error } = await apply(
        db
          .from("platform_support_conversation")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
      );
      if (error) throw new Error(error.message);
      return count ?? 0;
    };

    const [channel, page, all, pending, open, resolved, unread, activeRow] = await Promise.all([
      getOrCreateSupportChannel(),
      fetchWindow(data.limit, filtered),
      countWhere((q) => q),
      countWhere((q) => q.eq("status", "pending")),
      countWhere((q) => q.eq("status", "open")),
      countWhere((q) => q.eq("status", "resolved")),
      countWhere((q) => q.gt("unread_count", 0)),
      data.conversationId
        ? db
            .from("platform_support_conversation")
            .select(fields)
            .eq("id", data.conversationId)
            .is("deleted_at", null)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if ((activeRow as any).error) throw new Error((activeRow as any).error.message);

    // A conversa aberta continua visível mesmo quando um filtro a esconde da lista.
    const activeConversation = (activeRow as any).data ?? null;
    const rowsToDecorate = activeConversation ? [...page.rows, activeConversation] : page.rows;
    const companyIds = Array.from(
      new Set(rowsToDecorate.map((item: any) => item.subscriber_company_id).filter(Boolean)),
    ) as string[];
    const companies = new Map<string, any>();
    for (const ids of chunkList(companyIds)) {
      const companyRows = await db
        .from("company")
        .select("id,nome,nome_fantasia,email:email_corporativo,logo_url")
        .in("id", ids);
      if (companyRows.error) throw new Error(companyRows.error.message);
      for (const company of companyRows.data ?? []) companies.set((company as any).id, company);
    }
    const withCompany = (item: any) => ({
      ...item,
      company: companies.get(item.subscriber_company_id) ?? null,
    });

    let messages: any[] = [];
    let hasOlderMessages = false;
    if (data.conversationId) {
      // Busca as mensagens MAIS RECENTES
      const latest = await fetchWindow(data.messageLimit, (from, to) =>
        db
          .from("platform_support_message")
          .select(
            "id,conversation_id,direction,sender_type,sender_name,sender_id,message_type,body,delivery_status,media_url,media_meta,quoted_message_id,created_at",
            { count: "exact" },
          )
          .eq("conversation_id", data.conversationId as string)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to)
          .then(({ data: rows, count, error }: any) => {
            if (error) throw new Error(error.message);
            return { rows: (rows ?? []) as any[], count: count as number | null };
          }),
      );
      messages = latest.rows.reverse();
      hasOlderMessages = hasMore(messages.length, latest.total);
      await db
        .from("platform_support_conversation")
        .update({ unread_count: 0 })
        .eq("id", data.conversationId);
    }

    const isWhatsmeow =
      process.env.WHATSAPP_PROVIDER === "whatsmeow" ||
      Boolean(process.env.WHATSAPP_GO_URL && process.env.WHATSAPP_PROVIDER !== "evolution");
    let whatsmeowOnline = false;
    let whatsmeowPhone: string | null = null;
    if (isWhatsmeow) {
      try {
        const { evoState } = await import("@/lib/whatsapp/evolution.server");
        const instName = channel.instance_name || "central";
        const state = await evoState(instName).catch(() => null);
        if (state?.state === "open" || state?.instance?.state === "open") {
          whatsmeowOnline = true;
          whatsmeowPhone =
            (state as any)?.instance?.owner ||
            (state as any)?.instance?.number ||
            channel.phone_e164 ||
            null;
        }
      } catch {
        whatsmeowOnline = false;
      }
    }

    const operatorName =
      (context.claims as any)?.user_metadata?.nome ||
      (context.claims as any)?.email?.split("@")[0] ||
      "Atendente";

    return {
      channel: {
        provider: channel.active_provider || channel.provider,
        activeProvider: (channel.active_provider ?? null) as "evolution" | "meta" | null,
        status: whatsmeowOnline || channel.status === "connected" ? "connected" : channel.status,
        phone: whatsmeowPhone || channel.phone_e164,
        isWhatsmeow,
        whatsmeowOnline,
        whatsmeowPort: 8085,
      },
      conversations: page.rows.map(withCompany),
      totalConversations: page.total,
      counts: { all, pending, open, resolved, unread },
      activeConversation: activeConversation ? withCompany(activeConversation) : null,
      messages,
      hasOlderMessages,
      operator: {
        id: context.userId,
        name: operatorName,
        email: (context.claims as any)?.email || null,
      },
    };
  });

export const takeSupportConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conversationId: string }) => ({
    conversationId: String(data?.conversationId || ""),
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { platformDb } = await import("@/lib/whatsapp/master-whatsapp.server");
    const { writeMasterAudit } = await import("@/lib/master/master-audit.server");
    const db = await platformDb();
    const now = new Date().toISOString();
    const operatorName =
      (context.claims as any)?.user_metadata?.nome ||
      (context.claims as any)?.email?.split("@")[0] ||
      "Atendente";

    const existing = await db
      .from("platform_support_conversation")
      .select("id,assigned_to,assigned_name,status")
      .eq("id", data.conversationId)
      .is("deleted_at", null)
      .single();

    if (existing.error || !existing.data) throw new Error("Conversa não encontrada.");
    if (existing.data.assigned_to && existing.data.assigned_to !== context.userId) {
      throw new Error(
        `Esta conversa já foi assumida por ${existing.data.assigned_name || "outro atendente"}.`,
      );
    }

    const updated = await db
      .from("platform_support_conversation")
      .update({
        status: "open",
        assigned_to: context.userId,
        assigned_name: operatorName,
        assigned_at: now,
        updated_at: now,
      })
      .eq("id", data.conversationId);
    if (updated.error) throw new Error(updated.error.message);

    await writeMasterAudit({
      action: "take_support_conversation",
      target: data.conversationId,
      actorId: context.userId,
      details: { detail: `Atendimento assumido por ${operatorName}` },
    });

    return { ok: true, assignedTo: context.userId, assignedName: operatorName };
  });

export const returnSupportConversationToQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conversationId: string }) => ({
    conversationId: String(data?.conversationId || ""),
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { platformDb } = await import("@/lib/whatsapp/master-whatsapp.server");
    const { writeMasterAudit } = await import("@/lib/master/master-audit.server");
    const db = await platformDb();
    const now = new Date().toISOString();

    const updated = await db
      .from("platform_support_conversation")
      .update({
        status: "pending",
        assigned_to: null,
        assigned_name: null,
        assigned_at: null,
        updated_at: now,
      })
      .eq("id", data.conversationId);
    if (updated.error) throw new Error(updated.error.message);

    await writeMasterAudit({
      action: "return_support_conversation_to_queue",
      target: data.conversationId,
      actorId: context.userId,
      details: { detail: "Conversa devolvida à fila de espera (Aguardando)" },
    });

    return { ok: true };
  });

export const resolveSupportConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conversationId: string }) => ({
    conversationId: String(data?.conversationId || ""),
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { platformDb } = await import("@/lib/whatsapp/master-whatsapp.server");
    const { writeMasterAudit } = await import("@/lib/master/master-audit.server");
    const db = await platformDb();
    const now = new Date().toISOString();

    const updated = await db
      .from("platform_support_conversation")
      .update({
        status: "resolved",
        resolved_by: context.userId,
        resolved_at: now,
        updated_at: now,
      })
      .eq("id", data.conversationId);
    if (updated.error) throw new Error(updated.error.message);

    await writeMasterAudit({
      action: "resolve_support_conversation",
      target: data.conversationId,
      actorId: context.userId,
      details: { detail: "Atendimento marcado como resolvido" },
    });

    return { ok: true };
  });

export const deleteSupportConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conversationId: string; confirmation: string }) => ({
    conversationId: String(data?.conversationId || ""),
    confirmation: String(data?.confirmation || "").trim(),
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { platformDb } = await import("@/lib/whatsapp/master-whatsapp.server");
    const { writeMasterAudit } = await import("@/lib/master/master-audit.server");
    const db = await platformDb();
    const now = new Date().toISOString();

    const existing = await db
      .from("platform_support_conversation")
      .select("id,contact_name,phone_e164")
      .eq("id", data.conversationId)
      .is("deleted_at", null)
      .single();
    if (existing.error || !existing.data) throw new Error("Conversa não encontrada.");

    const expectedName = String(existing.data.contact_name || "").trim().toLowerCase();
    const expectedPhone = String(existing.data.phone_e164 || "").replace(/\D/g, "");
    const conf = data.confirmation.trim().toLowerCase();
    const confDigits = conf.replace(/\D/g, "");

    const matches =
      conf === "excluir" ||
      conf === "confirmar" ||
      (expectedName && conf === expectedName) ||
      (expectedPhone && confDigits === expectedPhone);

    if (!matches) {
      throw new Error("Digite o nome ou número do contato para confirmar a exclusão.");
    }

    const updated = await db
      .from("platform_support_conversation")
      .update({
        deleted_at: now,
        deleted_by: context.userId,
        updated_at: now,
      })
      .eq("id", data.conversationId);
    if (updated.error) throw new Error(updated.error.message);

    await writeMasterAudit({
      action: "delete_support_conversation",
      target: data.conversationId,
      actorId: context.userId,
      details: { detail: `Conversa com ${existing.data.contact_name || existing.data.phone_e164} excluída do painel` },
    });

    return { ok: true };
  });

export const sendSupportReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { conversationId: string; body: string; quotedMessageId?: string }) => {
      const conversationId = String(data?.conversationId || "");
      const body = String(data?.body || "").trim();
      if (!conversationId) throw new Error("Selecione uma conversa.");
      if (!body || body.length > 4000)
        throw new Error("Escreva uma mensagem de até 4.000 caracteres.");
      return {
        conversationId,
        body,
        quotedMessageId: data?.quotedMessageId ? String(data.quotedMessageId) : undefined,
      };
    },
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { getOrCreateSupportChannel, platformDb, sendMetaText } = await import(
      "@/lib/whatsapp/master-whatsapp.server"
    );
    const db = await platformDb();
    const [channel, conversation, recentInbound] = await Promise.all([
      getOrCreateSupportChannel(),
      db
        .from("platform_support_conversation")
        .select("id,phone_e164,lid_jid,pn_jid")
        .eq("id", data.conversationId)
        .is("deleted_at", null)
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
    const isWhatsmeow =
      process.env.WHATSAPP_PROVIDER === "whatsmeow" ||
      Boolean(process.env.WHATSAPP_GO_URL && process.env.WHATSAPP_PROVIDER !== "evolution");

    if (!isWhatsmeow && (channel.status !== "connected" || !channel.active_provider))
      throw new Error("Ative e conecte o canal central antes de responder.");
    const inboundAt = recentInbound.data?.created_at ? +new Date(recentInbound.data.created_at) : 0;
    if (channel.active_provider === "meta" && Date.now() - inboundAt > 24 * 60 * 60 * 1000) {
      throw new Error(
        "A janela de 24 horas terminou. Inicie o contato com um modelo aprovado pela Meta.",
      );
    }
    const target = resolveConversationRecipient(conversation.data);
    if (!target) throw new Error("Contato sem destinatário válido no WhatsApp.");

    let providerMessageId: string | null = null;
    if (channel.active_provider === "meta") {
      providerMessageId = await sendMetaText(target, data.body);
    } else {
      const instanceName = channel.instance_name || "central";
      const { evoSendText } = await import("@/lib/whatsapp/evolution.server");
      const sent: any = await evoSendText(
        instanceName,
        target,
        data.body,
        data.quotedMessageId,
      );
      providerMessageId = String(sent?.key?.id || sent?.messageId || "") || null;
    }
    const now = new Date().toISOString();
    const operatorName =
      (context.claims as any)?.user_metadata?.nome ||
      (context.claims as any)?.email?.split("@")[0] ||
      "Atendente";

    const inserted = await db
      .from("platform_support_message")
      .insert({
        conversation_id: data.conversationId,
        provider_message_id: providerMessageId,
        direction: "outbound",
        sender_type: "owner",
        sender_name: operatorName,
        sender_id: context.userId,
        message_type: "text",
        body: data.body,
        quoted_message_id: data.quotedMessageId || null,
        delivery_status: providerMessageId ? "sent" : "queued",
        created_at: now,
      })
      .select()
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

export const sendSupportMediaReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      conversationId: string;
      mediaType: string;
      base64Data: string;
      mimeType: string;
      fileName?: string;
      caption?: string;
      quotedMessageId?: string;
    }) => {
      const conversationId = String(data?.conversationId || "");
      if (!conversationId) throw new Error("Selecione uma conversa.");
      const mediaType = (
        ["image", "video", "audio", "document"].includes(String(data?.mediaType))
          ? data.mediaType
          : "document"
      ) as "image" | "video" | "audio" | "document";
      const base64Data = String(data?.base64Data || "").replace(/^data:[^;]+;base64,/, "").trim();
      if (!base64Data) throw new Error("Arquivo de mídia inválido.");
      return {
        conversationId,
        mediaType,
        base64Data,
        mimeType: String(data?.mimeType || "application/octet-stream"),
        fileName: String(data?.fileName || ""),
        caption: String(data?.caption || "").trim(),
        quotedMessageId: data?.quotedMessageId ? String(data.quotedMessageId) : undefined,
      };
    },
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { getOrCreateSupportChannel, platformDb } = await import(
      "@/lib/whatsapp/master-whatsapp.server"
    );
    const db = await platformDb();
    const [channel, conversation] = await Promise.all([
      getOrCreateSupportChannel(),
      db
        .from("platform_support_conversation")
        .select("id,phone_e164,lid_jid,pn_jid")
        .eq("id", data.conversationId)
        .is("deleted_at", null)
        .single(),
    ]);
    if (conversation.error || !conversation.data) throw new Error("Conversa não encontrada.");
    const target = resolveConversationRecipient(conversation.data);
    if (!target) throw new Error("Contato sem destinatário válido no WhatsApp.");

    const instanceName = channel.instance_name || "central";
    let providerMessageId: string | null = null;

    if (data.mediaType === "audio" && data.mimeType.includes("ogg")) {
      const { evoSendVoice } = await import("@/lib/whatsapp/evolution.server");
      const sent: any = await evoSendVoice(instanceName, {
        number: target,
        audio: data.base64Data,
        mimeType: data.mimeType,
        quotedMsgId: data.quotedMessageId,
      });
      providerMessageId = String(sent?.key?.id || sent?.messageId || "") || null;
    } else {
      const { evoSendMedia } = await import("@/lib/whatsapp/evolution.server");
      const sent: any = await evoSendMedia(instanceName, {
        number: target,
        mediaType: data.mediaType,
        mimeType: data.mimeType,
        media: data.base64Data,
        fileName: data.fileName,
        caption: data.caption,
        quotedMsgId: data.quotedMessageId,
      });
      providerMessageId = String(sent?.key?.id || sent?.messageId || "") || null;
    }

    const now = new Date().toISOString();
    const operatorName =
      (context.claims as any)?.user_metadata?.nome ||
      (context.claims as any)?.email?.split("@")[0] ||
      "Atendente";

    const preview =
      data.caption ||
      (data.mediaType === "audio"
        ? "Mensagem de voz"
        : data.mediaType === "image"
          ? "Foto enviada"
          : data.mediaType === "video"
            ? "Vídeo enviado"
            : data.fileName || "Documento enviado");

    const inserted = await db
      .from("platform_support_message")
      .insert({
        conversation_id: data.conversationId,
        provider_message_id: providerMessageId,
        direction: "outbound",
        sender_type: "owner",
        sender_name: operatorName,
        sender_id: context.userId,
        message_type: data.mediaType,
        body: preview,
        media_url: `data:${data.mimeType};base64,${data.base64Data.slice(0, 500000)}`,
        media_meta: {
          fileName: data.fileName,
          mimeType: data.mimeType,
          mediaType: data.mediaType,
        },
        quoted_message_id: data.quotedMessageId || null,
        delivery_status: providerMessageId ? "sent" : "queued",
        created_at: now,
      })
      .select()
      .single();
    if (inserted.error) throw new Error(inserted.error.message);

    await db
      .from("platform_support_conversation")
      .update({
        last_message_at: now,
        last_message_preview: preview.slice(0, 180),
        updated_at: now,
      })
      .eq("id", data.conversationId);

    return inserted.data;
  });

export const sendSupportLocationReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      conversationId: string;
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
      quotedMessageId?: string;
    }) => ({
      conversationId: String(data?.conversationId || ""),
      latitude: Number(data?.latitude || 0),
      longitude: Number(data?.longitude || 0),
      name: String(data?.name || "").trim(),
      address: String(data?.address || "").trim(),
      quotedMessageId: data?.quotedMessageId ? String(data.quotedMessageId) : undefined,
    }),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { getOrCreateSupportChannel, platformDb } = await import(
      "@/lib/whatsapp/master-whatsapp.server"
    );
    const db = await platformDb();
    const [channel, conversation] = await Promise.all([
      getOrCreateSupportChannel(),
      db
        .from("platform_support_conversation")
        .select("id,phone_e164,lid_jid,pn_jid")
        .eq("id", data.conversationId)
        .is("deleted_at", null)
        .single(),
    ]);
    if (conversation.error || !conversation.data) throw new Error("Conversa não encontrada.");
    const target = resolveConversationRecipient(conversation.data);
    if (!target) throw new Error("Contato sem destinatário válido no WhatsApp.");

    const instanceName = channel.instance_name || "central";
    const { evoSendLocation } = await import("@/lib/whatsapp/evolution.server");
    const sent: any = await evoSendLocation(instanceName, {
      number: target,
      latitude: data.latitude,
      longitude: data.longitude,
      name: data.name,
      address: data.address,
      quotedMsgId: data.quotedMessageId,
    });
    const providerMessageId = String(sent?.key?.id || sent?.messageId || "") || null;

    const now = new Date().toISOString();
    const operatorName =
      (context.claims as any)?.user_metadata?.nome ||
      (context.claims as any)?.email?.split("@")[0] ||
      "Atendente";
    const preview = `📍 Localização: ${[data.name, data.address].filter(Boolean).join(" - ") || `${data.latitude}, ${data.longitude}`}`;

    const inserted = await db
      .from("platform_support_message")
      .insert({
        conversation_id: data.conversationId,
        provider_message_id: providerMessageId,
        direction: "outbound",
        sender_type: "owner",
        sender_name: operatorName,
        sender_id: context.userId,
        message_type: "location",
        body: preview,
        media_meta: {
          latitude: data.latitude,
          longitude: data.longitude,
          name: data.name,
          address: data.address,
        },
        quoted_message_id: data.quotedMessageId || null,
        delivery_status: providerMessageId ? "sent" : "queued",
        created_at: now,
      })
      .select()
      .single();
    if (inserted.error) throw new Error(inserted.error.message);

    await db
      .from("platform_support_conversation")
      .update({
        last_message_at: now,
        last_message_preview: preview.slice(0, 180),
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
    const { platformDb } = await import("@/lib/whatsapp/master-whatsapp.server");
    const db = await platformDb();
    const updated = await db
      .from("platform_support_conversation")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);
    if (updated.error) throw new Error(updated.error.message);
    return { ok: true };
  });
