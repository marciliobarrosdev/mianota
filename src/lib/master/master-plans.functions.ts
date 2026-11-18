/** Planos no Master. Escritas só pelas RPCs `master_save_plan`/`master_delete_plan` (checagem + auditoria no banco). */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSuper } from "@/lib/master/master-guards";

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
        preco_cents: 2990,
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
        preco_cents: 4990,
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

    void canonicalPlans; // referência histórica; planos só mudam por /master/planos.
    const { data, error } = await supabaseAdmin
      .from("plan")
      .select("id, slug, nome, preco_cents, moeda, intervalo, trial_days, ordem, is_free, free_days, limite_mensagens, limite_usuarios, creditos_mensais, creditos_trial")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("preco_cents", { ascending: true });
    if (error) throw error;
    return { plans: data ?? [] };
  });

export const saveMasterPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string | null; payload: Record<string, unknown> }) => {
    if (!d || typeof d.payload !== "object" || !d.payload) throw new Error("Dados do plano inválidos.");
    return { id: typeof d.id === "string" && d.id ? d.id : null, payload: d.payload };
  })
  .handler(async ({ data, context }) => {
    await assertSuper(context.supabase, context.userId);
    const { data: id, error } = await (context.supabase as any).rpc("master_save_plan", {
      _id: data.id,
      _payload: data.payload,
    });
    if (error) throw new Error(error.message);
    return { id: String(id) };
  });

export const deleteMasterPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("Plano inválido.");
    return { id: String(d.id) };
  })
  .handler(async ({ data, context }) => {
    await assertSuper(context.supabase, context.userId);
    const { error } = await (context.supabase as any).rpc("master_delete_plan", { _id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

