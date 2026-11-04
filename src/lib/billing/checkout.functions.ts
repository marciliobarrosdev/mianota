import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify } from "@/lib/common/tenant";
import {
  CHOOSE_PLAN_MESSAGE,
  resolveSignupPlan,
  validateCheckoutCompanyInput,
} from "@/lib/billing/plan-selection";

export const createCheckoutCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { nome: string; plano_slug: string }) => validateCheckoutCompanyInput(d))
  .handler(async ({ context, data }) => {
    // O plano precisa existir e estar ativo ANTES de qualquer efeito colateral.
    const { data: planRows, error: planError } = await context.supabase
      .from("plan")
      .select("slug,ativo,is_free,id")
      .eq("slug", data.plano_slug)
      .limit(1);
    if (planError) throw new Error("Não foi possível validar o plano escolhido.");
    const plan = resolveSignupPlan(data.plano_slug, planRows ?? []);
    if (!plan.ok) {
      throw new Error(
        plan.reason === "inactive"
          ? "Este plano não está disponível no momento. Escolha Basic ou Pro."
          : CHOOSE_PLAN_MESSAGE,
      );
    }

    // Em instalação vazia, o bootstrap conclui a ativação automática da
    // primeira conta confirmada. Sem proprietário, nenhuma empresa é criada.
    const { error: bootstrapError } = await context.supabase.rpc("bootstrap_remix_instance", {
      _company_name: data.nome,
    });
    if (bootstrapError) throw bootstrapError;
    const { data: installationClaimed, error: readinessError } = await context.supabase.rpc(
      "is_remix_installation_claimed",
    );
    if (readinessError) throw new Error("Não foi possível validar a instalação.");
    if (installationClaimed !== true) {
      throw new Error("Este sistema ainda está sendo configurado pelo proprietário.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const chosen = (planRows ?? [])[0] as { is_free?: boolean; id?: string } | undefined;
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const ownerEmail = String(authUser?.user?.email || "").trim().toLowerCase();

    // Plano Grátis: uma única vez por conta (e-mail ou usuário).
    if (chosen?.is_free) {
      const { data: existing } = await admin
        .from("company_user").select("company_id").eq("user_id", context.userId).eq("ativo", true).limit(1);
      if (!existing?.length) {
        let q = admin.from("free_plan_usage").select("email").limit(1);
        q = ownerEmail ? q.or(`email.eq.${ownerEmail},user_id.eq.${context.userId}`) : q.eq("user_id", context.userId);
        const { data: used, error: usedError } = await q;
        if (usedError) throw new Error("Não foi possível validar o plano grátis.");
        if (used?.length) throw new Error("Esta conta já usou o Plano Grátis. Escolha o Basic ou o Pro.");
      }
    }

    const { data: companyId, error: createError } = await supabaseAdmin.rpc(
      "create_checkout_company_atomic",
      {
        _user_id: context.userId,
        _company_name: data.nome,
        _plan_slug: plan.slug,
        _slug_base: slugify(data.nome),
      },
    );
    if (createError || !companyId) {
      throw new Error(createError?.message || "Falha ao criar empresa e assinatura.");
    }

    if (chosen?.is_free) {
      const { error: markError } = await admin.from("free_plan_usage").insert({
        email: ownerEmail, user_id: context.userId, company_id: String(companyId), plan_id: chosen.id, source: "self_service",
      });
      if (markError && markError.code !== "23505") console.error("[free_plan_usage]", markError.message);
    }

    // Dados do formulário de cadastro (guardados na conta) completam a ficha do assinante.
    const raw = (authUser?.user?.user_metadata as any)?.signup_profile;
    if (raw && typeof raw === "object") {
      const { sanitizeSignupProfile, signupProfileError } = await import("@/lib/billing/signup-profile-rules");
      const { personTypeForStorage } = await import("@/lib/master/subscriber-identity-rules");
      const { normalizeValidBrazilianPhone } = await import("@/lib/common/phone");
      const p = sanitizeSignupProfile(raw);
      if (!signupProfileError(p)) {
        const { error: profileError } = await admin.from("company").update({
          nome: p.nome,
          tipo_pessoa: personTypeForStorage(p.tipoPessoa),
          cnpj_cpf: p.cnpjCpf,
          razao_social: p.tipoPessoa === "pj" ? p.razaoSocial || null : null,
          nome_fantasia: p.nome,
          telefone: normalizeValidBrazilianPhone(p.telefone),
          email_corporativo: ownerEmail || null,
          cep: p.cep || null, rua: p.rua || null, numero: p.numero || null,
          complemento: p.complemento || null, bairro: p.bairro || null,
          cidade: p.cidade || null, estado: p.estado || null, segmento: p.segmento || null,
          ...(p.logoUrl ? { logo_url: p.logoUrl } : {}),
        }).eq("id", String(companyId));
        if (profileError) console.error("[signup_profile.company]", profileError.message);
        await admin.from("profiles").update({ nome: p.responsavelNome, nome_completo: p.responsavelNome })
          .eq("id", context.userId);
      }
    }

    return { companyId };
  });
