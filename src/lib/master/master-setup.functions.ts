/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { describeIntegration } from "@/lib/common/integration-secrets.server";
import {
  isRecent,
  setupProgress,
  setupStatus,
  timeAgo,
  type SetupGroup,
  type SetupStatus,
} from "@/lib/master/master-setup-rules";

async function assertSuperAdmin(supabase: any) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error || data !== true) throw new Error("Acesso restrito ao proprietário da instalação.");
}

export type MasterSetupCheck = {
  id:
    | "access"
    | "plans"
    | "trial"
    | "payments"
    | "infinitepay"
    | "free_plan"
    | "support"
    | "meta_template"
    | "subscriber_messages"
    | "ai_credits"
    | "push"
    | "notices"
    | "monthly_report"
    | "deletions"
    | "first_company";
  group: SetupGroup;
  status: SetupStatus;
  title: string;
  description: string;
  ready: boolean;
  optional: boolean;
  detail: string;
  to: string;
  action: string;
};

export const getMasterSetupProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const [plansResult, companiesResult, configResult, stripe, evolution, meta] = await Promise.all(
      [
        db
          .from("plan")
          .select(
            "id,nome,ativo,trial_days,creditos_trial,checkout_mode,checkout_url,stripe_price_id,is_free,free_days,preco_cents",
          )
          .eq("ativo", true),
        db.from("company").select("id", { count: "exact", head: true }),
        db.from("app_config").select("super_admin_emails").eq("id", true).maybeSingle(),
        describeIntegration("stripe"),
        describeIntegration("evolution"),
        describeIntegration("whatsapp_meta"),
      ],
    );

    const plans = plansResult.data ?? [];
    const activePlans = plans.length;
    const trialReady =
      activePlans > 0 &&
      plans.every(
        (plan: any) => Number(plan.trial_days ?? 0) === 0 || Number(plan.creditos_trial ?? 0) > 0,
      );
    const plansWithCheckout = plans.filter((plan: any) => {
      if (plan.checkout_mode === "stripe") {
        return stripe.testOk === true && String(plan.stripe_price_id || "").startsWith("price_");
      }
      return /^https?:\/\//i.test(String(plan.checkout_url || ""));
    }).length;
    const paymentPlans = plans.map((plan: any) => {
      const stripeMode = plan.checkout_mode === "stripe";
      const ready = stripeMode
        ? stripe.testOk === true && String(plan.stripe_price_id || "").startsWith("price_")
        : /^https?:\/\//i.test(String(plan.checkout_url || ""));
      return {
        id: String(plan.id),
        name: String(plan.nome || "Plano"),
        mode: stripeMode ? ("stripe" as const) : ("external" as const),
        ready,
        detail: stripeMode
          ? stripe.testOk !== true
            ? "Teste o Stripe antes de vender"
            : plan.stripe_price_id
              ? "Preço recorrente vinculado"
              : "Falta escolher o preço do Stripe"
          : plan.checkout_url
            ? "Link externo informado"
            : "Falta informar o link de checkout",
      };
    });
    const paymentsReady = activePlans > 0 && plansWithCheckout === activePlans;
    const ownerEmails = (configResult.data?.super_admin_emails ?? []).filter(Boolean);

    let supportChannel: any = null;
    let supportSchemaReady = true;
    try {
      const result = await db
        .from("platform_support_channel")
        .select("provider,active_provider,status,instance_name,phone_e164,last_error,meta_template_status")
        .eq("id", true)
        .maybeSingle();
      if (result.error) throw result.error;
      supportChannel = result.data;
    } catch {
      supportSchemaReady = false;
    }
    const { isActiveChannelConnected } = await import("@/lib/whatsapp/purchase-onboarding-rules");
    const supportReady = supportSchemaReady && isActiveChannelConnected(supportChannel);
    const metaActive = supportChannel?.active_provider === "meta";
    const templateReady =
      !metaActive || String(supportChannel?.meta_template_status || "").toUpperCase() === "APPROVED";
    const companyCount = companiesResult.count ?? 0;

    const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch {
        return fallback;
      }
    };
    const [infinitepay, lastPayment, aiConfig, pushDevices, lastNotice, lastReport, pendingDeletions, lastSubscriberMessage] =
      await Promise.all([
        safe(() => describeIntegration("infinitepay"), { configured: false } as { configured: boolean }),
        safe(async () => {
          const { data } = await db
            .from("billing_event_log")
            .select("created_at,error,processed")
            .eq("provider", "infinitepay")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return data as { created_at: string; error: string | null } | null;
        }, null),
        safe(async () => {
          const { data } = await db.from("ai_provider_config").select("*").limit(1).maybeSingle();
          return data as any;
        }, null),
        safe(async () => {
          const { count } = await db
            .from("marcia_push_subscription")
            .select("id", { count: "exact", head: true })
            .eq("active", true);
          return count ?? 0;
        }, 0),
        safe(async () => {
          const { data } = await db
            .from("marcia_notification")
            .select("created_at")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return (data?.created_at as string | undefined) ?? null;
        }, null),
        safe(async () => {
          const { data } = await db
            .from("marcia_notification")
            .select("created_at")
            .eq("type", "system.monthly_report")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return (data?.created_at as string | undefined) ?? null;
        }, null),
        safe(async () => {
          const { count } = await db
            .from("account_deletion_request")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending");
          return count ?? 0;
        }, 0),
        safe(async () => {
          const { data } = await db
            .from("fin_whatsapp_identity")
            .select("last_used_at")
            .not("last_used_at", "is", null)
            .order("last_used_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return (data?.last_used_at as string | undefined) ?? null;
        }, null),
      ]);
    const freePlans = plans.filter((p: any) => p.is_free);
    const usesInfinitePay = plans.some(
      (p: any) => !p.is_free && p.checkout_mode !== "stripe" && /infinitepay/i.test(String(p.checkout_url || "")),
    );
    const aiMode = String(aiConfig?.mode || "lovable");
    const vapidReady = Boolean(
      (process.env.VAPID_PUBLIC_KEY || "").trim() && (process.env.VAPID_PRIVATE_KEY || "").trim(),
    );

    const raw: Omit<MasterSetupCheck, "group" | "status">[] = [
      {
        id: "access",
        title: "Proteja o acesso de proprietário",
        description: "Confirme quem pode entrar pelo /superadmin.",
        ready: ownerEmails.length > 0,
        optional: false,
        detail: ownerEmails.length
          ? `${ownerEmails.length} proprietário(s) autorizado(s)`
          : "Nenhum e-mail de proprietário confirmado",
        to: "/master/configuracoes",
        action: "Revisar acesso",
      },
      {
        id: "plans",
        title: "Monte sua oferta",
        description: "Crie ao menos um plano ativo com preço e limites claros.",
        ready: activePlans > 0,
        optional: false,
        detail: activePlans ? `${activePlans} plano(s) ativo(s)` : "Nenhum plano ativo",
        to: "/master/planos",
        action: activePlans ? "Revisar planos" : "Criar plano",
      },
      {
        id: "trial",
        title: "Defina trial e créditos",
        description: "Se houver teste grátis, informe dias e créditos de IA.",
        ready: trialReady,
        optional: false,
        detail: trialReady ? "Regras de teste coerentes" : "Há plano com trial sem créditos",
        to: "/master/planos",
        action: "Configurar trial",
      },
      {
        id: "payments",
        title: "Faça uma venda sair do outro lado",
        description: "Cada plano precisa ter Stripe testado ou um link externo válido.",
        ready: paymentsReady,
        optional: false,
        detail: `${plansWithCheckout} de ${activePlans} plano(s) prontos para cobrar`,
        to: "/master/pagamentos",
        action: "Preparar pagamentos",
      },
      {
        id: "support",
        title: "Escolha e ative o canal central",
        description: "Um único canal por vez: QR Code (Evolution) ou API oficial da Meta.",
        ready: supportReady,
        optional: false,
        detail: !supportSchemaReady
          ? "Estrutura do atendimento ainda não instalada"
          : supportReady
            ? `${supportChannel.phone_e164 || "Número"} ativo via ${supportChannel.active_provider === "meta" ? "Meta" : "QR Code"}`
            : `Aguardando conexão · Evolution ${evolution.configured ? "configurada" : "pendente"} · Meta ${meta.configured ? "configurada" : "pendente"}`,
        to: supportChannel?.provider === "meta" ? "/master/whatsapp-meta" : "/master/whatsapp-qr",
        action: "Configurar canal central",
      },
      {
        id: "meta_template",
        title: "Template de compra aprovada (só Meta)",
        description: "Na Meta, a primeira mensagem pós-compra precisa de um template aprovado.",
        ready: templateReady,
        optional: !metaActive,
        detail: !metaActive
          ? "Não necessário com o QR Code"
          : templateReady
            ? `Template ${supportChannel?.meta_template_name} aprovado`
            : "Template ausente ou aguardando aprovação",
        to: "/master/whatsapp-meta",
        action: "Configurar template",
      },
      {
        id: "infinitepay",
        title: "InfinitePay recebendo pagamentos",
        description: "Tag, chave e links salvos; o webhook confirma cada pagamento.",
        ready: infinitepay.configured,
        optional: !usesInfinitePay,
        detail: !infinitepay.configured
          ? "Faltam dados da InfinitePay"
          : lastPayment
            ? `Último aviso de pagamento ${timeAgo(lastPayment.created_at)}${lastPayment.error ? ` · erro: ${lastPayment.error}` : ""}`
            : "Configurada · nenhum pagamento recebido ainda",
        to: "/master/pagamentos",
        action: "Abrir pagamentos",
      },
      {
        id: "free_plan",
        title: "Plano gratuito ou trial",
        description: "Opcional: um plano grátis com limite de dias para atrair novos assinantes.",
        ready: freePlans.length > 0,
        optional: true,
        detail: freePlans.length
          ? `${freePlans.map((p: any) => `${p.nome} (${p.free_days ?? 0} dias)`).join(", ")}`
          : "Nenhum plano gratuito ativo",
        to: "/master/planos",
        action: "Configurar plano",
      },
      {
        id: "subscriber_messages",
        title: "Assinantes falando com a MIA",
        description: "Mostra se algum número vinculado já mandou mensagem pelo WhatsApp.",
        ready: Boolean(lastSubscriberMessage),
        optional: true,
        detail: lastSubscriberMessage
          ? `Última mensagem recebida ${timeAgo(lastSubscriberMessage)}`
          : "Nenhuma mensagem de assinante ainda",
        to: "/master/conversas",
        action: "Ver conversas",
      },
      {
        id: "ai_credits",
        title: "MIA respondendo (IA testada)",
        description: "Provedor de IA escolhido e teste do modelo feito com sucesso.",
        ready: aiMode === "lovable" ? aiConfig?.test_ok !== false : aiConfig?.test_ok === true,
        optional: aiMode === "lovable",
        detail:
          aiMode === "lovable"
            ? `Lovable AI${aiConfig?.model ? ` · ${aiConfig.model}` : ""}${aiConfig?.tested_at ? ` · testado ${timeAgo(aiConfig.tested_at)}` : ""}`
            : aiConfig?.test_ok
              ? `${aiMode === "openai" ? "OpenAI" : "Anthropic"} · ${aiConfig.model} · testado ${timeAgo(aiConfig.tested_at)}`
              : `${aiMode === "openai" ? "OpenAI" : "Anthropic"} sem teste aprovado${aiConfig?.last_error ? ` · ${aiConfig.last_error}` : ""}`,
        to: "/master/ia-creditos",
        action: "Testar IA",
      },
      {
        id: "push",
        title: "Notificações no navegador",
        description: "Chaves VAPID configuradas para enviar avisos aos aparelhos.",
        ready: vapidReady,
        optional: false,
        detail: vapidReady
          ? `${pushDevices} aparelho(s) ativo(s)`
          : "Chaves VAPID ausentes no servidor",
        to: "/master/painel",
        action: "Ver painel",
      },
      {
        id: "notices",
        title: "Avisos automáticos rodando",
        description: "Contas a vencer, orçamento e resumos gerados nas últimas 48 horas.",
        ready: companyCount === 0 || isRecent(lastNotice, 48),
        optional: companyCount === 0,
        detail: lastNotice ? `Último aviso gerado ${timeAgo(lastNotice)}` : "Nenhum aviso gerado ainda",
        to: "/master/painel",
        action: "Ver painel",
      },
      {
        id: "monthly_report",
        title: "Relatório mensal em PDF",
        description: "Enviado automaticamente no dia 1 para quem ativou.",
        ready: Boolean(lastReport),
        optional: true,
        detail: lastReport
          ? `Último relatório ${timeAgo(lastReport)}`
          : "Ainda não enviado (primeiro envio no dia 1)",
        to: "/master/painel",
        action: "Ver painel",
      },
      {
        id: "deletions",
        title: "Pedidos de exclusão de conta",
        description: "Pedidos de assinantes aguardando sua decisão.",
        ready: pendingDeletions === 0,
        optional: true,
        detail: pendingDeletions
          ? `${pendingDeletions} pedido(s) aguardando`
          : "Nenhum pedido pendente",
        to: "/master/assinantes",
        action: "Revisar pedidos",
      },
      {
        id: "first_company",
        title: "Cadastre um assinante de teste",
        description: "Valide cadastro, login, plano e primeira experiência antes de vender.",
        ready: companyCount > 0,
        optional: false,
        detail: companyCount
          ? `${companyCount} assinante(s) cadastrado(s)`
          : "Nenhum assinante cadastrado",
        to: "/master/novo-assinante",
        action: "Criar assinante de teste",
      },
    ];

    const GROUP_OF: Record<MasterSetupCheck["id"], SetupGroup> = {
      plans: "vender",
      trial: "vender",
      payments: "vender",
      infinitepay: "vender",
      free_plan: "vender",
      support: "atender",
      meta_template: "atender",
      subscriber_messages: "atender",
      ai_credits: "atender",
      push: "avisar",
      notices: "avisar",
      monthly_report: "avisar",
      access: "operar",
      deletions: "operar",
      first_company: "operar",
    };
    const checks: MasterSetupCheck[] = raw.map((c) => ({
      ...c,
      group: GROUP_OF[c.id],
      status: setupStatus(c.ready, c.optional),
    }));
    const progress = setupProgress(checks);
    return {
      ...progress,
      checkedAt: new Date().toISOString(),
      checks,
      counts: {
        companies: companyCount,
        plans: activePlans,
        plansWithCheckout,
      },
      paymentPlans,
    };
  });
