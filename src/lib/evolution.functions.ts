/* eslint-disable @typescript-eslint/no-explicit-any, no-empty -- legacy provider payloads and best-effort fallbacks are intentionally untyped */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";

function deriveInstanceName(companyId: string) {
  // Existing rows keep their saved instance_name; this neutral prefix is used only for new clones.
  return `clone_${companyId.replace(/-/g, "").slice(0, 16)}`;
}

function buildWebhookUrl(token?: string | null) {
  try {
    const req = getRequest();
    const url = new URL(req.url);
    const tokenQuery = token ? `?t=${encodeURIComponent(token)}` : "";
    return `${url.protocol}//${url.host}/api/public/whatsapp-webhook${tokenQuery}`;
  } catch {
    return "";
  }
}

function validateCompanyScope(data: { companyId?: string }) {
  const companyId = String(data?.companyId || "").trim();
  if (!companyId) throw new Error("Assinante não informado.");
  return { companyId };
}

async function resolveCompanyId(supabase: any, userId: string): Promise<string> {
  const { assertUserPasswordReady } = await import("./company-admin-access.server");
  await assertUserPasswordReady(supabase);
  const { data, error } = await supabase
    .from("company_user")
    .select("company_id,forcar_troca_senha")
    .eq("user_id", userId)
    .eq("ativo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Você ainda não possui uma conta de assinante. Finalize o onboarding.");
  if (data.forcar_troca_senha) {
    throw new Error("Troque a senha temporária antes de usar a operação.");
  }
  return data.company_id as string;
}

export const connectWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateCompanyScope)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { requireCompanyAdminAccess, resolveWhatsappInstanceUserId } =
      await import("./company-admin-access.server");
    const access = await requireCompanyAdminAccess(supabase, userId, data.companyId);
    const companyId = access.companyId;
    const { assertCompanyOperational, assertCompanyPlanFeature } =
      await import("./plan-limits.server");
    await assertCompanyOperational(companyId, { superAdminBypass: access.isSuperAdmin });
    await assertCompanyPlanFeature(
      companyId,
      "automacoes",
      "O WhatsApp financeiro está disponível no plano Pro.",
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { describeIntegration } = await import("./integration-secrets.server");
    const integration = await describeIntegration("evolution");
    if (!integration.configured || integration.testOk !== true) {
      throw new Error(
        "O servidor do WhatsApp ainda não foi validado. O proprietário deve salvar e testar a Evolution em Super admin → WhatsApp QR Code antes de gerar o QR Code.",
      );
    }
    const { evoCreateInstance, evoDelete, evoGetQr, evoParseQrPayload, evoSetWebhook, evoState } =
      await import("./evolution.server");

    const { data: existing, error: existingError } = await admin
      .from("whatsapp_instances")
      .select("instance_name,status,numero,webhook_token,webhook_configured_at,user_id")
      .eq("company_id", companyId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    const instanceName = existing?.instance_name || deriveInstanceName(companyId);
    const webhookToken = existing?.webhook_token || crypto.randomUUID();
    const webhookUrl = buildWebhookUrl(webhookToken);
    if (existing?.instance_name) {
      try {
        const s = await evoState(existing.instance_name);
        const existingState = s?.instance?.state || (s as any)?.state;
        // Um clique anterior em Desconectar marca a linha como desconectada.
        // Mesmo que o provedor ainda reporte a sessão como aberta por alguns
        // segundos, a próxima conexão deve limpar essa sessão e gerar um QR novo.
        if (existingState === "open" && existing.status !== "disconnected") {
          let webhookConfiguredAt = existing.webhook_configured_at as string | null;
          let webhookAttempted = false;
          if (webhookUrl) {
            webhookAttempted = true;
            try {
              await evoSetWebhook(existing.instance_name, webhookUrl);
              webhookConfiguredAt = new Date().toISOString();
            } catch (e) {
              console.warn("[evolution.setWebhook]", e);
              webhookConfiguredAt = null;
            }
          }
          if (existing.status !== "connected" || webhookAttempted) {
            const { error: updateError } = await admin
              .from("whatsapp_instances")
              .update({
                status: "connected",
                webhook_token: webhookToken,
                webhook_configured_at: webhookConfiguredAt,
              } as any)
              .eq("company_id", companyId);
            if (updateError) throw new Error(updateError.message);
          }
          return {
            instanceName: existing.instance_name,
            qrBase64: null,
            pairingCode: null,
            qrUnavailable: false,
            state: "open",
            webhookConfigured: Boolean(webhookConfiguredAt),
          };
        }
      } catch {}
    }

    const instanceUserId =
      existing?.user_id || (await resolveWhatsappInstanceUserId(supabase, userId, access));
    const { error: persistError } = await admin.from("whatsapp_instances").upsert(
      {
        company_id: companyId,
        user_id: instanceUserId,
        instance_name: instanceName,
        status: "connecting",
        webhook_token: webhookToken,
      } as any,
      { onConflict: "company_id" },
    );
    if (persistError) throw new Error(persistError.message);

    try {
      // Se havia uma sessão explicitamente desconectada, remova qualquer resto
      // remoto antes de recriar. Isso evita o ciclo "já existe" sem QR.
      if (existing?.instance_name && existing.status === "disconnected") {
        try {
          await evoDelete(instanceName);
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (cleanupError: any) {
          const cleanupMessage = String(cleanupError?.message || "");
          if (!/404|not found|does not exist|não encontr/i.test(cleanupMessage)) {
            console.warn("[evolution.cleanup-before-connect]", cleanupError);
          }
        }
      }

      let createdQr: ReturnType<typeof evoParseQrPayload> | null = null;
      try {
        const created = await evoCreateInstance(instanceName, webhookUrl);
        createdQr = evoParseQrPayload(created);
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (!/exists|already|já existe|existente/i.test(msg))
          console.warn("[evolution.create]", msg);
        if (!/exists|already|já existe|existente/i.test(msg)) throw e;
      }

      let webhookConfiguredAt: string | null = null;
      if (webhookUrl) {
        try {
          await evoSetWebhook(instanceName, webhookUrl);
          webhookConfiguredAt = new Date().toISOString();
          const { error: webhookPersistError } = await admin
            .from("whatsapp_instances")
            .update({ webhook_configured_at: webhookConfiguredAt } as any)
            .eq("company_id", companyId);
          if (webhookPersistError) throw new Error(webhookPersistError.message);
        } catch (e) {
          console.warn("[evolution.setWebhook]", e);
          webhookConfiguredAt = null;
          const { error: clearWebhookError } = await admin
            .from("whatsapp_instances")
            .update({ webhook_configured_at: null } as any)
            .eq("company_id", companyId);
          if (clearWebhookError) console.warn("[evolution.clearWebhookStatus]", clearWebhookError);
        }
      }

      let qrBase64: string | null = createdQr?.qrBase64 || null;
      let code: string | null = createdQr?.code || null;
      let pairingCode: string | null = createdQr?.pairingCode || null;
      let lastQrError: unknown = null;
      for (let i = 0; i < 6 && !qrBase64 && !pairingCode && !code; i++) {
        try {
          const qr = await evoGetQr(instanceName);
          qrBase64 = qr.qrBase64;
          code = qr.code;
          pairingCode = qr.pairingCode;
          if (qrBase64 || pairingCode || code) break;
        } catch (e) {
          lastQrError = e;
          console.warn("[evolution.connect]", e);
        }
        await new Promise((r) => setTimeout(r, 800));
      }

      let state: string | undefined;
      try {
        const s = await evoState(instanceName);
        state = s?.instance?.state || (s as any)?.state;
      } catch {}

      // Uma instância abandonada pode permanecer eternamente como "connecting"
      // sem devolver outro QR. O assinante não deve precisar conhecer Evolution
      // nem pedir ao proprietário para apagar a sessão manualmente. Como esta
      // rotina só roda depois do clique explícito em "Gerar QR Code", recriamos
      // com segurança apenas quando a sessão existente não está aberta e não
      // entregou nenhum meio de pareamento.
      if (existing?.instance_name && state !== "open" && !qrBase64 && !pairingCode && !code) {
        try {
          await evoDelete(instanceName);
          await new Promise((resolve) => setTimeout(resolve, 300));
          const recreated = await evoCreateInstance(instanceName, webhookUrl);
          const parsed = evoParseQrPayload(recreated);
          qrBase64 = parsed.qrBase64;
          code = parsed.code;
          pairingCode = parsed.pairingCode;

          if (webhookUrl) {
            try {
              await evoSetWebhook(instanceName, webhookUrl);
              webhookConfiguredAt = new Date().toISOString();
              await admin
                .from("whatsapp_instances")
                .update({ webhook_configured_at: webhookConfiguredAt } as any)
                .eq("company_id", companyId);
            } catch (webhookError) {
              console.warn("[evolution.setWebhook.recreated]", webhookError);
            }
          }

          for (let i = 0; i < 8 && !qrBase64 && !pairingCode && !code; i++) {
            try {
              const qr = await evoGetQr(instanceName);
              qrBase64 = qr.qrBase64;
              code = qr.code;
              pairingCode = qr.pairingCode;
              if (qrBase64 || pairingCode || code) break;
            } catch (qrError) {
              lastQrError = qrError;
            }
            await new Promise((resolve) => setTimeout(resolve, 750));
          }

          try {
            const refreshedState = await evoState(instanceName);
            state = refreshedState?.instance?.state || (refreshedState as any)?.state;
          } catch {}
        } catch (resetError) {
          lastQrError = resetError;
          console.warn("[evolution.recreate]", resetError);
        }
      }

      if (!qrBase64 && !code && !pairingCode && state !== "open" && lastQrError) {
        throw lastQrError;
      }

      // O payload bruto do QR funciona como credencial temporária e não deve sair
      // do backend. A interface recebe somente a imagem, o código de pareamento ou
      // uma indicação segura de incompatibilidade da resposta da Evolution.
      const qrUnavailable = state !== "open" && !qrBase64 && !pairingCode;
      if (qrUnavailable) {
        await admin
          .from("whatsapp_instances")
          .update({ status: "disconnected" } as any)
          .eq("company_id", companyId);
      }
      return {
        instanceName,
        qrBase64,
        pairingCode,
        qrUnavailable,
        state,
        webhookConfigured: Boolean(webhookConfiguredAt),
      };
    } catch (error) {
      // Nunca deixar o painel preso em "Conectando" quando o provedor recusou
      // ou nem chegou a receber a solicitação.
      await admin
        .from("whatsapp_instances")
        .update({ status: "disconnected" } as any)
        .eq("company_id", companyId);
      throw error;
    }
  });

export const checkWhatsappStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateCompanyScope)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { requireCompanyAdminAccess } = await import("./company-admin-access.server");
    const access = await requireCompanyAdminAccess(supabase, userId, data.companyId);
    const companyId = access.companyId;
    const { assertCompanyOperational } = await import("./plan-limits.server");
    await assertCompanyOperational(companyId, { superAdminBypass: access.isSuperAdmin });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { evoState, evoFetchNumberFromInstance, evoGetQr, evoSetWebhook } =
      await import("./evolution.server");

    const { data: row, error: rowError } = await admin
      .from("whatsapp_instances")
      .select("instance_name,status,numero,webhook_token,webhook_configured_at")
      .eq("company_id", companyId)
      .maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row)
      return { status: "disconnected", state: null, numero: null, qrBase64: null, code: null };

    let state: string | null = null;
    let stateError = false;
    try {
      const s = await evoState(row.instance_name);
      state = s?.instance?.state || (s as any)?.state || null;
    } catch (e) {
      stateError = true;
      console.warn("[evolution.state]", e);
    }

    // Nunca buscar QR em uma sessão aberta. Enquanto a instância ainda está em
    // pareamento, porém, o polling também recupera o código que alguns builds
    // da Evolution só disponibilizam alguns segundos depois da criação.
    if (stateError) {
      return {
        status: row.status || "disconnected",
        state: null,
        numero: row.numero ?? null,
        qrBase64: null,
        code: null,
      };
    }

    const newStatus =
      state === "open" ? "connected" : state === "connecting" ? "connecting" : "disconnected";

    let qrBase64: string | null = null;
    let pairingCode: string | null = null;
    let qrUnavailable = false;
    if (newStatus === "connecting") {
      try {
        const qr = await evoGetQr(row.instance_name);
        qrBase64 = qr.qrBase64;
        pairingCode = qr.pairingCode;
        qrUnavailable = !qr.qrBase64 && !qr.pairingCode;
      } catch (error) {
        qrUnavailable = true;
        console.warn("[evolution.qr.poll]", error);
      }
    }

    let numero: string | null = row.numero ?? null;
    if (newStatus === "connected" && !numero) {
      try {
        numero = await evoFetchNumberFromInstance(row.instance_name);
      } catch {}
    }
    if (newStatus === "connected" && row.webhook_token && !row.webhook_configured_at) {
      const webhookUrl = buildWebhookUrl(row.webhook_token);
      if (webhookUrl) {
        try {
          await evoSetWebhook(row.instance_name, webhookUrl);
          await admin
            .from("whatsapp_instances")
            .update({ webhook_configured_at: new Date().toISOString() } as any)
            .eq("company_id", companyId);
        } catch (e) {
          console.warn("[evolution.setWebhook]", e);
          const { error: clearWebhookError } = await admin
            .from("whatsapp_instances")
            .update({ webhook_configured_at: null } as any)
            .eq("company_id", companyId);
          if (clearWebhookError) console.warn("[evolution.clearWebhookStatus]", clearWebhookError);
        }
      }
    }

    if (newStatus !== row.status || (numero && numero !== row.numero)) {
      await admin
        .from("whatsapp_instances")
        .update({ status: newStatus, ...(numero ? { numero } : {}) })
        .eq("company_id", companyId);
    }

    return { status: newStatus, state, numero, qrBase64, pairingCode, qrUnavailable };
  });

export const disconnectWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateCompanyScope)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { requireCompanyAdminAccess } = await import("./company-admin-access.server");
    const { companyId } = await requireCompanyAdminAccess(supabase, userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { evoDelete, evoLogout } = await import("./evolution.server");
    const { data: row, error: rowError } = await admin
      .from("whatsapp_instances")
      .select("instance_name")
      .eq("company_id", companyId)
      .maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (row) {
      try {
        await evoLogout(row.instance_name);
      } catch (e) {
        console.warn("[evolution.logout]", e);
      }
      try {
        await evoDelete(row.instance_name);
      } catch (e: any) {
        const message = String(e?.message || "");
        if (!/404|not found|does not exist|não encontr/i.test(message)) {
          console.warn("[evolution.delete-on-disconnect]", e);
        }
      }
      await admin
        .from("whatsapp_instances")
        .update({
          status: "disconnected",
          numero: null,
          webhook_configured_at: null,
          webhook_token: crypto.randomUUID(),
        })
        .eq("company_id", companyId);
    }
    return { ok: true };
  });

export const sendWhatsappText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { numero: string; texto: string; contatoNome?: string | null }) => ({
    numero: String(d?.numero || "")
      .replace(/\D/g, "")
      .slice(0, 20),
    texto: String(d?.texto || "")
      .trim()
      .slice(0, 4000),
    contatoNome: d?.contatoNome ? String(d.contatoNome).trim().slice(0, 160) : null,
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    // The public API exposes conversation history read-only and keeps the
    // Evolution credential row restricted to owner/admin. Operational sends
    // therefore persist through the trusted server client only after the
    // authenticated membership above resolved the tenant.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: inst } = await admin
      .from("whatsapp_instances")
      .select("instance_name,status")
      .eq("company_id", companyId)
      .maybeSingle();
    if (!inst?.instance_name) throw new Error("WhatsApp não conectado");
    const { data: recentInbound } = await admin
      .from("mensagens")
      .select("id")
      .eq("company_id", companyId)
      .eq("numero", data.numero)
      .eq("direcao", "entrada")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString())
      .limit(1);
    if (!recentInbound?.length) {
      throw new Error(
        "Por segurança, só é possível responder contatos que mandaram mensagem nas últimas 24h. Para iniciar conversa, use a API oficial com template aprovado.",
      );
    }
    const { data: recentOutbound } = await admin
      .from("mensagens")
      .select("id")
      .eq("company_id", companyId)
      .eq("numero", data.numero)
      .eq("direcao", "saida")
      .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString())
      .limit(6);
    if ((recentOutbound?.length ?? 0) >= 6) {
      throw new Error("Envio pausado por alguns minutos para proteger a qualidade do número.");
    }
    const {
      assertWithinLimit,
      markMessageQuotaAttempt,
      persistOutboundMessagesAndFinalizeQuota,
      reserveMessageQuota,
    } = await import("./plan-limits.server");
    if (!data.numero || !data.texto) throw new Error("Número e mensagem são obrigatórios.");
    await assertWithinLimit(companyId, "mensagens");
    const quotaRef = `manual:${crypto.randomUUID()}`;
    if (!(await reserveMessageQuota(companyId, quotaRef, 1))) {
      throw new Error("O limite mensal de mensagens do plano foi atingido.");
    }
    const { evoSendText } = await import("./evolution.server");
    try {
      await markMessageQuotaAttempt(companyId, quotaRef, 1);
      await evoSendText(inst.instance_name, data.numero, data.texto);
    } catch (e: any) {
      // A falha da API pode ser ambígua (por exemplo, queda da conexão depois
      // de o provedor aceitar a mensagem). A reserva permanece contabilizada
      // para nunca liberar duas vezes o mesmo slot.
      throw new Error(`Falha ao enviar: ${e?.message ?? e}`);
    }
    // Pause the assistant immediately after provider acceptance. If history
    // persistence needs reconciliation, the next inbound still cannot trigger
    // an automated reply over the human conversation.
    const warnings: string[] = [];
    const { error: pauseError } = await admin
      .from("contact_pause")
      .upsert(
        { company_id: companyId, user_id: userId, numero: data.numero, pausado: true },
        { onConflict: "company_id,numero" },
      );
    if (pauseError) {
      console.error("[manual-send pause]", pauseError.message);
      warnings.push("A mensagem foi enviada, mas a pausa da IA precisa ser reconciliada.");
    }
    try {
      await persistOutboundMessagesAndFinalizeQuota({
        companyId,
        ref: quotaRef,
        userId,
        number: data.numero,
        contactName: data.contatoNome,
        author: "humano",
        messages: [data.texto],
      });
    } catch (persistError) {
      // O provedor já aceitou a mensagem. Nunca devolva um falso erro de
      // envio que incentive o operador a duplicá-la; a reserva tentada fica
      // contabilizada até a reconciliação do histórico.
      console.error("[manual-send persistence]", persistError);
      warnings.push("A mensagem foi enviada, mas o histórico precisa ser reconciliado.");
    }
    return { ok: true, warning: warnings.length ? warnings.join(" ") : undefined };
  });

export const setContactIaActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { numero: string; ativa: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const { error } = await supabase
      .from("contact_pause")
      .upsert(
        { company_id: companyId, user_id: userId, numero: data.numero, pausado: !data.ativa },
        { onConflict: "company_id,numero" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testAiReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; message: string }) => {
    const companyId = String(d?.companyId || "").trim();
    const message = String(d?.message || "").trim();
    if (!companyId) throw new Error("Assinante não informado.");
    if (!message) throw new Error("Digite uma mensagem para testar.");
    return { companyId, message: message.slice(0, 1000) };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const access = await (
      await import("./company-admin-access.server")
    ).requireCompanyAdminAccess(supabase, userId, data.companyId);
    const companyId = access.companyId;
    const { assertCompanyOperational } = await import("./plan-limits.server");
    await assertCompanyOperational(companyId, { superAdminBypass: access.isSuperAdmin });
    const { lovableAiChat } = await import("./lovable-ai.server");
    const { LOVABLE_AI_MODEL } = await import("./lovable-ai-config");
    const { buildSystemPrompt, parseAiOutput } = await import("./ai-prompt");
    const [{ loadCloneBrandServer }, { applyAssistantBrand }] = await Promise.all([
      import("./brand.server"),
      import("@/config/brand"),
    ]);
    const [{ data: cfg }, { data: serviceRows }] = await Promise.all([
      supabase.from("agent_config").select("*").eq("company_id", companyId).maybeSingle(),
      supabase
        .from("marcia_service")
        .select("name,price_cents,duration_minutes,sort_order")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
    ]);
    const produtos = (serviceRows ?? []).map((service: any) => ({
      nome: service.name,
      preco:
        service.price_cents == null
          ? undefined
          : (Number(service.price_cents) / 100).toFixed(2).replace(".", ","),
      descricao: `${service.duration_minutes} min`,
    }));
    const cloneBrand = await loadCloneBrandServer();
    const brandedConfig = applyAssistantBrand(cfg ?? {}, cloneBrand.assistantName);
    const system = buildSystemPrompt(brandedConfig, {
      responderEmPartes: cfg?.responder_em_partes ?? true,
      stages: [],
      produtos,
    });

    const raw = await lovableAiChat(
      [
        { role: "system", content: system },
        { role: "user", content: data.message },
      ],
      {
        model: LOVABLE_AI_MODEL,
      },
    );
    const { parts, stage } = parseAiOutput(raw, []);
    if (!parts.length) throw new Error("A IA não retornou uma resposta utilizável.");
    return { reply: parts.join("\n\n"), parts, stage, system };
  });
