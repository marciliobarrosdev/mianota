/* eslint-disable @typescript-eslint/no-explicit-any */
// Onboarding de WhatsApp pós-compra. Nunca lança erro para o webhook de
// pagamento: qualquer falha vira um estado auditável na fila do Master.

import {
  ACTIVATION_TTL_HOURS,
  FIRST_USEFUL_QUESTION,
  activationPhoneMatches,
  buildEvolutionActivationText,
  buildMetaTemplatePayload,
  buildRenewalText,
  decideOnboarding,
  generateActivationCode,
  generateActivationToken,
  isActiveChannelConnected,
  maskPhone,
  mergeDeliveryStatus,
  normalizeBuyerName,
  normalizeBuyerPhone,
  parseActivationReply,
  redactSecrets,
  respondingPhoneE164,
  type CentralProvider,
} from "./purchase-onboarding-rules";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
const codeHash = (code: string) => sha256Hex(`code:${code.toUpperCase()}`);
const tokenHash = (token: string) => sha256Hex(`tok:${token}`);

async function logEvent(
  client: any,
  onboardingId: string,
  from: string | null,
  to: string | null,
  detail: string,
  actorId: string | null = null,
) {
  await client
    .from("purchase_onboarding_event")
    .insert({
      onboarding_id: onboardingId,
      from_status: from,
      to_status: to,
      detail: redactSecrets(detail),
      actor_id: actorId,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}

async function setStatus(
  client: any,
  row: any,
  status: string,
  patch: Record<string, unknown>,
  detail: string,
  actorId: string | null = null,
) {
  const { error } = await client
    .from("purchase_onboarding")
    .update({ status, status_detail: redactSecrets(detail), locked_until: null, ...patch })
    .eq("id", row.id);
  if (error) throw new Error(error.message);
  await logEvent(client, row.id, row.status, status, detail, actorId);
}

async function productName(client: any) {
  const { data } = await client
    .from("clone_brand_config")
    .select("product_name")
    .limit(1)
    .maybeSingle();
  return String(data?.product_name || "MárcIA");
}

async function ownerUserId(client: any, companyId: string) {
  const { data } = await client
    .from("company_user")
    .select("user_id,role")
    .eq("company_id", companyId)
    .eq("ativo", true)
    .order("created_at", { ascending: true })
    .limit(10);
  const rows = data ?? [];
  return (rows.find((r: any) => r.role === "owner") ?? rows[0])?.user_id ?? null;
}

export type EnqueueInput = {
  source: "stripe" | "kiwify" | "cakto" | "perfectpay" | "manual";
  eventKey: string;
  kind?: "purchase" | "renewal";
  companyId: string | null;
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
};

/**
 * Cria a linha de onboarding (idempotente pela chave do evento) e tenta enviar
 * imediatamente. Nunca lança: o retorno descreve o resultado.
 */
export async function enqueuePurchaseOnboarding(input: EnqueueInput) {
  try {
    const client = await db();
    const phone = normalizeBuyerPhone(input.buyerPhone);
    const insert = await client
      .from("purchase_onboarding")
      .insert({
        source: input.source,
        source_event_key: input.eventKey,
        kind: input.kind ?? "purchase",
        company_id: input.companyId,
        user_id: input.companyId ? await ownerUserId(client, input.companyId) : null,
        buyer_name: normalizeBuyerName(input.buyerName),
        buyer_email: input.buyerEmail ? String(input.buyerEmail).toLowerCase().slice(0, 200) : null,
        buyer_phone_e164: phone,
        phone_source: phone ? "checkout" : null,
        status: "queued",
      })
      .select("id")
      .maybeSingle();
    if (insert.error?.code === "23505") return { duplicate: true, id: null };
    if (insert.error || !insert.data) {
      console.error("[onboarding.enqueue]", redactSecrets(insert.error?.message || "sem retorno"));
      return { duplicate: false, id: null };
    }
    await logEvent(client, insert.data.id, null, "queued", `Compra recebida (${input.source}).`);
    const result = await processPurchaseOnboarding(insert.data.id);
    return { duplicate: false, id: insert.data.id, result };
  } catch (error) {
    console.error(
      "[onboarding.enqueue]",
      redactSecrets(error instanceof Error ? error.message : String(error)),
    );
    return { duplicate: false, id: null };
  }
}

const RESTARTABLE = new Set([
  "queued",
  "failed",
  "awaiting_account",
  "awaiting_phone",
  "awaiting_channel",
  "awaiting_template",
  "conflict",
]);

export type ProcessOptions = { dryRun?: boolean; actorId?: string | null; force?: boolean };

export async function processPurchaseOnboarding(id: string, options: ProcessOptions = {}) {
  const client = await db();
  const { data: row, error } = await client
    .from("purchase_onboarding")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !row) return { status: "not_found" as const };
  if (!options.dryRun && !RESTARTABLE.has(row.status) && !options.force) {
    return { status: row.status, skipped: true };
  }

  // Reserva atômica para nunca enviar duas vezes em paralelo.
  if (!options.dryRun) {
    const now = new Date().toISOString();
    const claim = await client
      .from("purchase_onboarding")
      .update({
        status: "sending",
        locked_until: new Date(Date.now() + 60_000).toISOString(),
      })
      .eq("id", id)
      .eq("status", row.status)
      .or(`locked_until.is.null,locked_until.lt.${now}`)
      .select("id")
      .maybeSingle();
    if (claim.error || !claim.data) return { status: row.status, skipped: true };
  }
  const current = { ...row, status: options.dryRun ? row.status : "sending" };

  try {
    const channel = (
      await client.from("platform_support_channel").select("*").eq("id", true).maybeSingle()
    ).data;
    let phone: string | null = row.buyer_phone_e164;
    if (!phone && row.company_id) {
      const { data: company } = await client
        .from("company")
        .select("telefone")
        .eq("id", row.company_id)
        .maybeSingle();
      phone = normalizeBuyerPhone(company?.telefone);
      if (phone && !options.dryRun) {
        await client
          .from("purchase_onboarding")
          .update({ buyer_phone_e164: phone, phone_source: "cadastro" })
          .eq("id", id);
      }
    }
    let identityCompany: string | null = null;
    if (phone) {
      const { data: identities } = await client
        .from("fin_whatsapp_identity")
        .select("company_id")
        .eq("phone_e164", phone)
        .eq("active", true)
        .limit(2);
      identityCompany = identities?.[0]?.company_id ?? null;
    }
    const activeProvider = (channel?.active_provider ?? null) as CentralProvider | null;
    const decision = decideOnboarding({
      hasCompany: Boolean(row.company_id),
      phone,
      activeProvider,
      // Específico do canal ativo: o registro precisa estar com provider = active_provider
      // e conectado. Se a configuração do outro canal mexeu no registro, aguarda.
      channelConnected: isActiveChannelConnected(channel),
      metaTemplateName: channel?.meta_template_name ?? null,
      metaTemplateApproved: String(channel?.meta_template_status || "").toUpperCase() === "APPROVED",
      existingIdentityCompanyId: identityCompany,
      companyId: row.company_id,
    });

    if (decision.action === "wait") {
      if (options.dryRun) return { status: decision.status, dryRun: true, detail: decision.detail };
      await setStatus(client, current, decision.status, { channel_provider: activeProvider }, decision.detail, options.actorId);
      return { status: decision.status };
    }
    if (decision.action === "conflict") {
      if (options.dryRun) return { status: "conflict", dryRun: true, detail: decision.detail };
      await setStatus(client, current, "conflict", { channel_provider: activeProvider }, decision.detail, options.actorId);
      return { status: "conflict" };
    }

    const product = await productName(client);
    const to = String(phone);

    if (decision.action === "renewal") {
      const text = buildRenewalText({ name: row.buyer_name, product });
      if (options.dryRun) {
        const preview = { provider: decision.provider, to: maskPhone(to), kind: "renewal", text };
        await client.from("purchase_onboarding").update({ dry_run_preview: preview }).eq("id", id);
        await logEvent(client, id, row.status, row.status, "Simulação (dry-run) de renovação; nada enviado.", options.actorId);
        return { status: row.status, dryRun: true, preview };
      }
      // Meta não aceita texto livre fora da janela de 24h: o vínculo é preservado
      // e a renovação fica registrada sem enviar mensagem.
      if (decision.provider === "meta") {
        await setStatus(
          client,
          current,
          "paired",
          { kind: "renewal", channel_provider: "meta", paired_at: new Date().toISOString(), paired_phone_e164: to },
          "Renovação: vínculo preservado. Na Meta não há template de renovação, então nenhuma mensagem foi enviada.",
          options.actorId,
        );
        return { status: "paired", renewal: true };
      }
      const messageId = await sendEvolution(channel, to, text);
      await setStatus(
        client,
        current,
        "sent",
        {
          kind: "renewal",
          channel_provider: decision.provider,
          provider_message_id: messageId,
          sent_at: new Date().toISOString(),
          paired_at: new Date().toISOString(),
          paired_phone_e164: to,
          attempts: Number(row.attempts || 0) + 1,
          last_error: null,
        },
        "Renovação confirmada; vínculo existente preservado.",
        options.actorId,
      );
      if (messageId) await reconcilePendingStatuses(messageId);
      return { status: "sent", renewal: true };
    }

    const code = generateActivationCode(crypto.getRandomValues(new Uint8Array(6)));
    const token = generateActivationToken(crypto.getRandomValues(new Uint8Array(24)));
    const expiresAt = new Date(Date.now() + ACTIVATION_TTL_HOURS * 3600_000).toISOString();

    if (options.dryRun) {
      const preview =
        decision.mode === "text"
          ? {
              provider: "evolution",
              to: maskPhone(to),
              text: buildEvolutionActivationText({
                name: row.buyer_name,
                product,
                code: "••••••",
                template: channel.evolution_purchase_message,
              }),
            }
          : {
              provider: "meta",
              to: maskPhone(to),
              template: channel.meta_template_name,
              language: channel.meta_template_language,
              parameters: [row.buyer_name ? row.buyer_name.split(" ")[0] : "cliente", "••••••"],
              quickReplyButton: Boolean(channel.meta_template_has_button),
            };
      await client.from("purchase_onboarding").update({ dry_run_preview: preview }).eq("id", id);
      await logEvent(client, id, row.status, row.status, "Simulação (dry-run); nenhuma mensagem enviada.", options.actorId);
      return { status: row.status, dryRun: true, preview };
    }

    // Grava o hash da ativação ANTES do envio: a resposta pode chegar muito rápido.
    const saved = await client
      .from("purchase_onboarding")
      .update({
        activation_code_hash: await codeHash(code),
        activation_token_hash: await tokenHash(token),
        activation_expires_at: expiresAt,
        activation_used_at: null,
        channel_provider: decision.provider,
      })
      .eq("id", id);
    if (saved.error) throw new Error(saved.error.message);

    const messageId =
      decision.mode === "text"
        ? await sendEvolution(
            channel,
            to,
            buildEvolutionActivationText({
              name: row.buyer_name,
              product,
              code,
              template: channel.evolution_purchase_message,
            }),
          )
        : await sendMetaTemplateMessage(
            buildMetaTemplatePayload({
              to,
              name: channel.meta_template_name,
              language: channel.meta_template_language || "pt_BR",
              buyerName: row.buyer_name,
              code,
              token,
              hasButton: Boolean(channel.meta_template_has_button),
            }),
          );
    await setStatus(
      client,
      current,
      "sent",
      {
        provider_message_id: messageId,
        sent_at: new Date().toISOString(),
        attempts: Number(row.attempts || 0) + 1,
        last_error: null,
      },
      decision.mode === "text"
        ? "Mensagem de compra aprovada enviada pelo QR Code."
        : "Template de compra aprovada enviado pela Meta.",
      options.actorId,
    );
    if (messageId) await reconcilePendingStatuses(messageId);
    return { status: "sent" };
  } catch (error) {
    const message = redactSecrets(error instanceof Error ? error.message : String(error));
    if (options.dryRun) return { status: row.status, dryRun: true, error: message };
    const attempts = Number(row.attempts || 0) + 1;
    await setStatus(
      client,
      current,
      "failed",
      {
        attempts,
        failed_at: new Date().toISOString(),
        last_error: message,
        next_attempt_at: new Date(Date.now() + Math.min(6, attempts) * 10 * 60_000).toISOString(),
      },
      `Falha no envio: ${message}`,
      options.actorId,
    ).catch(() => undefined);
    return { status: "failed", error: message };
  }
}

async function sendEvolution(channel: any, to: string, text: string) {
  if (!channel?.instance_name) throw new Error("Instância do QR Code indisponível.");
  const { evoSendText } = await import("./evolution.server");
  const sent: any = await evoSendText(String(channel.instance_name), to.replace(/\D/g, ""), text);
  return String(sent?.key?.id || sent?.messageId || "") || null;
}

async function sendMetaTemplateMessage(payload: any) {
  const { sendMetaPayload } = await import("./master-whatsapp.server");
  return sendMetaPayload(payload);
}

/** Recuperação limitada: processa poucas linhas vencidas, mais antigas primeiro por próxima tentativa. */
export async function processDueOnboardings(limit = 5) {
  const client = await db();
  const { data } = await client
    .from("purchase_onboarding")
    .select("id")
    .in("status", ["queued", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .lt("attempts", 6)
    .order("next_attempt_at", { ascending: true })
    .limit(limit);
  const results = [];
  for (const row of data ?? []) results.push(await processPurchaseOnboarding(row.id));
  return results;
}

// ---------------- Status de entrega ----------------

export async function applyDeliveryStatus(
  provider: CentralProvider,
  providerMessageId: string,
  status: "sent" | "delivered" | "read" | "failed",
  providerTs: string | null,
  errorText: string | null,
) {
  if (!providerMessageId) return;
  const client = await db();
  const { data: row } = await client
    .from("purchase_onboarding")
    .select("id,status,sent_at,delivered_at,read_at,failed_at")
    .eq("provider_message_id", providerMessageId)
    .maybeSingle();
  if (!row) {
    // Pode chegar antes de salvarmos o id do envio: guarda para reconciliar.
    await client
      .from("whatsapp_status_inbox")
      .upsert(
        {
          provider,
          provider_message_id: providerMessageId,
          status,
          provider_ts: providerTs,
          error: errorText ? redactSecrets(errorText) : null,
        },
        { onConflict: "provider_message_id,status", ignoreDuplicates: true },
      )
      .then(
        () => undefined,
        () => undefined,
      );
    return;
  }
  const ts = providerTs || new Date().toISOString();
  const patch: Record<string, unknown> = {};
  if (status === "sent" && !row.sent_at) patch.sent_at = ts;
  if (status === "delivered" && !row.delivered_at) patch.delivered_at = ts;
  if (status === "read" && !row.read_at) patch.read_at = ts;
  if (status === "failed" && !row.failed_at) {
    patch.failed_at = ts;
    patch.last_error = errorText ? redactSecrets(errorText) : "Falha informada pelo WhatsApp.";
  }
  const next = mergeDeliveryStatus(row.status, status);
  if (next !== row.status) patch.status = next;
  if (!Object.keys(patch).length) return;
  await client.from("purchase_onboarding").update(patch).eq("id", row.id);
  if (next !== row.status) await logEvent(client, row.id, row.status, next, `Status do WhatsApp: ${status}.`);
}

export async function reconcilePendingStatuses(providerMessageId: string) {
  const client = await db();
  const { data } = await client
    .from("whatsapp_status_inbox")
    .select("*")
    .eq("provider_message_id", providerMessageId)
    .is("processed_at", null)
    .order("created_at", { ascending: true });
  for (const item of data ?? []) {
    await applyDeliveryStatus(item.provider, item.provider_message_id, item.status, item.provider_ts, item.error);
    await client
      .from("whatsapp_status_inbox")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", item.id);
  }
}

// ---------------- Ativação na primeira resposta ----------------

export type ActivationResult =
  | { handled: false }
  | {
      handled: true;
      ok: boolean;
      reply: string;
      companyId?: string;
      userId?: string;
    };

/**
 * Tenta tratar a mensagem como confirmação de compra. Retorna handled=false
 * quando a mensagem não é uma ativação (o fluxo normal continua).
 */
export async function tryActivatePurchase(input: {
  phone: string;
  displayName?: string | null;
  message: string;
  buttonPayload?: string | null;
}): Promise<ActivationResult> {
  const parsed = parseActivationReply(input.message, input.buttonPayload);
  if (!parsed) return { handled: false };
  const client = await db();
  const phoneE164 = respondingPhoneE164(input.phone);
  const nowIso = new Date().toISOString();
  const base = () =>
    client
      .from("purchase_onboarding")
      .select("*")
      .is("activation_used_at", null)
      .gt("activation_expires_at", nowIso)
      .in("status", ["sent", "delivered", "read", "failed"]);
  const invalidReply: ActivationResult = {
    handled: true,
    ok: false,
    reply: "Esse código venceu, já foi usado ou não existe. Fale com o suporte para receber um novo.",
  };

  let candidates: any[] = [];
  if (parsed.kind === "code") {
    candidates = (await base().eq("activation_code_hash", await codeHash(parsed.code)).limit(2)).data ?? [];
  } else if (parsed.kind === "token") {
    candidates = (await base().eq("activation_token_hash", await tokenHash(parsed.token)).limit(2)).data ?? [];
  } else {
    // "Começar" sem código: só aceita se houver exatamente um pendente para ESTE telefone.
    candidates = (await base().eq("buyer_phone_e164", phoneE164).limit(2)).data ?? [];
    if (candidates.length !== 1) {
      const pendingAny = candidates.length > 1;
      return {
        handled: true,
        ok: false,
        reply: pendingAny
          ? "Encontrei mais de uma ativação pendente para este número. Responda com o código exato da mensagem, por exemplo: COMEÇAR K7P2QX."
          : "Para ativar, responda com o código da mensagem de compra aprovada, por exemplo: COMEÇAR K7P2QX. Se o código venceu, fale com o suporte.",
      };
    }
  }
  if (candidates.length !== 1) return invalidReply;
  const row = candidates[0];
  // Código, token e botão só valem para o telefone que recebeu a confirmação.
  // Outro número recebe a mesma resposta de código inválido: nada é consumido,
  // o estado não muda e nenhum vínculo é criado.
  if (!activationPhoneMatches(row.buyer_phone_e164, phoneE164)) {
    await logEvent(
      client,
      row.id,
      row.status,
      row.status,
      "Ativação recusada: código recebido de um número diferente do que recebeu a confirmação.",
    );
    return invalidReply;
  }
  if (!row.company_id || !row.user_id) {
    return { handled: true, ok: false, reply: "Sua assinatura ainda está sendo preparada. Tente novamente em alguns minutos." };
  }

  const { data: identities } = await client
    .from("fin_whatsapp_identity")
    .select("company_id")
    .eq("phone_e164", phoneE164)
    .eq("active", true)
    .limit(3);
  if ((identities ?? []).some((i: any) => i.company_id !== row.company_id)) {
    await setStatus(client, row, "conflict", { paired_phone_e164: phoneE164 }, "Telefone que respondeu já está ativo em outra assinatura.");
    return {
      handled: true,
      ok: false,
      reply: "Este número já está vinculado a outra conta. Nossa equipe foi avisada e vai te ajudar.",
    };
  }

  // Marca uso único de forma atômica antes de vincular.
  const consumed = await client
    .from("purchase_onboarding")
    .update({ activation_used_at: nowIso })
    .eq("id", row.id)
    .is("activation_used_at", null)
    .select("id")
    .maybeSingle();
  if (consumed.error || !consumed.data) {
    return { handled: true, ok: false, reply: "Esse código já foi usado. Se precisar, fale com o suporte." };
  }

  const saved = await client.from("fin_whatsapp_identity").upsert(
    {
      company_id: row.company_id,
      user_id: row.user_id,
      phone_e164: phoneE164,
      display_name: input.displayName || row.buyer_name || null,
      active: true,
      verified_at: nowIso,
    },
    { onConflict: "company_id,user_id" },
  );
  if (saved.error) {
    await client.from("purchase_onboarding").update({ activation_used_at: null }).eq("id", row.id);
    throw new Error(saved.error.message);
  }
  await setStatus(
    client,
    row,
    "paired",
    { paired_at: nowIso, paired_phone_e164: phoneE164 },
    parsed.kind === "token" ? "Vinculado pelo botão Começar." : "Vinculado pelo código de ativação.",
  );
  // Invalida outras ativações pendentes do mesmo assinante.
  await client
    .from("purchase_onboarding")
    .update({ activation_used_at: nowIso })
    .eq("company_id", row.company_id)
    .is("activation_used_at", null)
    .neq("id", row.id);
  return {
    handled: true,
    ok: true,
    reply: FIRST_USEFUL_QUESTION,
    companyId: row.company_id,
    userId: row.user_id,
  };
}
