import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";

async function resolveCompanyId(supabase: any, userId: string): Promise<string> {
  const { assertUserPasswordReady } = await import("./company-admin-access.server");
  await assertUserPasswordReady(supabase);
  const { data } = await supabase
    .from("company_user")
    .select("company_id,forcar_troca_senha")
    .eq("user_id", userId)
    .eq("ativo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Sem empresa.");
  if (data.forcar_troca_senha) {
    throw new Error("Troque a senha temporária antes de usar a operação.");
  }
  return data.company_id as string;
}

function appOrigin(): string {
  try {
    const u = new URL(getRequest().url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

export const sendCsat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { numero: string; contatoNome?: string | null }) => ({
    numero: String(d?.numero || "")
      .replace(/\D/g, "")
      .slice(0, 20),
    contatoNome: d?.contatoNome ? String(d.contatoNome).trim().slice(0, 160) : null,
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const numero = data.numero;
    if (!numero) throw new Error("Número inválido.");

    // Connection credentials and message writes are server-only. The company
    // id still comes from the caller's active membership above.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin;
    const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const [instanceResult, inboundResult, recentOutboundResult] = await Promise.all([
      admin
        .from("whatsapp_instances")
        .select("instance_name,status")
        .eq("company_id", companyId)
        .maybeSingle(),
      admin
        .from("mensagens")
        .select("id")
        .eq("company_id", companyId)
        .eq("numero", numero)
        .eq("direcao", "entrada")
        .gte("created_at", dayAgo)
        .limit(1),
      admin
        .from("mensagens")
        .select("id")
        .eq("company_id", companyId)
        .eq("numero", numero)
        .eq("direcao", "saida")
        .gte("created_at", tenMinutesAgo)
        .limit(6),
    ]);

    for (const result of [instanceResult, inboundResult, recentOutboundResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const inst = instanceResult.data;
    if (!inst?.instance_name || inst.status !== "connected") {
      throw new Error("WhatsApp não conectado.");
    }
    if (!inboundResult.data?.length) {
      throw new Error(
        "A pesquisa só pode ser enviada para quem conversou com a empresa nas últimas 24 horas.",
      );
    }
    if ((recentOutboundResult.data?.length ?? 0) >= 6) {
      throw new Error("Envio pausado por alguns minutos para proteger a qualidade do número.");
    }
    const {
      assertWithinLimit,
      markMessageQuotaAttempt,
      persistOutboundMessagesAndFinalizeQuota,
      reserveMessageQuota,
      settleMessageQuota,
    } = await import("./plan-limits.server");
    await assertWithinLimit(companyId, "mensagens");
    const quotaRef = `csat:${crypto.randomUUID()}`;
    if (!(await reserveMessageQuota(companyId, quotaRef, 1))) {
      throw new Error("O limite mensal de mensagens do plano foi atingido.");
    }

    const { data: reservedSurvey, error } = await admin.rpc("reserve_csat_send", {
      _company_id: companyId,
      _number: numero,
      _contact_name: data.contatoNome as string,
      _sent_by: userId,
    });
    if (error) {
      try {
        await settleMessageQuota(companyId, quotaRef, 0);
      } catch (quotaError) {
        console.error("[csat.quota.release]", quotaError);
      }
      throw new Error(error.message);
    }
    const row = reservedSurvey as { id?: string; token?: string } | null;
    if (!row?.id || !row.token) {
      try {
        await settleMessageQuota(companyId, quotaRef, 0);
      } catch (quotaError) {
        console.error("[csat.quota.release]", quotaError);
      }
      throw new Error("Falha ao registrar CSAT.");
    }

    const link = `${appOrigin()}/csat/${row.token}`;
    const texto = `Olá! Como foi nosso atendimento? Avalie em 1 minuto: ${link}`;
    let deliveryAttempted = false;
    try {
      const { evoSendText } = await import("./evolution.server");
      await markMessageQuotaAttempt(companyId, quotaRef, 1);
      deliveryAttempted = true;
      await evoSendText(inst.instance_name, numero, texto);
    } catch (error: any) {
      if (!deliveryAttempted) {
        await admin.from("csat_response").delete().eq("id", row.id);
        try {
          await settleMessageQuota(companyId, quotaRef, 0);
        } catch (quotaError) {
          console.error("[csat.quota.release]", quotaError);
        }
      } else {
        // A entrega pode ter sido aceita antes de a resposta do provedor se
        // perder. Preserve o token e o bloqueio de 24 h para que um link já
        // recebido continue válido e não seja reenviado em duplicidade.
        try {
          await persistOutboundMessagesAndFinalizeQuota({
            companyId,
            ref: quotaRef,
            userId,
            number: numero,
            contactName: data.contatoNome,
            author: "humano",
            messages: [],
            uncertainCount: 1,
          });
        } catch (quotaError) {
          console.error("[csat.quota.uncertain]", quotaError);
        }
      }
      throw new Error(`Falha ao enviar a pesquisa: ${error?.message ?? error}`);
    }

    let persistenceWarning: string | null = null;
    try {
      await persistOutboundMessagesAndFinalizeQuota({
        companyId,
        ref: quotaRef,
        userId,
        number: numero,
        contactName: data.contatoNome,
        author: "humano",
        messages: [texto],
      });
    } catch (messageError: any) {
      persistenceWarning = messageError?.message ?? String(messageError);
      console.error("[csat persistence]", persistenceWarning);
    }
    return { ok: true, token: row.token, warning: persistenceWarning };
  });

export const submitCsat = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; score: number; comentario?: string }) => ({
    token: String(d?.token || "")
      .trim()
      .toLowerCase(),
    score: Number(d?.score),
    comentario: d?.comentario ? String(d.comentario).trim().slice(0, 1000) : null,
  }))
  .handler(async ({ data }) => {
    if (!/^[a-f0-9]{32}$/.test(data.token) || !Number.isInteger(data.score)) {
      throw new Error("Dados inválidos.");
    }
    if (data.score < 1 || data.score > 5) throw new Error("Dados inválidos.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("csat_response")
      .update({
        score: data.score,
        comentario: data.comentario,
        respondido_em: new Date().toISOString(),
      })
      .eq("token", data.token)
      .is("respondido_em", null)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Pesquisa não encontrada ou já respondida.");
    return { ok: true };
  });

export const getCsatByToken = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => ({
    token: String(d?.token || "")
      .trim()
      .toLowerCase(),
  }))
  .handler(async ({ data }) => {
    if (!/^[a-f0-9]{32}$/.test(data.token)) return { found: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await (supabaseAdmin as any)
      .from("csat_response")
      .select("token, respondido_em, company_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return { found: false as const };
    const { data: comp } = await (supabaseAdmin as any)
      .from("company")
      .select("nome, primary_color")
      .eq("id", row.company_id)
      .maybeSingle();
    return {
      found: true as const,
      respondido: !!row.respondido_em,
      empresa: comp?.nome ?? "",
      primaryColor: comp?.primary_color ?? "#22C55E",
    };
  });
