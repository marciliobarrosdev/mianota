import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IntegrationStage = "unavailable" | "configured" | "connected" | "tested";
export type SetupOwner = "aluno" | "tecnico" | "sistema";

export type IntegrationDiagnostic = {
  key: "whatsapp" | "google" | "ai" | "webhook" | "push";
  label: string;
  stage: IntegrationStage;
  owner: SetupOwner;
  summary: string;
  nextStep: string;
  actionRoute: "/app/conexao" | "/app/integracoes" | "/app/agente" | "/app/notificacoes" | null;
  checkedAt: string;
};

export type IntegrationReadiness = {
  companyId: string;
  checkedAt: string;
  testedCount: number;
  readyForRealTest: boolean;
  diagnostics: IntegrationDiagnostic[];
};

function validateCompanyScope(input: { companyId?: string; pushBrowserConfigured?: boolean }) {
  const companyId = String(input?.companyId || "").trim();
  if (!companyId) throw new Error("Empresa não informada.");
  return { companyId, pushBrowserConfigured: input?.pushBrowserConfigured === true };
}

function envPresent(name: string) {
  return Boolean(String(process.env[name] || "").trim());
}

function latestAt(...values: Array<string | null | undefined>) {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null
  );
}

function happenedAfter(evidence: string | null | undefined, baseline: string | null | undefined) {
  if (!evidence) return false;
  if (!baseline) return true;
  return new Date(evidence).getTime() >= new Date(baseline).getTime();
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Tempo de verificação esgotado.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export const getIntegrationReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateCompanyScope)
  .handler(async ({ context, data }): Promise<IntegrationReadiness> => {
    const { companyId } = await (
      await import("./company-admin-access.server")
    ).requireCompanyAdminAccess(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequest } = await import("@tanstack/react-start/server");

    const checkedAt = new Date().toISOString();
    let publicHttps = false;
    try {
      const requestUrl = new URL(getRequest().url);
      publicHttps =
        requestUrl.protocol === "https:" &&
        !["localhost", "127.0.0.1", "0.0.0.0"].includes(requestUrl.hostname);
    } catch {
      publicHttps = false;
    }

    const { describeIntegration } = await import("./integration-secrets.server");
    const evolutionConfigured = (await describeIntegration("evolution")).configured;
    // O state OAuth é um nonce aleatório de uso único, persistido somente
    // como hash no banco. Não existe um terceiro Secret de OAuth para configurar.
    const googleConfigured = (await describeIntegration("google")).configured;
    const aiConfigured = envPresent("LOVABLE_API_KEY");
    // VITE_* is embedded in the browser build and may not exist in the
    // request-time environment. The client sends only this boolean; the key
    // itself never crosses this diagnostic endpoint.
    const pushBrowserConfigured = data.pushBrowserConfigured || envPresent("VITE_VAPID_PUBLIC_KEY");

    const [
      whatsappResult,
      googleResult,
      agentResult,
      conversationResult,
      googleSyncResult,
      pushSubscriptionResult,
      pushDeliveryResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("whatsapp_instances")
        .select("instance_name,webhook_configured_at,updated_at")
        .eq("company_id", companyId)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("google_integration")
        .select("conectado,updated_at")
        .eq("company_id", companyId)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("agent_config")
        .select("company_id,updated_at")
        .eq("company_id", companyId)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("mensagens")
        .select("numero,direcao,autor,created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("marcia_sync_record")
        .select("last_synced_at,updated_at")
        .eq("company_id", companyId)
        .eq("provider", "google_calendar")
        .eq("status", "synced")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("marcia_push_subscription")
        .select("last_seen_at,updated_at")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("marcia_sync_record")
        .select("last_synced_at,updated_at")
        .eq("company_id", companyId)
        .eq("provider", "push")
        .eq("status", "synced")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const whatsapp = whatsappResult.error ? null : whatsappResult.data;
    const google = googleResult.error ? null : googleResult.data;
    const agent = agentResult.error ? null : agentResult.data;
    const messages = conversationResult.error ? [] : conversationResult.data || [];
    const inbound = messages.find(
      (message) => message.direcao === "entrada" && message.autor === "contato",
    );
    const aiReply = messages.find(
      (message) => message.direcao === "saida" && message.autor === "ia",
    );
    const correlatedExchange = messages
      .filter((message) => message.direcao === "saida" && message.autor === "ia")
      .map((reply) => {
        const replyAt = new Date(reply.created_at).getTime();
        const matchingInbound = messages.find((message) => {
          if (
            message.numero !== reply.numero ||
            message.direcao !== "entrada" ||
            message.autor !== "contato"
          ) {
            return false;
          }
          const inboundAt = new Date(message.created_at).getTime();
          const responseDelay = replyAt - inboundAt;
          return responseDelay >= 0 && responseDelay <= 30 * 60_000;
        });
        return matchingInbound
          ? { inboundAt: matchingInbound.created_at, replyAt: reply.created_at }
          : null;
      })
      .find((exchange) => exchange !== null);
    const googleSync = googleSyncResult.error ? null : googleSyncResult.data;
    const pushSubscription = pushSubscriptionResult.error ? null : pushSubscriptionResult.data;
    const pushDelivery = pushDeliveryResult.error ? null : pushDeliveryResult.data;
    const whatsappReadable = !whatsappResult.error && !conversationResult.error;
    const googleReadable = !googleResult.error && !googleSyncResult.error;
    const aiReadable = !agentResult.error && !conversationResult.error;
    const webhookReadable = !whatsappResult.error && !conversationResult.error;
    const pushReadable = !pushSubscriptionResult.error && !pushDeliveryResult.error;

    let evolutionLiveChecked = false;
    let evolutionLiveConnected = false;
    if (evolutionConfigured && whatsappReadable && whatsapp?.instance_name) {
      try {
        const { evoState } = await import("./evolution.server");
        const live = await withTimeout(evoState(whatsapp.instance_name), 7_000);
        const state = String(live?.instance?.state || live?.state || "").toLowerCase();
        evolutionLiveChecked = true;
        evolutionLiveConnected = state === "open";
      } catch {
        evolutionLiveChecked = false;
        evolutionLiveConnected = false;
      }
    }

    const webhookRegistered = Boolean(whatsapp?.webhook_configured_at);
    const inboundAfterWebhook = happenedAfter(inbound?.created_at, whatsapp?.webhook_configured_at);
    const correlatedAfterWebhook =
      happenedAfter(correlatedExchange?.inboundAt, whatsapp?.webhook_configured_at) &&
      happenedAfter(correlatedExchange?.replyAt, whatsapp?.webhook_configured_at);
    const correlatedAfterAiConfig = happenedAfter(correlatedExchange?.replyAt, agent?.updated_at);
    const partialConversationEvidence = Boolean(inbound && aiReply && !correlatedExchange);
    const googleSyncAfterConnection = happenedAfter(
      googleSync?.last_synced_at || googleSync?.updated_at,
      google?.updated_at,
    );
    const pushDeliveryAfterSubscription = happenedAfter(
      pushDelivery?.last_synced_at || pushDelivery?.updated_at,
      pushSubscription?.updated_at,
    );
    const evolutionNeedsTechnicalCheck = Boolean(whatsapp?.instance_name) && !evolutionLiveChecked;

    let whatsappStage: IntegrationStage = "unavailable";
    if (evolutionConfigured && whatsappReadable) whatsappStage = "configured";
    if (evolutionConfigured && evolutionLiveConnected && webhookRegistered) {
      whatsappStage = "connected";
    }
    if (
      evolutionConfigured &&
      evolutionLiveConnected &&
      webhookRegistered &&
      correlatedAfterWebhook
    ) {
      whatsappStage = "tested";
    }

    let googleStage: IntegrationStage = "unavailable";
    if (googleConfigured && googleReadable) googleStage = "configured";
    if (googleConfigured && google?.conectado) googleStage = "connected";
    if (googleConfigured && google?.conectado && googleSyncAfterConnection) googleStage = "tested";

    let aiStage: IntegrationStage = "unavailable";
    if (aiConfigured && aiReadable) aiStage = "configured";
    if (aiConfigured && agent) aiStage = "connected";
    if (aiConfigured && agent && correlatedAfterAiConfig) aiStage = "tested";

    let webhookStage: IntegrationStage = "unavailable";
    if (publicHttps && webhookReadable) webhookStage = "configured";
    if (publicHttps && webhookRegistered) webhookStage = "connected";
    if (publicHttps && webhookRegistered && inboundAfterWebhook) webhookStage = "tested";

    let pushStage: IntegrationStage = "unavailable";
    if (pushBrowserConfigured && pushReadable) pushStage = "configured";
    if (pushBrowserConfigured && pushSubscription) pushStage = "connected";
    if (pushBrowserConfigured && pushSubscription && pushDeliveryAfterSubscription) {
      pushStage = "tested";
    }

    const diagnostics: IntegrationDiagnostic[] = [
      {
        key: "whatsapp",
        label: "WhatsApp · Evolution",
        stage: whatsappStage,
        owner:
          !whatsappReadable || !evolutionConfigured || evolutionNeedsTechnicalCheck
            ? "tecnico"
            : whatsappStage === "tested"
              ? "sistema"
              : "aluno",
        summary: !whatsappReadable
          ? "A estrutura de integração ainda não pôde ser lida neste clone."
          : whatsappStage === "tested"
            ? "A Evolution confirmou o número ao vivo e a IA respondeu à mesma conversa recebida."
            : evolutionNeedsTechnicalCheck
              ? "A Evolution não respondeu à verificação ao vivo. O status salvo no banco foi ignorado."
              : evolutionLiveChecked && !evolutionLiveConnected
                ? "A Evolution respondeu, mas o número não está conectado agora."
                : whatsappStage === "connected"
                  ? partialConversationEvidence
                    ? "O número está online. Há mensagens de entrada e de IA, mas não na mesma conversa de teste."
                    : "O número está online e o webhook foi registrado; falta uma conversa completa de teste."
                  : whatsappStage === "configured"
                    ? "O servidor está pronto para gerar o QR Code."
                    : "O clone ainda não tem o servidor do WhatsApp configurado.",
        nextStep: !whatsappReadable
          ? "Técnico: publique as migrações do clone e faça a verificação novamente."
          : whatsappStage === "unavailable"
            ? "O proprietário preenche o servidor do WhatsApp em Master → Integrações."
            : evolutionNeedsTechnicalCheck
              ? "Técnico: confira se a Evolution está acessível e se a URL e a chave do projeto estão corretas."
              : evolutionLiveChecked && !evolutionLiveConnected
                ? "Aluno: abra a conexão e escaneie um novo QR Code para deixar o número online."
                : whatsappStage === "configured"
                  ? "Aluno: abra a conexão, gere o QR Code e escaneie com o número da empresa."
                  : whatsappStage === "connected"
                    ? "Aluno: de um único celular, envie ‘Quero agendar’, receba a resposta e então atualize esta tela."
                    : "Automático: o sistema continuará conferindo a conexão.",
        actionRoute: whatsappStage === "unavailable" ? null : "/app/conexao",
        checkedAt:
          latestAt(inbound?.created_at, aiReply?.created_at, whatsapp?.updated_at) || checkedAt,
      },
      {
        key: "google",
        label: "Google Agenda · OAuth",
        stage: googleStage,
        owner:
          !googleReadable || !googleConfigured
            ? "tecnico"
            : googleStage === "tested"
              ? "sistema"
              : "aluno",
        summary: !googleReadable
          ? "A estrutura do Google Agenda ainda não pôde ser lida neste clone."
          : googleStage === "tested"
            ? "Um agendamento já foi sincronizado com o calendário."
            : googleStage === "connected"
              ? "A conta Google autorizou o acesso; falta testar um agendamento."
              : googleStage === "configured"
                ? "O botão de autorização do Google está pronto para uso."
                : "O OAuth do Google ainda não foi preparado neste clone.",
        nextStep: !googleReadable
          ? "Técnico: publique as migrações do clone e faça a verificação novamente."
          : googleStage === "unavailable"
            ? "O proprietário preenche o Google Agenda em Master → Integrações e autoriza o endereço de retorno exibido lá."
            : googleStage === "configured"
              ? "Aluno: clique em Conectar Google e escolha o calendário da empresa."
              : googleStage === "connected"
                ? "Aluno: confirme um agendamento de teste e depois confira o Google Agenda."
                : "Automático: novos agendamentos confirmados serão espelhados.",
        actionRoute: googleStage === "unavailable" ? null : "/app/integracoes",
        checkedAt:
          latestAt(googleSync?.last_synced_at, googleSync?.updated_at, google?.updated_at) ||
          checkedAt,
      },
      {
        key: "ai",
        label: "IA automática do projeto",
        stage: aiStage,
        owner: aiStage === "tested" ? "sistema" : "aluno",
        summary: !aiReadable
          ? "A configuração da secretária ainda não pôde ser lida neste clone."
          : aiStage === "tested"
            ? "A IA respondeu depois de uma entrada da mesma conversa e da configuração atual."
            : aiStage === "connected"
              ? partialConversationEvidence
                ? "A personalidade foi salva. Existem mensagens, mas ainda não há entrada e resposta correlacionadas no mesmo contato."
                : "A personalidade foi salva; falta testar uma conversa do começo ao fim."
              : aiStage === "configured"
                ? "A IA gerenciada pela Lovable está disponível; falta ensinar sobre o negócio."
                : "A IA automática ainda não foi detectada nesta execução do projeto.",
        nextStep: !aiReadable
          ? "Aluno: conclua o primeiro acesso e o onboarding; depois confira novamente."
          : aiStage === "unavailable"
            ? "Aluno: não crie nem cole uma chave. Confirme que o projeto nasceu por Remix e que possui créditos de IA disponíveis."
            : aiStage === "configured"
              ? "Aluno: abra IA da secretária, preencha o negócio e salve a personalidade."
              : aiStage === "connected"
                ? "Aluno: envie uma pergunta de um contato, aguarde a resposta da IA e atualize esta tela."
                : "Automático: respostas reais continuarão servindo como prova de funcionamento.",
        actionRoute: aiStage === "unavailable" ? null : "/app/agente",
        checkedAt: latestAt(aiReply?.created_at, agent?.updated_at) || checkedAt,
      },
      {
        key: "webhook",
        label: "Publicação e recebimento",
        stage: webhookStage,
        owner:
          !webhookReadable || !publicHttps
            ? "tecnico"
            : webhookStage === "tested"
              ? "sistema"
              : "aluno",
        summary: !webhookReadable
          ? "A estrutura de recebimento ainda não pôde ser lida neste clone."
          : webhookStage === "tested"
            ? "A versão publicada já recebeu uma mensagem assinada pelo webhook."
            : webhookStage === "connected"
              ? "A Evolution recebeu a URL publicada; falta uma mensagem real chegar."
              : webhookStage === "configured"
                ? "O app está em HTTPS e pode receber retornos externos."
                : "A leitura atual não confirmou uma versão pública em HTTPS.",
        nextStep: !webhookReadable
          ? "Técnico: publique as migrações e valide a URL pública novamente."
          : webhookStage === "unavailable"
            ? "Técnico: publique o clone no Lovable e volte a esta tela pela URL pública."
            : webhookStage === "configured"
              ? "Aluno: conecte o WhatsApp; a URL correta será enviada automaticamente à Evolution."
              : webhookStage === "connected"
                ? "Aluno: envie uma mensagem de fora para validar o recebimento."
                : "Automático: o recebimento real já foi comprovado.",
        actionRoute: webhookStage === "unavailable" ? null : "/app/conexao",
        checkedAt: latestAt(inbound?.created_at, whatsapp?.webhook_configured_at) || checkedAt,
      },
      {
        key: "push",
        label: "Avisos no celular",
        stage: pushStage,
        owner:
          pushStage === "tested"
            ? "sistema"
            : pushReadable && pushBrowserConfigured
              ? "aluno"
              : "tecnico",
        summary: !pushReadable
          ? "A estrutura de avisos ainda não pôde ser lida neste clone."
          : pushStage === "tested"
            ? "Existe registro de uma entrega push concluída."
            : pushStage === "connected"
              ? "Este clone já tem aparelho cadastrado, mas a entrega ainda não foi comprovada."
              : pushStage === "configured"
                ? "O navegador pode pedir permissão para cadastrar o aparelho."
                : "A chave pública de push ainda não foi incluída no build do clone.",
        nextStep: !pushReadable
          ? "Técnico: publique as migrações de notificações e tente novamente."
          : pushStage === "unavailable"
            ? "Técnico: configure VITE_VAPID_PUBLIC_KEY no projeto. A central interna já funciona sem push."
            : pushStage === "configured"
              ? "Aluno: abra Notificações no celular e toque em Ativar neste aparelho."
              : pushStage === "connected"
                ? "Técnico: conecte o emissor push e registre a primeira entrega bem-sucedida."
                : "Automático: mantenha ao menos um aparelho ativo para receber avisos.",
        actionRoute: pushStage === "unavailable" ? null : "/app/notificacoes",
        checkedAt:
          latestAt(
            pushDelivery?.last_synced_at,
            pushDelivery?.updated_at,
            pushSubscription?.last_seen_at,
            pushSubscription?.updated_at,
          ) || checkedAt,
      },
    ];

    return {
      companyId,
      checkedAt,
      testedCount: diagnostics.filter((item) => item.stage === "tested").length,
      readyForRealTest:
        whatsappReadable &&
        googleReadable &&
        aiReadable &&
        webhookReadable &&
        evolutionConfigured &&
        googleConfigured &&
        aiConfigured &&
        publicHttps,
      diagnostics,
    };
  });
