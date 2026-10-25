/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { describeIntegration } from "./integration-secrets.server";

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
    | "support"
    | "meta_template"
    | "ai_credits"
    | "first_company";
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
            "id,nome,ativo,trial_days,creditos_trial,checkout_mode,checkout_url,stripe_price_id",
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
    const { isActiveChannelConnected } = await import("./purchase-onboarding-rules");
    const supportReady = supportSchemaReady && isActiveChannelConnected(supportChannel);
    const metaActive = supportChannel?.active_provider === "meta";
    const templateReady =
      !metaActive || String(supportChannel?.meta_template_status || "").toUpperCase() === "APPROVED";
    const companyCount = companiesResult.count ?? 0;

    const checks: MasterSetupCheck[] = [
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
        id: "ai_credits",
        title: "Revise IA e créditos",
        description: "Entenda créditos dos assinantes, seu custo de IA e o provedor ativo.",
        ready: true,
        optional: true,
        detail: "Lovable AI gerenciada é o padrão recomendado",
        to: "/master/ia-creditos",
        action: "Abrir IA e créditos",
      },
      {
        id: "first_company",
        title: "Cadastre um assinante de teste",
        description: "Valide cadastro, login, plano e primeira experiência antes de vender.",
        ready: companyCount > 0,
        optional: false,
        detail: companyCount
          ? `${companyCount} assinante(s) cadastrada(s)`
          : "Nenhum assinante cadastrada",
        to: "/master/novo-assinante",
        action: "Criar assinante de teste",
      },
    ];

    const completed = checks.filter((check) => check.ready).length;
    const total = checks.length;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100),
      readyToLaunch: completed === total,
      checks,
      counts: {
        companies: companyCount,
        plans: activePlans,
        plansWithCheckout,
      },
      paymentPlans,
    };
  });
