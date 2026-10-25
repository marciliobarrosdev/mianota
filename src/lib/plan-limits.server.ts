// SERVER ONLY. Usa supabaseAdmin para resolver plano + uso, sem expor chave.
import {
  featuresFor,
  PLAN_LABEL,
  normalizePlanSlug,
  type PlanFeatures,
  type PlanSlug,
} from "./plan-features";

export type LimitKind = "instancias" | "usuarios" | "contatos" | "mensagens";

export type CompanyPlan = {
  slug: PlanSlug;
  nome: string;
  limites: {
    instancias: number;
    usuarios: number;
    contatos: number;
    mensagens: number;
  };
};

export type CompanyUsage = {
  instancias: number;
  usuarios: number;
  contatos: number;
  mensagens: number; // mês corrente
};

export async function assertCompanyOperational(
  companyId: string,
  options: { superAdminBypass?: boolean } = {},
): Promise<void> {
  if (options.superAdminBypass) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: company, error } = await supabaseAdmin
    .from("company")
    .select("status_cobranca,trial_ate")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!company) throw new Error("Empresa não encontrada.");

  const trialValid =
    company.status_cobranca === "trial" &&
    !!company.trial_ate &&
    new Date(company.trial_ate).getTime() > Date.now();
  if (company.status_cobranca !== "ativo" && !trialValid) {
    throw new Error("A operação desta empresa está bloqueada. Regularize o plano para continuar.");
  }
}

export async function reserveMessageQuota(
  companyId: string,
  ref: string,
  quantity = 1,
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("reserve_message_quota", {
    _company_id: companyId,
    _ref: ref,
    _quantity: quantity,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function markMessageQuotaAttempt(
  companyId: string,
  ref: string,
  attemptedCount: number,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("mark_message_quota_attempt", {
    _company_id: companyId,
    _ref: ref,
    _attempted_count: attemptedCount,
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Reserva de mensagens não está ativa.");
}

export async function settleMessageQuota(
  companyId: string,
  ref: string,
  sentCount: number,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("settle_message_quota", {
    _company_id: companyId,
    _ref: ref,
    _sent_count: sentCount,
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Reserva de mensagens não encontrada.");
}

export async function persistOutboundMessagesAndFinalizeQuota(input: {
  companyId: string;
  ref: string;
  userId: string;
  number: string;
  contactName?: string | null;
  author: "ia" | "humano";
  messages: string[];
  uncertainCount?: number;
}): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const args = {
    _company_id: input.companyId,
    _ref: input.ref,
    _user_id: input.userId,
    _number: input.number,
    _contact_name: (input.contactName ?? null) as string,
    _author: input.author,
    _messages: input.messages,
    _uncertain_count: input.uncertainCount ?? 0,
  };

  // The SQL function is idempotent. One retry reconciles the case where the
  // transaction committed but the first HTTP response was lost.
  let result = await supabaseAdmin.rpc("persist_outbound_messages_and_finalize_quota", args);
  if (result.error) {
    result = await supabaseAdmin.rpc("persist_outbound_messages_and_finalize_quota", args);
  }
  if (result.error) throw new Error(result.error.message);
  const persisted = Number(result.data);
  if (!Number.isInteger(persisted) || persisted !== input.messages.length) {
    throw new Error("A persistência da mensagem não pôde ser reconciliada.");
  }
  return persisted;
}

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export async function getCompanyPlan(companyId: string): Promise<CompanyPlan> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1) Assinatura ativa/trialing → plano vinculado
  const { data: sub } = await supabaseAdmin
    .from("subscription")
    .select(
      "plan_id, status, plan:plan(slug, nome, limite_instancias, limite_mensagens, limite_usuarios, limite_contatos)",
    )
    .eq("company_id", companyId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let row: any = sub?.plan ?? null;

  // 2) Compatibilidade com empresas criadas antes da assinatura trial passar
  // a ser registrada: respeita o plano escolhido enquanto o trial estiver válido.
  if (!row) {
    const { data: company } = await supabaseAdmin
      .from("company")
      .select("selected_plan_slug, status_cobranca, trial_ate")
      .eq("id", companyId)
      .maybeSingle();
    const trialValid =
      company?.status_cobranca === "trial" &&
      !!company?.trial_ate &&
      new Date(company.trial_ate).getTime() > Date.now();
    if (trialValid && company?.selected_plan_slug) {
      const { data: selected } = await supabaseAdmin
        .from("plan")
        .select("slug, nome, limite_instancias, limite_mensagens, limite_usuarios, limite_contatos")
        .eq("slug", company.selected_plan_slug)
        .eq("ativo", true)
        .maybeSingle();
      row = selected;
    }
  }

  // 3) Fallback final: plano starter ativo
  if (!row) {
    const { data: fallback } = await supabaseAdmin
      .from("plan")
      .select("slug, nome, limite_instancias, limite_mensagens, limite_usuarios, limite_contatos")
      .eq("slug", "starter")
      .maybeSingle();
    row = fallback;
  }

  const slug = normalizePlanSlug(row?.slug);
  return {
    slug,
    nome: row?.nome || PLAN_LABEL[slug],
    limites: {
      instancias: Number(row?.limite_instancias ?? 1),
      usuarios: Number(row?.limite_usuarios ?? 1),
      contatos: Number(row?.limite_contatos ?? 1000),
      mensagens: Number(row?.limite_mensagens ?? 1500),
    },
  };
}

export async function getCompanyUsage(companyId: string): Promise<CompanyUsage> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const monthStart = startOfMonthISO();

  const [inst, users, contatos, msgs] = await Promise.all([
    supabaseAdmin
      .from("whatsapp_instances")
      .select("instance_name", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabaseAdmin
      .from("company_user")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("ativo", true),
    supabaseAdmin
      .from("marcia_customer")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabaseAdmin
      .from("mensagens")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("direcao", "saida")
      .gte("created_at", monthStart),
  ]);

  return {
    instancias: inst.count ?? 0,
    usuarios: users.count ?? 0,
    contatos: contatos.count ?? 0,
    mensagens: msgs.count ?? 0,
  };
}

export async function getCompanyPlanUsage(
  companyId: string,
): Promise<{ plan: CompanyPlan; usage: CompanyUsage }> {
  const [plan, usage] = await Promise.all([getCompanyPlan(companyId), getCompanyUsage(companyId)]);
  return { plan, usage };
}

export async function companyHasPlanFeature(
  companyId: string,
  feature: keyof PlanFeatures,
): Promise<boolean> {
  try {
    await assertCompanyOperational(companyId);
  } catch {
    return false;
  }
  const plan = await getCompanyPlan(companyId);
  return featuresFor(plan.slug)[feature];
}

export async function assertCompanyPlanFeature(
  companyId: string,
  feature: keyof PlanFeatures,
  message = "Este recurso não está disponível no plano atual.",
): Promise<void> {
  if (!(await companyHasPlanFeature(companyId, feature))) {
    throw new Error(message);
  }
}

const LIMIT_MSG: Record<LimitKind, (planName: string, lim: number) => string> = {
  instancias: (p, n) =>
    `Seu plano ${p} permite até ${n} número${n === 1 ? "" : "s"} de WhatsApp. Faça upgrade para conectar mais.`,
  usuarios: (p, n) =>
    `Seu plano ${p} permite até ${n} usuário${n === 1 ? "" : "s"} na equipe. Faça upgrade para adicionar mais.`,
  contatos: (p, n) =>
    `Seu plano ${p} permite até ${n.toLocaleString("pt-BR")} contatos. Faça upgrade para cadastrar mais.`,
  mensagens: (p, n) =>
    `Seu plano ${p} permite até ${n.toLocaleString("pt-BR")} mensagens enviadas por mês. Faça upgrade para continuar respondendo.`,
};

export async function assertWithinLimit(
  companyId: string,
  tipo: LimitKind,
  delta = 1,
): Promise<void> {
  await assertCompanyOperational(companyId);
  const [plan, usage] = await Promise.all([getCompanyPlan(companyId), getCompanyUsage(companyId)]);
  const limite = plan.limites[tipo];
  const atual = usage[tipo];
  if (atual + delta > limite) {
    throw new Error(LIMIT_MSG[tipo](plan.nome, limite));
  }
}

// Sem disparar erro — útil em hot paths (webhook IA) que só pulam a ação.
export async function isWithinLimit(
  companyId: string,
  tipo: LimitKind,
  delta = 1,
): Promise<boolean> {
  try {
    await assertCompanyOperational(companyId);
  } catch {
    return false;
  }
  const [plan, usage] = await Promise.all([getCompanyPlan(companyId), getCompanyUsage(companyId)]);
  return usage[tipo] + delta <= plan.limites[tipo];
}
