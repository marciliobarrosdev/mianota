/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeAssistantProfile } from "@/lib/ai/assistant-profile-rules";

const uuid = (v: unknown) => {
  const s = String(v || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error("Empresa inválida.");
  return s;
};

/** Salva o perfil da MIA com validação no servidor (somente dono/admin). */
export const saveAssistantProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; profile: unknown }) => ({
    companyId: uuid(input?.companyId),
    profile: normalizeAssistantProfile(input?.profile),
  }))
  .handler(async ({ context, data }) => {
    const { requireCompanyAdminAccess } = await import("@/lib/common/company-admin-access.server");
    await requireCompanyAdminAccess(context.supabase, context.userId, data.companyId);
    const db = context.supabase as any;
    const { data: row } = await db.from("company").select("finance_profile").eq("id", data.companyId).maybeSingle();
    const merged = { ...(row?.finance_profile || {}), ...data.profile };
    const r = await db.from("company").update({ finance_profile: merged }).eq("id", data.companyId);
    if (r.error) throw new Error("Não foi possível salvar agora.");
    return { ok: true as const, profile: data.profile };
  });

/** Resumo do que a MIA já sabe: lançamentos, categorias mais usadas e WhatsApp conectado. */
export const getAssistantKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => ({ companyId: uuid(input?.companyId) }))
  .handler(async ({ context, data }) => {
    const { requireCompanyMemberAccess } = await import("@/lib/common/company-admin-access.server");
    await requireCompanyMemberAccess(context.supabase, context.userId, data.companyId);
    const db = context.supabase as any;
    const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const [count, recent, cats, wa] = await Promise.all([
      db.from("fin_lancamento").select("id", { count: "exact", head: true }).eq("company_id", data.companyId),
      db.from("fin_lancamento").select("categoria_id").eq("company_id", data.companyId).eq("tipo", "despesa").gte("competencia", since).limit(2000),
      db.from("fin_categoria").select("id,nome,tipo").eq("company_id", data.companyId).order("nome"),
      db.from("fin_whatsapp_identity").select("id", { count: "exact", head: true }).eq("company_id", data.companyId),
    ]);
    const names = new Map<string, string>((cats.data || []).map((c: any) => [c.id, c.nome]));
    const tally = new Map<string, number>();
    for (const r of recent.data || []) if (r.categoria_id) tally.set(r.categoria_id, (tally.get(r.categoria_id) || 0) + 1);
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => ({ name: names.get(id) || "Sem nome", count: n }));
    return {
      transactions: count.count || 0,
      topCategories: top,
      whatsappLinked: (wa.count || 0) > 0,
      categories: (cats.data || []).map((c: any) => ({ id: c.id as string, name: c.nome as string, type: c.tipo as string })),
    };
  });
