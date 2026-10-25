/* eslint-disable @typescript-eslint/no-explicit-any */
// Superadmin: canal central exclusivo, template Meta e fila de onboarding pós-compra.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SUGGESTED_EVOLUTION_PURCHASE_MESSAGE,
  SUGGESTED_META_TEMPLATE_BODY,
} from "./purchase-onboarding-rules";

async function assertSuperAdmin(supabase: any) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error || data !== true) throw new Error("Acesso restrito ao proprietário da instalação.");
}

async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getCentralChannelState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase);
    const db = await adminDb();
    const { describeIntegration } = await import("./integration-secrets.server");
    const [channel, meta, evolution, log] = await Promise.all([
      db.from("platform_support_channel").select("*").eq("id", true).maybeSingle(),
      describeIntegration("whatsapp_meta"),
      describeIntegration("evolution"),
      db
        .from("platform_channel_switch_log")
        .select("id,from_provider,to_provider,created_at,diagnostic")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    const c = channel.data ?? {};
    return {
      activeProvider: (c.active_provider ?? null) as "evolution" | "meta" | null,
      status: String(c.status || "disconnected"),
      phone: (c.phone_e164 ?? null) as string | null,
      switchedAt: (c.switched_at ?? null) as string | null,
      readiness: {
        evolution: Boolean(c.instance_name) && evolution.configured,
        meta: meta.testOk === true,
      },
      template: {
        name: (c.meta_template_name ?? "") as string,
        language: (c.meta_template_language ?? "pt_BR") as string,
        body: (c.meta_template_body ?? SUGGESTED_META_TEMPLATE_BODY) as string,
        status: (c.meta_template_status ?? null) as string | null,
        hasButton: Boolean(c.meta_template_has_button),
        checkedAt: (c.meta_template_checked_at ?? null) as string | null,
      },
      evolutionMessage: (c.evolution_purchase_message ??
        SUGGESTED_EVOLUTION_PURCHASE_MESSAGE) as string,
      log: (log.data ?? []).map((l: any) => ({
        id: l.id,
        from: l.from_provider,
        to: l.to_provider,
        at: l.created_at,
        note: String(l.diagnostic?.note || ""),
      })),
    };
  });

export const saveEvolutionPurchaseMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { message: string }) => {
    const message = String(data?.message || "").trim();
    if (message.length < 20 || message.length > 2000)
      throw new Error("A mensagem deve ter entre 20 e 2.000 caracteres.");
    if (!/\{\{codigo\}\}/i.test(message))
      throw new Error("Mantenha {{codigo}} na mensagem para vincular o WhatsApp ao assinante.");
    return { message };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { updateSupportChannel } = await import("./master-whatsapp.server");
    await updateSupportChannel({ evolution_purchase_message: data.message });
    return { ok: true, message: data.message };
  });

export const switchCentralChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { to: "evolution" | "meta" | null; confirm: string }) => {
    const to = data?.to ?? null;
    if (to !== null && to !== "evolution" && to !== "meta") throw new Error("Canal inválido.");
    if (
      String(data?.confirm || "")
        .trim()
        .toUpperCase() !== "ATIVAR"
    )
      throw new Error("Digite ATIVAR para confirmar a troca.");
    return { to };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    // Diagnóstico real do destino antes da troca (sem segredos). Só depois do teste
    // ao vivo o registro compartilhado passa a descrever o destino como conectado;
    // a RPC confere provider/status/instância (ou test_ok da Meta) antes de ativar.
    const diagnostic: Record<string, unknown> = { at: new Date().toISOString() };
    const { updateSupportChannel } = await import("./master-whatsapp.server");
    if (data.to === "evolution") {
      const db = await adminDb();
      const { data: channel } = await db
        .from("platform_support_channel")
        .select("instance_name")
        .eq("id", true)
        .maybeSingle();
      if (!channel?.instance_name) throw new Error("Gere e conecte o QR Code antes de ativar.");
      const { evoState } = await import("./evolution.server");
      const state = String((await evoState(channel.instance_name)).instance?.state || "");
      diagnostic.evolutionState = state;
      if (state !== "open")
        throw new Error("O WhatsApp do QR Code não está conectado. Leia o QR antes de ativar.");
      diagnostic.note = "QR Code conectado (estado open).";
      await updateSupportChannel({ provider: "evolution", status: "connected", last_error: null });
    } else if (data.to === "meta") {
      const { testMetaConnection } = await import("./master-whatsapp.server");
      const { recordIntegrationTest } = await import("./integration-secrets.server");
      try {
        const result = await testMetaConnection();
        await recordIntegrationTest("whatsapp_meta", true, null);
        diagnostic.metaQuality = result.qualityRating;
        diagnostic.note = `Meta respondeu (qualidade ${result.qualityRating || "n/d"}).`;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Meta recusou o teste.";
        await recordIntegrationTest("whatsapp_meta", false, message);
        throw new Error(`Teste da Meta falhou: ${message}`);
      }
      await updateSupportChannel({ provider: "meta", status: "connected", last_error: null });
    } else {
      diagnostic.note = "Canal central desativado pelo proprietário.";
    }
    const { error } = await context.supabase.rpc("switch_central_channel", {
      _to: data.to,
      _diagnostic: diagnostic,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true, activeProvider: data.to };
  });

export const saveMetaTemplateConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; language: string; body: string }) => {
    const name = String(data?.name || "").trim();
    const language = String(data?.language || "pt_BR").trim();
    const body = validateMetaTemplateBody(data?.body);
    if (!/^[a-z0-9_]{1,512}$/.test(name))
      throw new Error("Nome do template: use letras minúsculas, números e _.");
    if (!/^[a-z]{2}(_[A-Z]{2})?$/.test(language)) throw new Error("Idioma inválido (ex.: pt_BR).");
    return { name, language, body };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { updateSupportChannel, getMetaTemplateInfo } = await import("./master-whatsapp.server");
    let info = { status: "UNKNOWN", hasButton: false, bodyVariables: 0, bodyText: "" };
    let warning: string | null = null;
    try {
      info = await getMetaTemplateInfo(data.name, data.language);
    } catch (error) {
      warning = error instanceof Error ? error.message : "Não foi possível consultar a Meta.";
    }
    if (info.status === "APPROVED" && info.bodyVariables !== 2) {
      warning =
        "O template precisa ter exatamente 2 variáveis no corpo: {{1}} nome e {{2}} código.";
      info.status = "INVALID";
    }
    await updateSupportChannel({
      meta_template_name: data.name,
      meta_template_language: data.language,
      meta_template_body: info.bodyText || data.body,
      meta_template_status: info.status,
      meta_template_has_button: info.hasButton,
      meta_template_checked_at: new Date().toISOString(),
    });
    return {
      status: info.status,
      hasButton: info.hasButton,
      body: info.bodyText || data.body,
      warning,
    };
  });

export const createSuggestedTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; language: string; body: string }) => {
    const name = String(data?.name || "").trim();
    const language = String(data?.language || "pt_BR").trim();
    const body = validateMetaTemplateBody(data?.body);
    if (!/^[a-z0-9_]{1,512}$/.test(name)) throw new Error("Nome inválido.");
    if (!/^[a-z]{2}(_[A-Z]{2})?$/.test(language)) throw new Error("Idioma inválido.");
    return { name, language, body };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { createSuggestedMetaTemplate, updateSupportChannel } =
      await import("./master-whatsapp.server");
    const status = await createSuggestedMetaTemplate(data.name, data.language, data.body);
    await updateSupportChannel({
      meta_template_name: data.name,
      meta_template_language: data.language,
      meta_template_body: data.body,
      meta_template_status: status,
      meta_template_has_button: true,
      meta_template_checked_at: new Date().toISOString(),
    });
    return { status, body: data.body };
  });

function validateMetaTemplateBody(value: unknown) {
  const body = String(value || "").trim();
  if (body.length < 20 || body.length > 1024)
    throw new Error("O texto do template deve ter entre 20 e 1.024 caracteres.");
  const variables = body.match(/\{\{\d+\}\}/g) || [];
  if (variables.length !== 2 || variables[0] !== "{{1}}" || variables[1] !== "{{2}}") {
    throw new Error("Use exatamente {{1}} para o nome e {{2}} para o código, nesta ordem.");
  }
  return body;
}

export const listPurchaseOnboardings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: string | null }) => ({
    status: data?.status ? String(data.status).slice(0, 30) : null,
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const db = await adminDb();
    let query = db
      .from("purchase_onboarding")
      .select(
        "id,source,kind,company_id,buyer_name,buyer_email,buyer_phone_e164,phone_source,channel_provider,status,status_detail,attempts,sent_at,delivered_at,read_at,failed_at,paired_at,last_error,activation_expires_at,activation_used_at,dry_run_preview,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) query = query.eq("status", data.status);
    const [rows, counts] = await Promise.all([
      query,
      db.from("purchase_onboarding").select("status").limit(5000),
    ]);
    if (rows.error) throw new Error(rows.error.message);
    const ids = Array.from(
      new Set((rows.data ?? []).map((r: any) => r.company_id).filter(Boolean)),
    );
    const companies = ids.length
      ? ((await db.from("company").select("id,nome,nome_fantasia").in("id", ids)).data ?? [])
      : [];
    const byStatus: Record<string, number> = {};
    for (const r of counts.data ?? []) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    const { maskPhone } = await import("./purchase-onboarding-rules");
    return {
      counts: byStatus,
      rows: (rows.data ?? []).map((r: any) => {
        const company = companies.find((c: any) => c.id === r.company_id);
        return {
          ...r,
          buyer_phone_masked: maskPhone(r.buyer_phone_e164),
          buyer_phone_e164: undefined,
          company_name: company ? company.nome_fantasia || company.nome : null,
          activation_pending: Boolean(
            r.activation_expires_at &&
            !r.activation_used_at &&
            new Date(r.activation_expires_at).getTime() > Date.now(),
          ),
        };
      }),
    };
  });

export const getOnboardingEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!UUID.test(String(data?.id || ""))) throw new Error("Registro inválido.");
    return { id: data.id };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const db = await adminDb();
    const { data: events } = await db
      .from("purchase_onboarding_event")
      .select("id,from_status,to_status,detail,created_at")
      .eq("onboarding_id", data.id)
      .order("created_at", { ascending: true })
      .limit(100);
    return events ?? [];
  });

export const updateOnboardingPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; phone: string }) => {
    if (!UUID.test(String(data?.id || ""))) throw new Error("Registro inválido.");
    return { id: data.id, phone: String(data?.phone || "").slice(0, 30) };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { normalizeBuyerPhone } = await import("./purchase-onboarding-rules");
    const phone = normalizeBuyerPhone(data.phone);
    if (!phone) throw new Error("Telefone inválido. Use DDD + número (Brasil).");
    const db = await adminDb();
    const { data: row } = await db
      .from("purchase_onboarding")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Registro não encontrado.");
    if (["paired", "cancelled", "sending"].includes(row.status))
      throw new Error("Este onboarding não pode mais ser alterado.");
    await db
      .from("purchase_onboarding")
      .update({
        buyer_phone_e164: phone,
        phone_source: "master",
        status: "queued",
        activation_code_hash: null,
        activation_token_hash: null,
        activation_expires_at: null,
        next_attempt_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    await db.from("purchase_onboarding_event").insert({
      onboarding_id: data.id,
      from_status: row.status,
      to_status: "queued",
      detail: "Telefone informado pelo proprietário.",
      actor_id: context.userId,
    });
    const { processPurchaseOnboarding } = await import("./purchase-onboarding.server");
    return processPurchaseOnboarding(data.id, { actorId: context.userId });
  });

export const retryOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; dryRun?: boolean }) => {
    if (!UUID.test(String(data?.id || ""))) throw new Error("Registro inválido.");
    return { id: data.id, dryRun: Boolean(data?.dryRun) };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const db = await adminDb();
    const { data: row } = await db
      .from("purchase_onboarding")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Registro não encontrado.");
    const { processPurchaseOnboarding } = await import("./purchase-onboarding.server");
    if (data.dryRun)
      return processPurchaseOnboarding(data.id, { dryRun: true, actorId: context.userId });
    if (["paired", "cancelled", "sending"].includes(row.status))
      throw new Error("Já vinculado, cancelado ou em envio; reenvio bloqueado.");
    // Reenvio gera nova ativação e invalida a anterior.
    await db
      .from("purchase_onboarding")
      .update({
        status: "queued",
        activation_code_hash: null,
        activation_token_hash: null,
        activation_expires_at: null,
        provider_message_id: null,
        next_attempt_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    await db.from("purchase_onboarding_event").insert({
      onboarding_id: data.id,
      from_status: row.status,
      to_status: "queued",
      detail: "Reenvio solicitado pelo proprietário (ativação anterior invalidada).",
      actor_id: context.userId,
    });
    return processPurchaseOnboarding(data.id, { actorId: context.userId });
  });

export const cancelOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!UUID.test(String(data?.id || ""))) throw new Error("Registro inválido.");
    return { id: data.id };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const db = await adminDb();
    const { data: row } = await db
      .from("purchase_onboarding")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Registro não encontrado.");
    if (row.status === "paired") throw new Error("Já vinculado; não há o que cancelar.");
    await db
      .from("purchase_onboarding")
      .update({
        status: "cancelled",
        activation_used_at: new Date().toISOString(),
        locked_until: null,
      })
      .eq("id", data.id);
    await db.from("purchase_onboarding_event").insert({
      onboarding_id: data.id,
      from_status: row.status,
      to_status: "cancelled",
      detail: "Cancelado pelo proprietário.",
      actor_id: context.userId,
    });
    return { ok: true };
  });

export const processOnboardingQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase);
    const db = await adminDb();
    // Reavalia pendências (canal/template podem ter sido resolvidos) e falhas vencidas.
    await db
      .from("purchase_onboarding")
      .update({ status: "queued", next_attempt_at: new Date().toISOString() })
      .in("status", ["awaiting_channel", "awaiting_template"]);
    const { processDueOnboardings } = await import("./purchase-onboarding.server");
    const results = await processDueOnboardings(20);
    return { processed: results.length };
  });

/** Simulação sem banco e sem envio: mostra a mensagem que seria enviada agora. */
export const simulatePurchaseMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name?: string; phone?: string }) => ({
    name: String(data?.name || "").slice(0, 80),
    phone: String(data?.phone || "").slice(0, 30),
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const db = await adminDb();
    const rules = await import("./purchase-onboarding-rules");
    const { data: channel } = await db
      .from("platform_support_channel")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    const phone = rules.normalizeBuyerPhone(data.phone);
    const name = rules.normalizeBuyerName(data.name);
    const decision = rules.decideOnboarding({
      hasCompany: true,
      phone,
      activeProvider: channel?.active_provider ?? null,
      channelConnected: rules.isActiveChannelConnected(channel),
      metaTemplateName: channel?.meta_template_name ?? null,
      metaTemplateApproved:
        String(channel?.meta_template_status || "").toUpperCase() === "APPROVED",
      existingIdentityCompanyId: null,
      companyId: "simulacao",
    });
    const brand = (
      await db.from("clone_brand_config").select("product_name").limit(1).maybeSingle()
    ).data;
    const product = String(brand?.product_name || "MárcIA");
    return {
      dryRun: true,
      normalized: { name, phone: rules.maskPhone(phone) },
      decision,
      preview:
        decision.action === "send" && decision.mode === "text"
          ? rules.buildEvolutionActivationText({
              name,
              product,
              code: "K7P2QX",
              template: channel?.evolution_purchase_message,
            })
          : decision.action === "send"
            ? `Template "${channel?.meta_template_name}" (${channel?.meta_template_language}) com {{1}}=${rules.firstName(name) || "cliente"} e {{2}}=K7P2QX${channel?.meta_template_has_button ? " + botão Começar" : ""}`
            : null,
    };
  });
