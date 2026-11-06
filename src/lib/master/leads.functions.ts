/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isLeadStage, needsCreditUpgrade, shouldAutoLose, type LeadStage, type LeadTemp } from "@/lib/master/lead-pipeline-rules";

async function assertSuper(supabase: any) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error) throw new Error(`Não foi possível validar o acesso: ${error.message}`);
  if (data !== true) throw new Error("Acesso negado");
}

async function audit(actorId: string, action: string, target: string, details: Record<string, unknown> = {}) {
  const { writeMasterAudit } = await import("@/lib/master/master-audit.server");
  await writeMasterAudit({ actorId, action, target, details });
}

export type LeadRow = {
  id: string;
  company_id: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
  origem: string;
  stage: LeadStage;
  position: number;
  temperatura: LeadTemp;
  valor_cents: number;
  responsavel: string | null;
  tags: string[];
  observacoes: string | null;
  motivo_perda: string | null;
  plano_convertido: string | null;
  auto_moved: boolean;
  stage_changed_at: string;
  created_at: string;
  logo_url: string | null;
  trial_ate: string | null;
  creditos_saldo: number | null;
  plano: string | null;
  plan_is_free: boolean | null;
  needs_upgrade: boolean;
  credits_exhausted_at: string | null;
  open_tasks: number;
  open_tasks_overdue: number;
};

export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    await assertSuper(sb);
    const { data: leads, error } = await sb.from("master_lead").select("*").order("position").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (leads ?? []).map((l: any) => l.company_id).filter(Boolean);
    const companies = new Map<string, any>();
    if (ids.length) {
      const { data: cs } = await sb.from("company").select("id, logo_url, trial_ate, creditos_saldo, selected_plan_slug").in("id", ids);
      for (const c of cs ?? []) companies.set(c.id, c);
    }
    const slugs = Array.from(new Set(Array.from(companies.values()).map((c: any) => c.selected_plan_slug).filter(Boolean)));
    const freeBySlug = new Map<string, boolean>();
    if (slugs.length) {
      const { data: ps } = await sb.from("plan").select("slug, is_free").in("slug", slugs);
      for (const p of ps ?? []) freeBySlug.set(p.slug, !!p.is_free);
    }
    const { data: tasks } = await sb.from("master_lead_task").select("lead_id, due_at").eq("done", false);
    const now = Date.now();
    const rows: LeadRow[] = (leads ?? []).map((l: any) => {
      const c = l.company_id ? companies.get(l.company_id) : null;
      const t = (tasks ?? []).filter((x: any) => x.lead_id === l.id);
      return {
        ...l,
        tags: l.tags ?? [],
        logo_url: c?.logo_url ?? null,
        trial_ate: c?.trial_ate ?? null,
        creditos_saldo: c?.creditos_saldo ?? null,
        plano: c?.selected_plan_slug ?? null,
        plan_is_free: c?.selected_plan_slug ? (freeBySlug.get(c.selected_plan_slug) ?? null) : null,
        needs_upgrade: false,
        open_tasks: t.length,
        open_tasks_overdue: t.filter((x: any) => x.due_at && new Date(x.due_at).getTime() < now).length,
      };
    });
    // Créditos IA esgotados no Plano Grátis: destaca e registra uma vez; nunca move para Perdidos.
    const nowIso0 = new Date().toISOString();
    const newlyExhausted: LeadRow[] = [];
    for (const r of rows) {
      r.needs_upgrade = needsCreditUpgrade(r);
      if (r.needs_upgrade && !r.credits_exhausted_at) { r.credits_exhausted_at = nowIso0; newlyExhausted.push(r); }
      else if (!r.needs_upgrade && r.credits_exhausted_at && (r.creditos_saldo ?? 0) > 0) {
        r.credits_exhausted_at = null;
        await sb.from("master_lead").update({ credits_exhausted_at: null }).eq("id", r.id);
      }
    }
    if (newlyExhausted.length) {
      await sb.from("master_lead").update({ credits_exhausted_at: nowIso0 }).in("id", newlyExhausted.map((r) => r.id));
      await sb.from("master_lead_activity").insert(newlyExhausted.map((r) => ({
        lead_id: r.id, kind: "creditos", body: "Créditos IA do Plano Grátis esgotados — precisa fazer upgrade para Basic ou Pro",
      })));
    }
    // Auto: grátis vencido há 7+ dias sem pagamento → Perdidos.
    const toLose = rows.filter((r) => shouldAutoLose(r));
    if (toLose.length) {
      const nowIso = new Date().toISOString();
      await sb.from("master_lead").update({ stage: "perdido", auto_moved: true, motivo_perda: "Não fez upgrade", stage_changed_at: nowIso })
        .in("id", toLose.map((r) => r.id));
      await sb.from("master_lead_activity").insert(toLose.map((r) => ({ lead_id: r.id, kind: "etapa", body: "Plano grátis expirado sem upgrade → Perdidos (automático)" })));
      for (const r of toLose) Object.assign(r, { stage: "perdido", auto_moved: true, motivo_perda: "Não fez upgrade", stage_changed_at: nowIso });
    }
    return rows;
  });

type LeadInput = {
  id?: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
  origem?: string;
  temperatura?: LeadTemp;
  valor_cents?: number;
  responsavel?: string | null;
  tags?: string[];
  observacoes?: string | null;
  stage?: LeadStage;
};

function cleanLead(i: LeadInput) {
  const nome = String(i.nome ?? "").trim().slice(0, 120);
  if (!nome) throw new Error("Informe o nome do lead.");
  const email = i.email ? String(i.email).trim().toLowerCase().slice(0, 200) : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  const temp = ["frio", "morno", "quente"].includes(String(i.temperatura)) ? i.temperatura : "morno";
  return {
    nome,
    email,
    telefone: i.telefone ? String(i.telefone).replace(/[^\d+]/g, "").slice(0, 20) || null : null,
    empresa: i.empresa?.trim().slice(0, 120) || null,
    origem: (i.origem || "manual").trim().slice(0, 40),
    temperatura: temp,
    valor_cents: Math.max(0, Math.round(Number(i.valor_cents) || 0)),
    responsavel: i.responsavel?.trim().slice(0, 80) || null,
    tags: Array.from(new Set((i.tags ?? []).map((t) => String(t).trim().slice(0, 30)).filter(Boolean))).slice(0, 10),
    observacoes: i.observacoes?.trim().slice(0, 2000) || null,
  };
}

export const saveLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: LeadInput) => i)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertSuper(sb);
    const row = cleanLead(data);
    if (data.id) {
      const { error } = await sb.from("master_lead").update({ ...row, updated_at: new Date().toISOString() }).eq("id", data.id);
      if (error) throw new Error(error.message);
      await sb.from("master_lead_activity").insert({ lead_id: data.id, kind: "edicao", body: "Dados do lead atualizados", actor_id: context.userId });
      return { id: data.id };
    }
    const stage = isLeadStage(data.stage) ? data.stage : "novo";
    const { data: created, error } = await sb.from("master_lead").insert({ ...row, stage, position: -Date.now() / 1000 }).select("id").single();
    if (error) throw new Error(error.message);
    await sb.from("master_lead_activity").insert({ lead_id: created.id, kind: "sistema", body: "Lead criado manualmente", actor_id: context.userId });
    return { id: created.id as string };
  });

export const moveLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; stage: LeadStage; position: number; motivo?: string | null }) => {
    if (!isLeadStage(i.stage)) throw new Error("Etapa inválida.");
    return i;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertSuper(sb);
    const { data: cur } = await sb.from("master_lead").select("stage").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Lead não encontrado.");
    const changed = cur.stage !== data.stage;
    const patch: any = { position: Number(data.position) || 0, updated_at: new Date().toISOString() };
    if (changed) {
      patch.stage = data.stage;
      patch.auto_moved = false;
      patch.stage_changed_at = new Date().toISOString();
      patch.motivo_perda = data.stage === "perdido" ? (data.motivo?.slice(0, 120) || "Outro") : null;
    }
    const { error } = await sb.from("master_lead").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (changed) {
      const { LEAD_STAGES } = await import("@/lib/master/lead-pipeline-rules");
      const lbl = (s: string) => LEAD_STAGES.find((x) => x.id === s)?.label ?? s;
      await sb.from("master_lead_activity").insert({
        lead_id: data.id, kind: "etapa", actor_id: context.userId,
        body: `${lbl(cur.stage)} → ${lbl(data.stage)}${data.stage === "perdido" ? ` (${patch.motivo_perda})` : ""}`,
      });
      await audit(context.userId, "lead.move", data.id, { from: cur.stage, to: data.stage });
    }
    return { ok: true };
  });

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertSuper(sb);
    const { data: cur } = await sb.from("master_lead").select("nome, email").eq("id", data.id).maybeSingle();
    const { error } = await sb.from("master_lead").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "lead.delete", data.id, { nome: cur?.nome, email: cur?.email });
    return { ok: true };
  });

export const getLeadDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertSuper(sb);
    const [{ data: activities }, { data: tasks }] = await Promise.all([
      sb.from("master_lead_activity").select("id, kind, body, created_at").eq("lead_id", data.id).order("created_at", { ascending: false }).limit(200),
      sb.from("master_lead_task").select("id, titulo, due_at, done, created_at").eq("lead_id", data.id).order("done").order("due_at", { nullsFirst: false }),
    ]);
    return {
      activities: (activities ?? []) as { id: string; kind: string; body: string; created_at: string }[],
      tasks: (tasks ?? []) as { id: string; titulo: string; due_at: string | null; done: boolean; created_at: string }[],
    };
  });

export const addLeadNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { leadId: string; body: string; kind?: string }) => {
    const body = String(i.body ?? "").trim().slice(0, 2000);
    if (!body) throw new Error("Escreva a nota.");
    const kind = ["nota", "contato"].includes(String(i.kind)) ? i.kind! : "nota";
    return { leadId: i.leadId, body, kind };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertSuper(sb);
    const { error } = await sb.from("master_lead_activity").insert({ lead_id: data.leadId, kind: data.kind, body: data.body, actor_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveLeadTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { leadId: string; id?: string; titulo?: string; due_at?: string | null; done?: boolean; remove?: boolean }) => i)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertSuper(sb);
    if (data.id && data.remove) {
      await sb.from("master_lead_task").delete().eq("id", data.id);
      return { ok: true };
    }
    if (data.id) {
      const { error } = await sb.from("master_lead_task").update({ done: !!data.done }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const titulo = String(data.titulo ?? "").trim().slice(0, 200);
    if (!titulo) throw new Error("Informe a tarefa.");
    const { error } = await sb.from("master_lead_task").insert({ lead_id: data.leadId, titulo, due_at: data.due_at || null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
