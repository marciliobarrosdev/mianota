import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify } from "@/lib/tenant";

async function assertSuper(supabase: any, _userId: string) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error) throw new Error(`Não foi possível validar o acesso: ${error.message}`);
  if (data !== true) throw new Error("Acesso negado");
}

export const masterKpis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { from?: string; to?: string }) => {
    const today = new Date();
    const defaultTo = today.toISOString().slice(0, 10);
    const defaultFromDate = new Date(today);
    defaultFromDate.setDate(defaultFromDate.getDate() - 29);
    const defaultFrom = defaultFromDate.toISOString().slice(0, 10);
    const from = /^\d{4}-\d{2}-\d{2}$/.test(input?.from ?? "") ? input!.from! : defaultFrom;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(input?.to ?? "") ? input!.to! : defaultTo;
    if (from > to) throw new Error("A data inicial precisa ser anterior à data final.");
    return {
      from,
      to,
      fromIso: `${from}T00:00:00.000Z`,
      toIso: `${to}T23:59:59.999Z`,
    };
  })
  .handler(async ({ context, data }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [
      { data: companies, error: companiesError },
      { count: transactionCount, error: transactionError },
      { count: accountCount, error: accountError },
      { count: aiCommandCount, error: aiCommandError },
      { data: subscriptions, error: subscriptionsError },
    ] = await Promise.all([
      supabaseAdmin
        .from("company")
        .select(
          "id, nome, email_corporativo, status_cobranca, trial_ate, creditos_saldo, created_at",
        ),
      (supabaseAdmin as any)
        .from("fin_lancamento")
        .select("id", { count: "exact", head: true })
        .gte("created_at", data.fromIso)
        .lte("created_at", data.toIso),
      (supabaseAdmin as any)
        .from("fin_conta")
        .select("id", { count: "exact", head: true })
        .gte("created_at", data.fromIso)
        .lte("created_at", data.toIso),
      (supabaseAdmin as any)
        .from("marcia_ai_command")
        .select("id", { count: "exact", head: true })
        .gte("created_at", data.fromIso)
        .lte("created_at", data.toIso),
      supabaseAdmin.from("subscription").select("status, plan:plan(preco_cents)"),
    ]);
    const readError =
      companiesError || transactionError || accountError || aiCommandError || subscriptionsError;
    if (readError)
      throw new Error(`Não foi possível carregar os indicadores do sistema: ${readError.message}`);
    const now = new Date();
    const fromTime = new Date(data.fromIso).getTime();
    const toTime = new Date(data.toIso).getTime();
    const all = companies ?? [];
    const subs = subscriptions ?? [];
    const companiesInPeriod = all.filter((company: any) => {
      const createdAt = new Date(company.created_at).getTime();
      return createdAt >= fromTime && createdAt <= toTime;
    });
    const expiringLimit = new Date(now);
    expiringLimit.setDate(expiringLimit.getDate() + 7);
    const stats = {
      total: all.length,
      ativas: all.filter((c: any) => c.status_cobranca === "ativo").length,
      trial: all.filter((c: any) => c.status_cobranca === "trial").length,
      suspensas: all.filter((c: any) => c.status_cobranca === "suspenso").length,
      pendentes: all.filter((c: any) =>
        ["pendente", "checkout_pending"].includes(c.status_cobranca),
      ).length,
      novasPeriodo: companiesInPeriod.length,
      movimentacoes: transactionCount ?? 0,
      contas: accountCount ?? 0,
      comandosIa: aiCommandCount ?? 0,
      assinaturasAtivas: subs.filter((s: any) => s.status === "active").length,
      assinaturasTrial: subs.filter((s: any) => s.status === "trialing").length,
      mrr: subs
        .filter((s: any) => s.status === "active")
        .reduce((sum: number, s: any) => sum + (s.plan?.preco_cents ?? 0), 0),
      trialsVencendo: all.filter((c: any) => {
        if (c.status_cobranca !== "trial" || !c.trial_ate) return false;
        const expiresAt = new Date(c.trial_ate).getTime();
        return expiresAt >= now.getTime() && expiresAt <= expiringLimit.getTime();
      }).length,
    };

    const rangeDays = Math.max(1, Math.ceil((toTime - fromTime) / 86_400_000) + 1);
    const bucketCount = Math.min(12, rangeDays);
    const bucketSize = Math.ceil(rangeDays / bucketCount);
    const series: { label: string; total: number }[] = [];
    for (let bucket = 0; bucket < bucketCount; bucket++) {
      const bucketStart = fromTime + bucket * bucketSize * 86_400_000;
      const bucketEnd = Math.min(toTime + 1, bucketStart + bucketSize * 86_400_000);
      series.push({
        label: new Date(bucketStart).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        }),
        total: companiesInPeriod.filter((company: any) => {
          const createdAt = new Date(company.created_at).getTime();
          return createdAt >= bucketStart && createdAt < bucketEnd;
        }).length,
      });
    }

    const recentCompanies = [...all]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);

    return {
      range: { from: data.from, to: data.to },
      stats,
      series,
      recentCompanies,
    };
  });

export const listMasterSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("subscription")
      .select(
        "*, plan:plan(nome,preco_cents,moeda,intervalo), company:company(nome,status_cobranca,email_corporativo)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { rows: data ?? [] };
  });

export const listCompanies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; page?: number; tipoPessoa?: "pf" | "pj" | "" }) => ({
    tipoPessoa: d.tipoPessoa === "pf" || d.tipoPessoa === "pj" ? d.tipoPessoa : "",
    search: (d.search ?? "").trim().toLowerCase(),
    page: Math.max(0, d.page ?? 0),
  }))
  .handler(async ({ context, data }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pageSize = 20;
    let q = supabaseAdmin
      .from("company")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.page * pageSize, data.page * pageSize + pageSize - 1);
    if (data.tipoPessoa) q = q.eq("tipo_pessoa", data.tipoPessoa);
    if (data.search) q = q.ilike("nome", `%${data.search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw error;
    const { data: statusRows, error: statusError } = await supabaseAdmin
      .from("company")
      .select("status_cobranca,trial_ate");
    if (statusError) throw statusError;
    const ids = (rows ?? []).map((c: any) => c.id);
    let ultByCompany: Record<string, string> = {};
    if (ids.length) {
      const { data: movements } = await (supabaseAdmin as any)
        .from("fin_lancamento")
        .select("company_id, updated_at")
        .in("company_id", ids)
        .order("updated_at", { ascending: false })
        .limit(500);
      for (const movement of movements ?? []) {
        if (!ultByCompany[(movement as any).company_id]) {
          ultByCompany[(movement as any).company_id] = (movement as any).updated_at;
        }
      }
    }
    const list = (rows ?? []).map((c: any) => ({
      ...c,
      ultima_atividade: ultByCompany[c.id] ?? null,
    }));
    const now = Date.now();
    const inSevenDays = now + 7 * 86_400_000;
    const stats = {
      total: statusRows?.length ?? 0,
      active: (statusRows ?? []).filter((row: any) => row.status_cobranca === "ativo").length,
      trial: (statusRows ?? []).filter((row: any) => row.status_cobranca === "trial").length,
      suspended: (statusRows ?? []).filter((row: any) => row.status_cobranca === "suspenso").length,
      attention: (statusRows ?? []).filter((row: any) => {
        if (["pendente", "checkout_pending"].includes(row.status_cobranca)) return true;
        if (row.status_cobranca !== "trial" || !row.trial_ate) return false;
        const expiry = new Date(row.trial_ate).getTime();
        return expiry >= now && expiry <= inSevenDays;
      }).length,
    };
    return { rows: list, total: count ?? 0, pageSize, stats };
  });

export const suspendCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; suspend: boolean }) => d)
  .handler(async ({ context, data }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("company")
      .update({ status_cobranca: data.suspend ? "suspenso" : "ativo" })
      .eq("id", data.companyId);
    if (error) throw error;
    return { ok: true };
  });

export const setCompanyTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; days: number; credits: number }) => ({
    companyId: d.companyId,
    days: Math.max(1, Math.min(365, Math.floor(d.days))),
    credits: Math.max(0, Math.min(1_000_000, Math.floor(d.credits))),
  }))
  .handler(async ({ context, data }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("grant_company_trial", {
      _company_id: data.companyId,
      _days: data.days,
      _credits: data.credits,
    });
    if (error) throw error;
    const row = Array.isArray(result) ? result[0] : result;
    if (!row) throw new Error("Assinante não encontrada.");
    return row as { trial_ate: string; creditos_saldo: number };
  });

async function saveSubscriberIdentity(admin: any, confirmedCompanyId: string, data: { tipoPessoa: string; cnpjCpf: string; razaoSocial: string; nomeFantasia: string; nome: string }) {
      const { error: identityError } = await admin.from("company").update({ tipo_pessoa: data.tipoPessoa, cnpj_cpf: data.cnpjCpf || null, razao_social: data.tipoPessoa === "pj" ? data.razaoSocial || null : null, nome_fantasia: data.tipoPessoa === "pj" ? data.nomeFantasia || data.nome : null }).eq("id", confirmedCompanyId);
      if (identityError) throw new Error("Assinante criado, mas não foi possível salvar CPF/CNPJ. Confira o cadastro antes de tentar novamente.");
}

export const createCompanyWithOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      nome: string;
      tipoPessoa?: "pf" | "pj";
      cnpjCpf?: string;
      razaoSocial?: string;
      nomeFantasia?: string;
      ownerEmail: string;
      planId?: string | null;
      trialDays?: number;
      password?: string | null;
    }) => {
      const tipoPessoa = d.tipoPessoa ?? "pf";
      if (tipoPessoa !== "pf" && tipoPessoa !== "pj") throw new Error("Tipo de pessoa inválido");
      const cnpjCpf = String(d.cnpjCpf ?? "").replace(/\D/g, "");
      if (cnpjCpf && (cnpjCpf.length !== (tipoPessoa === "pf" ? 11 : 14) || /^(\d)\1+$/.test(cnpjCpf))) throw new Error("CPF ou CNPJ inválido");
      const razaoSocial = String(d.razaoSocial ?? "").trim();
      const nomeFantasia = String(d.nomeFantasia ?? "").trim();
      if (razaoSocial.length > 200 || nomeFantasia.length > 200) throw new Error("Nome muito longo");
      const nome = String(d.nome || "").trim();
      const ownerEmail = String(d.ownerEmail || "")
        .trim()
        .toLowerCase();
      if (nome.length < 2) throw new Error("Nome inválido");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) throw new Error("Email inválido");
      const planId = String(d.planId || "").trim();
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(planId)
      ) {
        throw new Error("Selecione um plano válido");
      }
      const password = d.password ? String(d.password) : null;
      if (password && password.length < 8) throw new Error("Senha mínima de 8 caracteres");
      return {
        nome, tipoPessoa, cnpjCpf, razaoSocial, nomeFantasia,
        ownerEmail,
        planId,
        trialDays: Math.max(0, Math.min(90, Math.floor(d.trialDays ?? 3))),
        password,
      };
    },
  )
  .handler(async ({ context, data }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { generateProvisionKey, generateTemporaryPassword } =
      await import("./secure-random.server");
    const provisionKey = generateProvisionKey();

    // A identidade do owner vem exclusivamente de auth.users. profiles.email é
    // um espelho editável do perfil e nunca pode decidir quem recebe um tenant.
    const findAuthOwnerByEmail = async (): Promise<string | null> => {
      const { data: authUserId, error: authLookupError } = await admin.rpc(
        "marcia_find_auth_user_by_email",
        { _email: data.ownerEmail },
      );
      if (authLookupError) {
        throw new Error(
          `Não foi possível resolver a identidade Auth do responsável: ${authLookupError.message}`,
        );
      }
      return authUserId ? String(authUserId) : null;
    };

    let ownerId = await findAuthOwnerByEmail();
    let ownerResolution: "existing" | "created" | "reconciled" = ownerId ? "existing" : "created";
    let tempPassword: string | null = null;
    if (!ownerId) {
      tempPassword = data.password ?? generateTemporaryPassword();
      const { data: c, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.ownerEmail,
        password: tempPassword,
        email_confirm: true,
      });
      if (c.user) {
        ownerId = c.user.id;
      } else {
        // A resposta de Auth pode se perder depois do commit, ou outra criação
        // legítima pode vencer a corrida pelo mesmo email. Releia auth.users e
        // nunca escolha um profiles.email nem apague uma conta para compensar.
        const reconciledOwnerId = await findAuthOwnerByEmail();
        if (!reconciledOwnerId) {
          throw new Error(
            `${error?.message || "Falha ao criar usuário"}. Nenhuma identidade Auth foi confirmada; nenhumo assinante foi criada.`,
          );
        }
        ownerId = reconciledOwnerId;
        ownerResolution = "reconciled";
        tempPassword = null;
      }
    }
    const ownerAlreadyExisted = ownerResolution !== "created";

    // A conta existente só pode ter a senha alterada depois de a RPC confirmar
    // que assinante, owner e assinatura foram gravados juntos. Falha de senha não
    // desfaz nem mascara um tenant que já foi criado.
    const finalizeExistingOwnerCredential = async (confirmedCompanyId: string) => {
      await saveSubscriberIdentity(admin, confirmedCompanyId, data);

      if (ownerResolution === "reconciled" && !data.password) {
        return {
          ok: true as const,
          companyId: confirmedCompanyId,
          tempPassword: null,
          passwordReady: false as const,
          warning:
            "Assinante criada após reconciliar a conta Auth existente. Use a senha já cadastrada ou a redefinição de senha; nenhuma credencial foi substituída.",
        };
      }

      if (!ownerAlreadyExisted || !data.password) {
        return {
          ok: true as const,
          companyId: confirmedCompanyId,
          tempPassword,
          passwordReady: true as const,
          warning: null as string | null,
        };
      }

      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(ownerId!, {
        password: data.password,
        email_confirm: true,
      });
      if (passwordError) {
        return {
          ok: true as const,
          companyId: confirmedCompanyId,
          tempPassword: null,
          passwordReady: false as const,
          warning:
            "Assinante criada com segurança, mas a senha da conta existente não foi alterada. Use a redefinição de senha para esse responsável.",
        };
      }

      return {
        ok: true as const,
        companyId: confirmedCompanyId,
        tempPassword: data.password,
        passwordReady: true as const,
        warning: null as string | null,
      };
    };

    const { data: companyId, error: createError } = await supabaseAdmin.rpc(
      "create_company_with_owner_atomic",
      {
        _owner_id: ownerId,
        _company_name: data.nome,
        _slug_base: slugify(data.nome),
        _plan_id: data.planId,
        _idempotency_key: provisionKey,
        _trial_days: data.trialDays,
        _force_password_change: !data.password && !!tempPassword,
      },
    );

    if (createError || !companyId) {
      const reason = createError?.message || "Falha ao criar assinante, owner e assinatura.";

      // Uma resposta perdida não significa rollback. A reconciliação usa o
      // mesmo advisory lock da criação, portanto só retorna depois de a primeira
      // transação confirmar ou desfazer tudo.
      const { data: reconciledCompanyId, error: reconcileError } = await supabaseAdmin.rpc(
        "resolve_company_provision_result",
        {
          _idempotency_key: provisionKey,
          _owner_id: ownerId,
        },
      );
      if (reconciledCompanyId) {
        return finalizeExistingOwnerCredential(String(reconciledCompanyId));
      }

      // Estado indeterminado nunca autoriza apagar a conta: isso poderia deixar
      // um tenant confirmado sem owner caso a confirmação do banco se perdesse.
      if (reconcileError) {
        throw new Error(
          `${reason} Não foi possível reconciliar a operação; a conta foi preservada para nova tentativa segura.`,
        );
      }

      // Mesmo quando esta transação não confirmou, não apagamos a conta.
      // Outra requisição pode ter vinculado o mesmo auth user entre a
      // reconciliação e uma tentativa de compensação (company_user não tem FK
      // para auth.users). Preservar a conta é o fail-safe contra owner órfão.
      throw new Error(`${reason} A conta foi preservada para nova tentativa segura.`);
    }

    return finalizeExistingOwnerCredential(String(companyId));
  });

export const listPlansBasic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // A Lovable remix can execute the owner bootstrap after the one-time offer
    // migration. Older bootstrap functions then reinserted the historical
    // Starter/Pro/Business catalog into an otherwise empty clone. Normalize the
    // offer here as a second, idempotent guard before it is ever shown or sold.
    const canonicalPlans = [
      {
        slug: "starter",
        nome: "Basic",
        descricao: "O essencial para cuidar do dinheiro sem planilha.",
        preco_cents: 4900,
        moeda: "BRL",
        intervalo: "month",
        limite_mensagens: 300,
        limite_instancias: 1,
        limite_usuarios: 1,
        limite_contatos: 1000,
        creditos_mensais: 300,
        creditos_trial: 30,
        features: [
          "Dashboard financeiro",
          "Lançamentos por voz, texto e foto",
          "Movimentações e categorias",
          "Contas e cartões manuais",
          "Calendário financeiro",
          "Lembretes de vencimento",
          "Orçamentos básicos",
          "Aplicativo instalável",
        ],
        destaque: false,
        ativo: true,
        ordem: 1,
      },
      {
        slug: "pro",
        nome: "Pro",
        descricao: "Para automatizar a rotina e conversar com seu financeiro.",
        preco_cents: 6900,
        moeda: "BRL",
        intervalo: "month",
        limite_mensagens: 1500,
        limite_instancias: 1,
        limite_usuarios: 3,
        limite_contatos: 5000,
        creditos_mensais: 1500,
        creditos_trial: 50,
        features: [
          "Tudo do Basic",
          "WhatsApp financeiro",
          "Metas e recorrências",
          "Relatórios inteligentes",
          "Mais comandos com IA",
          "Notificações e lembretes avançados",
          "Suporte prioritário",
        ],
        destaque: true,
        ativo: true,
        ordem: 2,
      },
    ];

    for (const plan of canonicalPlans) {
      const { error } = await supabaseAdmin.from("plan").update(plan).eq("slug", plan.slug);
      if (error) throw error;
    }
    const { error: retireError } = await supabaseAdmin
      .from("plan")
      .update({ ativo: false, destaque: false, ordem: 99 })
      .neq("slug", "starter")
      .neq("slug", "pro");
    if (retireError) throw retireError;

    const { data, error } = await supabaseAdmin
      .from("plan")
      .select("id, slug, nome, preco_cents, moeda, intervalo, trial_days")
      .eq("ativo", true)
      .in("slug", ["starter", "pro"])
      .order("preco_cents", { ascending: true });
    if (error) throw error;
    return { plans: data ?? [] };
  });

export const getSuperAdminEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_config")
      .select("super_admin_emails")
      .eq("id", true)
      .maybeSingle();
    return { emails: (data?.super_admin_emails ?? []) as string[] };
  });

export const setSuperAdminEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { emails: string[] }) => {
    const clean = Array.from(
      new Set((d.emails ?? []).map((e) => String(e).trim().toLowerCase()).filter(Boolean)),
    );
    for (const e of clean) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error(`Email inválido: ${e}`);
    }
    return { emails: clean };
  })
  .handler(async ({ context, data }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_config")
      .upsert({ id: true, super_admin_emails: data.emails });
    if (error) throw error;
    // A trigger do banco sincroniza as promoções e também revoga imediatamente
    // os super_admins removidos da allowlist, na mesma transação do upsert.
    return { ok: true };
  });

export const resetCompanyOwnerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; newPassword?: string }) => ({
    companyId: String(d.companyId),
    newPassword: d.newPassword ? String(d.newPassword) : undefined,
  }))
  .handler(async ({ context, data }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Descobre o owner ativo
    const { data: cu } = await supabaseAdmin
      .from("company_user")
      .select("user_id, role")
      .eq("company_id", data.companyId)
      .eq("ativo", true)
      .order("created_at", { ascending: true });
    const owner = (cu ?? []).find((r: any) => r.role === "owner") ?? (cu ?? [])[0];
    if (!owner) throw new Error("Assinante sem usuário responsável");

    const password =
      data.newPassword && data.newPassword.length >= 8
        ? data.newPassword
        : (await import("./secure-random.server")).generateTemporaryPassword();

    const forcePasswordChange = !data.newPassword;
    if (forcePasswordChange) {
      // Fail closed: gate every tenant before exposing a new temporary
      // credential. If the Auth update fails, the owner can still enter with
      // the old password and complete the same password-change ceremony.
      const { error: forceError } = await supabaseAdmin
        .from("company_user")
        .update({ forcar_troca_senha: true })
        .eq("user_id", owner.user_id)
        .eq("ativo", true);
      if (forceError) throw forceError;
    }

    const { error: uErr } = await supabaseAdmin.auth.admin.updateUserById(owner.user_id, {
      password,
      email_confirm: true,
    });
    if (uErr) throw uErr;

    // A senha do Supabase Auth pertence ao usuário inteiro. Mantenha todas as
    // memberships ativas no mesmo estado para que uma segundo assinante nunca
    // contorne a cerimônia de troca da senha temporária.
    if (!forcePasswordChange) {
      const { error: membershipPasswordError } = await supabaseAdmin
        .from("company_user")
        .update({ forcar_troca_senha: false })
        .eq("user_id", owner.user_id)
        .eq("ativo", true);
      if (membershipPasswordError) throw membershipPasswordError;
    }

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("user_id", owner.user_id)
      .maybeSingle();

    return {
      ok: true,
      tempPassword: data.newPassword ? null : password,
      ownerEmail: prof?.email ?? null,
    };
  });

export const getCompanyDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string }) => ({ companyId: String(d.companyId) }))
  .handler(async ({ context, data }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: company, error } = await supabaseAdmin
      .from("company")
      .select("*")
      .eq("id", data.companyId)
      .maybeSingle();
    if (error) throw error;
    if (!company) throw new Error("Assinante não encontrada");

    const { data: members } = await supabaseAdmin
      .from("company_user")
      .select("user_id, role, ativo, created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: true });

    const userIds = (members ?? []).map((m: any) => m.user_id);
    let profilesById: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, nome, telefone")
        .in("user_id", userIds);
      for (const p of profs ?? []) profilesById[(p as any).user_id] = p;
    }
    const membersFull = (members ?? []).map((m: any) => ({
      ...m,
      profile: profilesById[m.user_id] ?? null,
    }));

    const { data: subscription } = await supabaseAdmin
      .from("subscription")
      .select("*, plan:plan(nome, preco_cents, moeda, intervalo)")
      .eq("company_id", data.companyId)
      .maybeSingle();

    const [
      { count: transactionCount, error: transactionError },
      { count: accountCount, error: accountError },
      { count: aiCommandCount, error: aiCommandError },
    ] = await Promise.all([
      (supabaseAdmin as any)
        .from("fin_lancamento")
        .select("id", { count: "exact", head: true })
        .eq("company_id", data.companyId),
      (supabaseAdmin as any)
        .from("fin_conta")
        .select("id", { count: "exact", head: true })
        .eq("company_id", data.companyId),
      (supabaseAdmin as any)
        .from("marcia_ai_command")
        .select("id", { count: "exact", head: true })
        .eq("company_id", data.companyId),
    ]);
    const usageError = transactionError || accountError || aiCommandError;
    if (usageError)
      throw new Error(`Não foi possível ler a operação do assinante: ${usageError.message}`);

    return {
      company,
      members: membersFull,
      subscription,
      stats: {
        movimentacoes: transactionCount ?? 0,
        contas: accountCount ?? 0,
        comandosIa: aiCommandCount ?? 0,
      },
    };
  });
