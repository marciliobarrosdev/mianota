/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidReportRange } from "@/lib/finance/planner-rules";

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuid = z.string().uuid();

async function access(context: any, companyId: string) {
  const { requireCompanyMemberAccess } = await import("@/lib/common/company-admin-access.server");
  const a = await requireCompanyMemberAccess(context.supabase, context.userId, companyId);
  const { assertCompanyOperational } = await import("@/lib/billing/plan-limits.server");
  await assertCompanyOperational(companyId, { superAdminBypass: a.isSuperAdmin });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Recalcula lembretes e avisos depois de qualquer mudança no calendário (nunca quebra a ação). */
async function refreshNotices(db: any, companyId: string, userId: string) {
  try {
    const { runAllForUser } = await import("@/lib/finance/notification-jobs.server");
    await runAllForUser(db, companyId, userId);
  } catch (e) {
    console.error("planner: notice refresh failed", e);
  }
}

const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

const ENTRY_FIELDS = "id,descricao,valor_cents,categoria_id,status,vencimento,pago_em,competencia";
type Undo = { table: "fin_lancamento" | "fin_recorrencia"; id: string; before: Record<string, any> | null };

const ActionInput = z.object({
  companyId: uuid,
  entryId: uuid.nullish(),
  recurrenceId: uuid.nullish(),
  date: iso,
  scope: z.enum(["one", "all"]).default("one"),
  action: z.enum(["pay", "move", "edit", "delete"]),
  newDate: iso.optional(),
  title: z.string().trim().min(1).max(160).optional(),
  amountCents: z.number().int().positive().max(1_000_000_000).optional(),
  categoryId: uuid.nullish(),
});

/** Marcar como paga, adiar/mover, editar ou excluir uma conta direto do calendário. */
export const plannerItemAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => {
    const v = ActionInput.parse(d);
    if (!v.entryId && !v.recurrenceId) throw new Error("Item inválido.");
    if (v.action === "move" && !v.newDate) throw new Error("Escolha a nova data.");
    return v;
  })
  .handler(async ({ data, context }): Promise<{ ok: true; undo: Undo[]; message: string }> => {
    const db = await access(context, data.companyId);
    const undo: Undo[] = [];
    const edits: Record<string, any> = {};
    if (data.title) edits.descricao = data.title;
    if (data.amountCents) edits.valor_cents = data.amountCents;
    if (data.categoryId !== undefined) edits.categoria_id = data.categoryId || null;

    if (data.categoryId) {
      const { data: cat } = await db.from("fin_categoria").select("id").eq("id", data.categoryId).eq("company_id", data.companyId).maybeSingle();
      if (!cat) throw new Error("Categoria inválida.");
    }

    let message = "Pronto.";
    if (data.entryId) {
      const { data: row, error } = await db.from("fin_lancamento").select(ENTRY_FIELDS).eq("id", data.entryId).eq("company_id", data.companyId).maybeSingle();
      if (error || !row) throw new Error("Conta não encontrada.");
      const patch: Record<string, any> = {};
      if (data.action === "pay") {
        if (row.status === "pago") throw new Error("Esta conta já está paga.");
        const d = today();
        Object.assign(patch, { status: "pago", pago_em: d });
        message = "Conta marcada como paga e lançada em Movimentações.";
      } else if (data.action === "move") {
        if (row.status === "pago") throw new Error("Contas pagas não podem ser movidas.");
        Object.assign(patch, { vencimento: data.newDate, competencia: data.newDate, status: "pendente" });
        message = "Vencimento alterado.";
      } else if (data.action === "edit") {
        Object.assign(patch, edits);
        if (data.newDate && row.status !== "pago") Object.assign(patch, { vencimento: data.newDate, competencia: data.newDate });
        message = "Conta atualizada.";
      } else {
        patch.status = "cancelado";
        message = "Conta excluída.";
      }
      const before: Record<string, any> = {};
      for (const k of Object.keys(patch)) before[k] = (row as any)[k] ?? null;
      const { error: upErr } = await db.from("fin_lancamento").update(patch).eq("id", row.id).eq("company_id", data.companyId);
      if (upErr) throw new Error(upErr.message);
      undo.push({ table: "fin_lancamento", id: row.id, before });
    } else {
      const { data: rec, error } = await db.from("fin_recorrencia").select("id,descricao,valor_cents,tipo,categoria_id,conta_id,proxima_data,termina_em,ativo").eq("id", data.recurrenceId).eq("company_id", data.companyId).maybeSingle();
      if (error || !rec) throw new Error("Conta recorrente não encontrada.");
      if (data.scope === "all" && data.action !== "pay") {
        const patch: Record<string, any> = {};
        if (data.action === "edit") Object.assign(patch, edits);
        if (data.action === "move" || (data.action === "edit" && data.newDate && data.newDate !== data.date)) patch.proxima_data = data.newDate;
        if (data.action === "delete") {
          if (data.date <= rec.proxima_data) patch.ativo = false;
          else {
            const d = new Date(`${data.date}T12:00:00Z`);
            d.setUTCDate(d.getUTCDate() - 1);
            patch.termina_em = d.toISOString().slice(0, 10);
          }
        }
        const before: Record<string, any> = {};
        for (const k of Object.keys(patch)) before[k] = (rec as any)[k] ?? null;
        const { error: upErr } = await db.from("fin_recorrencia").update(patch).eq("id", rec.id).eq("company_id", data.companyId);
        if (upErr) throw new Error(upErr.message);
        undo.push({ table: "fin_recorrencia", id: rec.id, before });
        message = data.action === "delete" ? "Repetição encerrada a partir desta data." : "Esta e as próximas ocorrências foram atualizadas.";
      } else {
        // Só esta ocorrência: vira um lançamento real ligado à recorrência.
        const target = data.action === "move" || data.action === "edit" ? data.newDate || data.date : data.date;
        const status = data.action === "pay" ? "pago" : data.action === "delete" ? "cancelado" : "pendente";
        const { data: created, error: insErr } = await db
          .from("fin_lancamento")
          .insert({
            company_id: data.companyId,
            tipo: rec.tipo,
            descricao: edits.descricao || rec.descricao,
            valor_cents: edits.valor_cents || rec.valor_cents,
            categoria_id: edits.categoria_id !== undefined ? edits.categoria_id : rec.categoria_id,
            conta_id: rec.conta_id,
            recorrencia_id: rec.id,
            status,
            vencimento: target,
            competencia: target,
            pago_em: status === "pago" ? today() : null,
            ocorrido_em: `${target}T12:00:00.000Z`,
            fonte: "manual",
            metadata: { recurrence_date: data.date, created_from: "planner" },
            created_by: context.userId,
          })
          .select("id")
          .single();
        if (insErr) throw new Error(insErr.message);
        undo.push({ table: "fin_lancamento", id: created.id, before: null });
        message = { pay: "Ocorrência paga e lançada em Movimentações.", move: "Ocorrência adiada.", edit: "Ocorrência atualizada.", delete: "Ocorrência excluída." }[data.action];
      }
    }
    await refreshNotices(db, data.companyId, context.userId);
    return { ok: true, undo, message };
  });

const UndoInput = z.object({
  companyId: uuid,
  undo: z.array(z.object({ table: z.enum(["fin_lancamento", "fin_recorrencia"]), id: uuid, before: z.record(z.any()).nullable() })).max(5),
});
const UNDO_FIELDS: Record<string, string[]> = {
  fin_lancamento: ["descricao", "valor_cents", "categoria_id", "status", "vencimento", "pago_em", "competencia"],
  fin_recorrencia: ["descricao", "valor_cents", "categoria_id", "proxima_data", "termina_em", "ativo"],
};

/** Desfaz a última ação do calendário (apenas campos conhecidos, sempre dentro da conta). */
export const undoPlannerAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UndoInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = await access(context, data.companyId);
    for (const u of data.undo) {
      if (u.before === null) {
        if (u.table !== "fin_lancamento") continue;
        await db.from("fin_lancamento").delete().eq("id", u.id).eq("company_id", data.companyId).not("recorrencia_id", "is", null);
        continue;
      }
      const patch: Record<string, any> = {};
      for (const k of UNDO_FIELDS[u.table]) if (k in u.before) patch[k] = u.before[k];
      if (Object.keys(patch).length) await db.from(u.table).update(patch).eq("id", u.id).eq("company_id", data.companyId);
    }
    await refreshNotices(db, data.companyId, context.userId);
    return { ok: true };
  });

export type PlannerExtras = {
  categories: { id: string; name: string; type: "receita" | "despesa" }[];
  recurrences: { id: string; title: string; amountCents: number; type: "receita" | "despesa"; frequency: string; nextDate: string; endsOn: string | null; active: boolean; category: string | null }[];
  budgets: { id: string; name: string; limitCents: number; spentCents: number; percentage: number }[];
  goals: { id: string; name: string; targetCents: number; savedCents: number; deadline: string | null }[];
};

/** Categorias, recorrências, orçamentos do mês e metas para o calendário. */
export const getPlannerExtras = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: uuid, month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(d))
  .handler(async ({ data, context }): Promise<PlannerExtras> => {
    const db = await access(context, data.companyId);
    const start = `${data.month}-01`;
    const [y, m] = data.month.split("-").map(Number);
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const [cats, recs, buds, goals, spent] = await Promise.all([
      db.from("fin_categoria").select("id,nome,tipo,ativo").eq("company_id", data.companyId).order("nome"),
      db.from("fin_recorrencia").select("id,descricao,valor_cents,tipo,frequencia,proxima_data,termina_em,ativo,categoria_id").eq("company_id", data.companyId).order("proxima_data"),
      db.from("fin_orcamento").select("id,categoria_id,limite_cents").eq("company_id", data.companyId).eq("competencia", start),
      db.from("fin_meta").select("id,nome,objetivo_cents,acumulado_cents,prazo,status").eq("company_id", data.companyId).neq("status", "concluida"),
      db.from("fin_lancamento").select("categoria_id,valor_cents").eq("company_id", data.companyId).eq("tipo", "despesa").neq("status", "cancelado").gte("competencia", start).lte("competencia", end).limit(5000),
    ]);
    const name = new Map((cats.data || []).map((c: any) => [c.id, c.nome]));
    const byCat = new Map<string, number>();
    for (const r of spent.data || []) if (r.categoria_id) byCat.set(r.categoria_id, (byCat.get(r.categoria_id) || 0) + Number(r.valor_cents || 0));
    return {
      categories: (cats.data || []).filter((c: any) => c.ativo !== false).map((c: any) => ({ id: c.id, name: c.nome, type: c.tipo })),
      recurrences: (recs.data || []).map((r: any) => ({ id: r.id, title: r.descricao, amountCents: Number(r.valor_cents), type: r.tipo, frequency: r.frequencia, nextDate: r.proxima_data, endsOn: r.termina_em, active: r.ativo, category: (name.get(r.categoria_id) as string) || null })),
      budgets: (buds.data || []).map((b: any) => {
        const s = byCat.get(b.categoria_id) || 0;
        return { id: b.id, name: (name.get(b.categoria_id) as string) || "Categoria", limitCents: Number(b.limite_cents), spentCents: s, percentage: b.limite_cents ? Math.round((s / b.limite_cents) * 100) : 0 };
      }),
      goals: (goals.data || []).map((g: any) => ({ id: g.id, name: g.nome, targetCents: Number(g.objetivo_cents), savedCents: Number(g.acumulado_cents || 0), deadline: g.prazo })),
    };
  });

const FREQ = ["semanal", "quinzenal", "mensal", "anual"] as const;
const RecInput = z.object({
  companyId: uuid,
  title: z.string().trim().min(1).max(160),
  amountCents: z.number().int().positive().max(1_000_000_000),
  type: z.enum(["receita", "despesa"]),
  categoryId: uuid.nullish(),
  frequency: z.enum(FREQ),
  startDate: iso,
  endDate: iso.nullish(),
  repeat: z.boolean(),
});

/** Nova conta no calendário: avulsa ou recorrente. */
export const createPlannerBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => {
    const v = RecInput.parse(d);
    if (v.endDate && v.endDate < v.startDate) throw new Error("A data final deve ser depois do início.");
    return v;
  })
  .handler(async ({ data, context }) => {
    const db = await access(context, data.companyId);
    if (data.categoryId) {
      const { data: cat } = await db.from("fin_categoria").select("id").eq("id", data.categoryId).eq("company_id", data.companyId).maybeSingle();
      if (!cat) throw new Error("Categoria inválida.");
    }
    const { error } = data.repeat
      ? await db.from("fin_recorrencia").insert({ company_id: data.companyId, descricao: data.title, valor_cents: data.amountCents, tipo: data.type, categoria_id: data.categoryId || null, frequencia: data.frequency, proxima_data: data.startDate, termina_em: data.endDate || null, ativo: true })
      : await db.from("fin_lancamento").insert({ company_id: data.companyId, descricao: data.title, valor_cents: data.amountCents, tipo: data.type, categoria_id: data.categoryId || null, status: "pendente", vencimento: data.startDate, competencia: data.startDate, ocorrido_em: `${data.startDate}T12:00:00.000Z`, fonte: "manual", created_by: context.userId });
    if (error) throw new Error(error.message);
    await refreshNotices(db, data.companyId, context.userId);
    return { ok: true };
  });

/** Pausar, retomar ou encerrar uma recorrência. */
export const updatePlannerRecurrence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: uuid, id: uuid, active: z.boolean().optional(), endsOn: iso.nullish(), title: z.string().trim().min(1).max(160).optional(), amountCents: z.number().int().positive().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await access(context, data.companyId);
    const patch: Record<string, any> = {};
    if (data.active !== undefined) patch.ativo = data.active;
    if (data.endsOn !== undefined) patch.termina_em = data.endsOn;
    if (data.title) patch.descricao = data.title;
    if (data.amountCents) patch.valor_cents = data.amountCents;
    const { error } = await db.from("fin_recorrencia").update(patch).eq("id", data.id).eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    await refreshNotices(db, data.companyId, context.userId);
    return { ok: true };
  });

const ReportInput = z
  .object({ companyId: uuid, from: iso, to: iso, label: z.string().trim().min(1).max(80) })
  .refine((v) => isValidReportRange(v.from, v.to), "Período inválido (máximo de 366 dias).");

/** PDF de qualquer período (dia, semana, quinzena, mês ou personalizado). */
export const downloadPeriodReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ReportInput.parse(d))
  .handler(async ({ data, context }) => {
    const { buildPeriodReport, bytesToBase64 } = await import("@/lib/finance/monthly-report.server");
    const { bytes } = await buildPeriodReport(context.supabase, data.companyId, data.from, data.to, data.label);
    return { base64: bytesToBase64(bytes), fileName: `MIAnota-relatorio-${data.from}_${data.to}.pdf` };
  });

export const sendPeriodReportWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ReportInput.parse(d))
  .handler(async ({ data, context }) => {
    const { buildPeriodReport, bytesToBase64 } = await import("@/lib/finance/monthly-report.server");
    const { userWhatsappPhone, sendCentralDocument, sendCentralText } = await import("@/lib/finance/notification-whatsapp.server");
    const { reportCaption } = await import("@/lib/finance/monthly-report-rules");
    const phone = await userWhatsappPhone(context.supabase, data.companyId, context.userId);
    if (!phone) return { ok: false as const, error: "Vincule seu WhatsApp à MIA para receber o relatório." };
    const { bytes, summary } = await buildPeriodReport(context.supabase, data.companyId, data.from, data.to, data.label);
    const caption = reportCaption(data.label, summary);
    const sent = await sendCentralDocument(phone, bytesToBase64(bytes), `MIAnota-relatorio-${data.from}_${data.to}.pdf`, caption);
    if (sent) return { ok: true as const, mode: "pdf" as const };
    const r = await sendCentralText(phone, `${caption}\n\nO PDF completo está em MIAnota › Planejamento › Relatório.`);
    return r.ok ? { ok: true as const, mode: "text" as const } : { ok: false as const, error: "Não foi possível enviar pelo WhatsApp agora." };
  });
