/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuid = z.string().uuid();
const PAYMENT = z.enum(["pix", "cartao", "dinheiro", "transferencia", "boleto", "outro"]);

async function access(context: any, companyId: string) {
  const { requireCompanyMemberAccess } = await import("./company-admin-access.server");
  const a = await requireCompanyMemberAccess(context.supabase, context.userId, companyId);
  const { assertCompanyOperational } = await import("./plan-limits.server");
  await assertCompanyOperational(companyId, { superAdminBypass: a.isSuperAdmin });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function refreshNotices(db: any, companyId: string, userId: string) {
  try {
    const { runAllForUser } = await import("./notification-jobs.server");
    await runAllForUser(db, companyId, userId);
  } catch (e) {
    console.error("transactions: notice refresh failed", e);
  }
}

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

const FIELDS = "id,tipo,descricao,estabelecimento,valor_cents,status,vencimento,pago_em,competencia,ocorrido_em,categoria_id,conta_id,cartao_id,forma_pagamento,observacao";
const RESTORABLE = ["descricao", "estabelecimento", "valor_cents", "status", "vencimento", "pago_em", "competencia", "ocorrido_em", "categoria_id", "forma_pagamento", "observacao"];
export type TxUndo = { id: string; before: Record<string, any> | null };

async function checkCategory(db: any, companyId: string, categoryId: string | null | undefined) {
  if (!categoryId) return;
  const { data } = await db.from("fin_categoria").select("id").eq("id", categoryId).eq("company_id", companyId).maybeSingle();
  if (!data) throw new Error("Categoria inválida.");
}

function snapshot(row: any, patch: Record<string, any>) {
  const before: Record<string, any> = {};
  for (const k of Object.keys(patch)) before[k] = row[k] ?? null;
  return before;
}

/** MIA aprende "estabelecimento → categoria" no perfil compartilhado (mesmas regras de normalização). */
async function learn(db: any, companyId: string, keyword: string | null, categoryId: string | null) {
  if (!keyword || !categoryId) return;
  try {
    const { normalizeAssistantProfile } = await import("./assistant-profile-rules");
    const { learnCategoryRule } = await import("./transactions-rules");
    const { data: row } = await db.from("company").select("finance_profile").eq("id", companyId).maybeSingle();
    const raw = (row?.finance_profile || {}) as Record<string, any>;
    const profile = normalizeAssistantProfile(raw);
    const rules = learnCategoryRule(profile.category_rules, keyword, categoryId);
    await db.from("company").update({ finance_profile: { ...raw, category_rules: normalizeAssistantProfile({ ...raw, category_rules: rules }).category_rules } }).eq("id", companyId);
  } catch (e) {
    console.error("transactions: learn category failed", e);
  }
}

const ActionInput = z.object({
  companyId: uuid,
  id: uuid,
  action: z.enum(["pay", "unpay", "edit", "delete", "duplicate"]),
  description: z.string().trim().min(1).max(240).optional(),
  merchant: z.string().trim().max(160).nullish(),
  amountCents: z.number().int().positive().max(1_000_000_000).optional(),
  date: iso.optional(),
  categoryId: uuid.nullish(),
  paymentMethod: PAYMENT.nullish(),
  note: z.string().trim().max(500).nullish(),
  learn: z.boolean().optional(),
});

/** Pagar/receber, desfazer pagamento, editar, excluir ou duplicar um lançamento. */
export const transactionAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ActionInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; undo: TxUndo[]; message: string }> => {
    const db = await access(context, data.companyId);
    const { data: row, error } = await db.from("fin_lancamento").select(FIELDS).eq("id", data.id).eq("company_id", data.companyId).neq("status", "cancelado").maybeSingle();
    if (error || !row) throw new Error("Movimentação não encontrada.");
    const undo: TxUndo[] = [];
    let message = "Pronto.";

    if (data.action === "duplicate") {
      const d = today();
      const { data: copy, error: e } = await db.from("fin_lancamento").insert({
        company_id: data.companyId, tipo: row.tipo, descricao: row.descricao, estabelecimento: row.estabelecimento,
        valor_cents: row.valor_cents, categoria_id: row.categoria_id, conta_id: row.conta_id, cartao_id: row.cartao_id,
        forma_pagamento: row.forma_pagamento, observacao: row.observacao, status: "pago", vencimento: d, pago_em: d,
        competencia: d, ocorrido_em: `${d}T12:00:00.000Z`, fonte: "manual", created_by: context.userId,
      }).select("id").single();
      if (e) throw new Error(e.message);
      undo.push({ id: copy.id, before: null });
      message = "Movimentação duplicada com a data de hoje.";
    } else {
      const patch: Record<string, any> = {};
      if (data.action === "pay") {
        if (row.status === "pago") throw new Error("Já está marcada como paga.");
        Object.assign(patch, { status: "pago", pago_em: today() });
        message = row.tipo === "receita" ? "Marcada como recebida." : "Marcada como paga.";
      } else if (data.action === "unpay") {
        Object.assign(patch, { status: "pendente", pago_em: null });
        message = "Voltou para pendente.";
      } else if (data.action === "delete") {
        patch.status = "cancelado";
        message = "Movimentação excluída.";
      } else {
        await checkCategory(db, data.companyId, data.categoryId);
        if (data.description) patch.descricao = data.description;
        if (data.merchant !== undefined) patch.estabelecimento = data.merchant || null;
        if (data.amountCents) patch.valor_cents = data.amountCents;
        if (data.categoryId !== undefined) patch.categoria_id = data.categoryId || null;
        if (data.paymentMethod !== undefined) patch.forma_pagamento = data.paymentMethod || null;
        if (data.note !== undefined) patch.observacao = data.note || null;
        if (data.date && data.date !== row.competencia) {
          Object.assign(patch, { competencia: data.date, vencimento: data.date, ocorrido_em: `${data.date}T12:00:00.000Z` });
          if (row.status === "pago") patch.pago_em = data.date;
        }
        message = "Movimentação atualizada.";
      }
      const before = snapshot(row, patch);
      const { error: e } = await db.from("fin_lancamento").update(patch).eq("id", row.id).eq("company_id", data.companyId);
      if (e) throw new Error(e.message);
      undo.push({ id: row.id, before });
      if (data.action === "edit" && data.learn && patch.categoria_id && patch.categoria_id !== row.categoria_id) {
        await learn(db, data.companyId, data.merchant || row.estabelecimento || row.descricao, patch.categoria_id);
        message = "Movimentação atualizada. A MIA vai lembrar dessa categoria.";
      }
    }
    await refreshNotices(db, data.companyId, context.userId);
    return { ok: true, undo, message };
  });

const BulkInput = z.object({
  companyId: uuid,
  ids: z.array(uuid).min(1).max(500),
  action: z.enum(["pay", "delete", "category"]),
  categoryId: uuid.nullish(),
});

/** Ações em lote: pagar, excluir ou trocar categoria. */
export const bulkTransactionAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => BulkInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; undo: TxUndo[]; message: string }> => {
    const db = await access(context, data.companyId);
    if (data.action === "category") await checkCategory(db, data.companyId, data.categoryId);
    const { data: rows, error } = await db.from("fin_lancamento").select(FIELDS).eq("company_id", data.companyId).neq("status", "cancelado").in("id", data.ids);
    if (error) throw new Error(error.message);
    const undo: TxUndo[] = [];
    const d = today();
    for (const row of rows || []) {
      const patch: Record<string, any> =
        data.action === "pay" ? (row.status === "pago" ? {} : { status: "pago", pago_em: d })
        : data.action === "delete" ? { status: "cancelado" }
        : { categoria_id: data.categoryId || null };
      if (!Object.keys(patch).length) continue;
      const before = snapshot(row, patch);
      const { error: e } = await db.from("fin_lancamento").update(patch).eq("id", row.id).eq("company_id", data.companyId);
      if (e) throw new Error(e.message);
      undo.push({ id: row.id, before });
    }
    await refreshNotices(db, data.companyId, context.userId);
    const n = undo.length;
    const verb = data.action === "pay" ? "marcada(s) como paga(s)" : data.action === "delete" ? "excluída(s)" : "com categoria alterada";
    return { ok: true, undo, message: `${n} movimentação(ões) ${verb}.` };
  });

const UndoInput = z.object({
  companyId: uuid,
  undo: z.array(z.object({ id: uuid, before: z.record(z.string(), z.any()).nullable() })).min(1).max(500),
});

/** Desfaz a última ação (só campos conhecidos; remove apenas cópias criadas por "duplicar"). */
export const undoTransactionAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UndoInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = await access(context, data.companyId);
    for (const u of data.undo) {
      if (u.before === null) {
        await db.from("fin_lancamento").update({ status: "cancelado" }).eq("id", u.id).eq("company_id", data.companyId).eq("created_by", context.userId);
        continue;
      }
      const patch: Record<string, any> = {};
      for (const k of RESTORABLE) if (k in u.before) patch[k] = u.before[k];
      if (Object.keys(patch).length) await db.from("fin_lancamento").update(patch).eq("id", u.id).eq("company_id", data.companyId);
    }
    await refreshNotices(db, data.companyId, context.userId);
    return { ok: true };
  });

export type TxBudget = { categoryId: string; limitCents: number; spentCents: number; percentage: number };

/** Orçamentos do mês (limite e gasto) por categoria, para o detalhe do lançamento. */
export const getTransactionBudgets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: uuid, month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(d))
  .handler(async ({ data, context }): Promise<TxBudget[]> => {
    const db = await access(context, data.companyId);
    const start = `${data.month}-01`;
    const [y, m] = data.month.split("-").map(Number);
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const [buds, spent] = await Promise.all([
      db.from("fin_orcamento").select("categoria_id,limite_cents").eq("company_id", data.companyId).eq("competencia", start),
      db.from("fin_lancamento").select("categoria_id,valor_cents").eq("company_id", data.companyId).eq("tipo", "despesa").neq("status", "cancelado").gte("competencia", start).lte("competencia", end).limit(5000),
    ]);
    if (buds.error || spent.error) throw new Error((buds.error || spent.error).message);
    const byCat = new Map<string, number>();
    for (const r of spent.data || []) if (r.categoria_id) byCat.set(r.categoria_id, (byCat.get(r.categoria_id) || 0) + Number(r.valor_cents || 0));
    return (buds.data || []).filter((b: any) => b.categoria_id && b.limite_cents > 0).map((b: any) => {
      const s = byCat.get(b.categoria_id) || 0;
      return { categoryId: b.categoria_id, limitCents: b.limite_cents, spentCents: s, percentage: Math.round((s / b.limite_cents) * 100) };
    });
  });
