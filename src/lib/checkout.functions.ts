import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify } from "@/lib/tenant";
import {
  CHOOSE_PLAN_MESSAGE,
  resolveSignupPlan,
  validateCheckoutCompanyInput,
} from "@/lib/plan-selection";

export const createCheckoutCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { nome: string; plano_slug: string }) => validateCheckoutCompanyInput(d))
  .handler(async ({ context, data }) => {
    // O plano precisa existir e estar ativo ANTES de qualquer efeito colateral.
    const { data: planRows, error: planError } = await context.supabase
      .from("plan")
      .select("slug,ativo")
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

    return { companyId };
  });
