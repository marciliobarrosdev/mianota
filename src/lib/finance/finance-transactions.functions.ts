/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuid = z.string().uuid();
const PAYMENT = z.enum(["pix", "cartao", "dinheiro", "transferencia", "boleto", "salario", "outro"]);

async function access(context: any, companyId: string) {
  const { requireCompanyMemberAccess } = await import("@/lib/common/company-admin-access.server");
  const a = await requireCompanyMemberAccess(context.supabase, context.userId, companyId);
  const { assertCompanyOperational } = await import("@/lib/billing/plan-limits.server");
  await assertCompanyOperational(companyId, { superAdminBypass: a.isSuperAdmin });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function refreshNotices(db: any, companyId: string, userId: string) {
  try {
    const { runAllForUser } = await import("@/lib/finance/notification-jobs.server");
    await runAllForUser(db, companyId, userId);
  } catch (e) {
    console.error("transactions: notice refresh failed", e);
  }
}

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

const FIELDS = "id,tipo,descricao,estabelecimento,valor_cents,status,vencimento,pago_em,competencia,ocorrido_em,categoria_id,conta_id,cartao_id,forma_pagamento,observacao,tags,conta_id";
const RESTORABLE = ["descricao", "estabelecimento", "valor_cents", "status", "vencimento", "pago_em", "competencia", "ocorrido_em", "categoria_id", "forma_pagamento", "observacao", "tags"];
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
    const { normalizeAssistantProfile } = await import("@/lib/ai/assistant-profile-rules");
    const { learnCategoryRule } = await import("@/lib/finance/transactions-rules");
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
  tags: z.array(z.string().max(40)).max(20).optional(),
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
        forma_pagamento: row.forma_pagamento, observacao: row.observacao, tags: row.tags || [], status: "pago", vencimento: d, pago_em: d,
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
        if (data.amountCents) {
          patch.valor_cents = data.amountCents;
          if (data.amountCents !== row.valor_cents) {
            const { count } = await db.from("fin_lancamento_split").select("id", { count: "exact", head: true }).eq("lancamento_id", row.id);
            if (count) throw new Error("Este lançamento está dividido. Remova ou ajuste a divisão antes de mudar o valor.");
          }
        }
        if (data.categoryId !== undefined) patch.categoria_id = data.categoryId || null;
        if (data.paymentMethod === null) throw new Error("Informe a forma de pagamento.");
        if (data.paymentMethod !== undefined) patch.forma_pagamento = data.paymentMethod;
        if (data.note !== undefined) patch.observacao = data.note || null;
        if (data.tags !== undefined) {
          const { normalizeTags } = await import("@/lib/finance/transactions-rules");
          patch.tags = normalizeTags(data.tags);
        }
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
  action: z.enum(["pay", "delete", "category", "tag"]),
  categoryId: uuid.nullish(),
  tags: z.array(z.string().max(40)).max(20).optional(),
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
    const { normalizeTags } = await import("@/lib/finance/transactions-rules");
    const add = normalizeTags(data.tags || []);
    if (data.action === "tag" && !add.length) throw new Error("Informe ao menos uma tag.");
    for (const row of rows || []) {
      const patch: Record<string, any> =
        data.action === "pay" ? (row.status === "pago" ? {} : { status: "pago", pago_em: d })
        : data.action === "delete" ? { status: "cancelado" }
        : data.action === "tag" ? (add.every((t) => (row.tags || []).includes(t)) ? {} : { tags: normalizeTags([...(row.tags || []), ...add]) })
        : { categoria_id: data.categoryId || null };
      if (!Object.keys(patch).length) continue;
      const before = snapshot(row, patch);
      const { error: e } = await db.from("fin_lancamento").update(patch).eq("id", row.id).eq("company_id", data.companyId);
      if (e) throw new Error(e.message);
      undo.push({ id: row.id, before });
    }
    await refreshNotices(db, data.companyId, context.userId);
    const n = undo.length;
    const verb = data.action === "pay" ? "marcada(s) como paga(s)" : data.action === "delete" ? "excluída(s)" : data.action === "tag" ? "com tag adicionada" : "com categoria alterada";
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
      db.from("fin_lancamento").select("categoria_id,valor_cents,fin_lancamento_split(categoria_id,valor_cents)").eq("company_id", data.companyId).eq("tipo", "despesa").neq("status", "cancelado").gte("competencia", start).lte("competencia", end).limit(5000),
    ]);
    if (buds.error || spent.error) throw new Error((buds.error || spent.error).message);
    const byCat = new Map<string, number>();
    for (const r of spent.data || []) {
      const parts = r.fin_lancamento_split?.length ? r.fin_lancamento_split : [r];
      for (const p of parts) if (p.categoria_id) byCat.set(p.categoria_id, (byCat.get(p.categoria_id) || 0) + Number(p.valor_cents || 0));
    }
    return (buds.data || []).filter((b: any) => b.categoria_id && b.limite_cents > 0).map((b: any) => {
      const s = byCat.get(b.categoria_id) || 0;
      return { categoryId: b.categoria_id, limitCents: b.limite_cents, spentCents: s, percentage: Math.round((s / b.limite_cents) * 100) };
    });
  });

const SplitInput = z.object({
  companyId: uuid,
  id: uuid,
  parts: z.array(z.object({ categoryId: uuid.nullable(), amountCents: z.number().int().positive().max(1_000_000_000) })).max(10),
});

/** Divide um lançamento entre categorias (lista vazia remove a divisão). A soma precisa bater com o valor. */
export const setTransactionSplits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SplitInput.parse(d))
  .handler(async ({ data, context }) => {
    const db = await access(context, data.companyId);
    const { data: row } = await db.from("fin_lancamento").select("id,valor_cents").eq("id", data.id).eq("company_id", data.companyId).neq("status", "cancelado").maybeSingle();
    if (!row) throw new Error("Movimentação não encontrada.");
    if (data.parts.length) {
      const { validateSplits } = await import("@/lib/finance/transactions-rules");
      const err = validateSplits(row.valor_cents, data.parts);
      if (err) throw new Error(err);
      for (const p of data.parts) await checkCategory(db, data.companyId, p.categoryId);
    }
    const { error: delErr } = await db.from("fin_lancamento_split").delete().eq("lancamento_id", row.id).eq("company_id", data.companyId);
    if (delErr) throw new Error(delErr.message);
    if (data.parts.length) {
      const { error } = await db.from("fin_lancamento_split").insert(data.parts.map((p) => ({ company_id: data.companyId, lancamento_id: row.id, categoria_id: p.categoryId, valor_cents: p.amountCents })));
      if (error) throw new Error(error.message);
    }
    await refreshNotices(db, data.companyId, context.userId);
    return { ok: true, message: data.parts.length ? `Dividido em ${data.parts.length} categorias.` : "Divisão removida." };
  });

const ImportRow = z.object({
  date: iso,
  description: z.string().trim().min(1).max(240),
  amountCents: z.number().int().positive().max(1_000_000_000),
  type: z.enum(["receita", "despesa"]),
  fitid: z.string().max(120).nullable(),
  categoryId: uuid.nullable(),
});

/** Prepara a revisão do extrato: marca repetidos e sugere categorias pelas regras da MIA. */
export const previewStatementImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: uuid, rows: z.array(ImportRow.omit({ categoryId: true })).min(1).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await access(context, data.companyId);
    const dates = data.rows.map((r) => r.date).sort();
    const [{ data: existing, error }, { data: comp }] = await Promise.all([
      db.from("fin_lancamento").select("competencia,valor_cents,tipo,descricao,metadata").eq("company_id", data.companyId).neq("status", "cancelado").gte("competencia", dates[0]).lte("competencia", dates[dates.length - 1]).limit(5000),
      db.from("company").select("finance_profile").eq("id", data.companyId).maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    const { markDuplicates, suggestCategory } = await import("@/lib/finance/bank-statement-rules");
    const { normalizeAssistantProfile } = await import("@/lib/ai/assistant-profile-rules");
    const rules = normalizeAssistantProfile((comp?.finance_profile || {}) as any).category_rules;
    const marked = markDuplicates(data.rows, (existing || []).map((e: any) => ({ date: e.competencia, amountCents: e.valor_cents, type: e.tipo, description: e.descricao || "", fitid: e.metadata?.fitid || null })));
    return marked.map((r) => ({ ...r, categoryId: suggestCategory(r.description, rules) }));
  });

/** Grava as linhas revisadas como pagas, origem "importação", num lote que pode ser desfeito. */
export const importStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: uuid, accountId: uuid.nullable(), fileName: z.string().max(200), paymentMethod: PAYMENT, rows: z.array(ImportRow).min(1).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await access(context, data.companyId);
    if (data.accountId) {
      const { data: acc } = await db.from("fin_conta").select("id").eq("id", data.accountId).eq("company_id", data.companyId).maybeSingle();
      if (!acc) throw new Error("Conta inválida.");
    }
    const { data: cats } = await db.from("fin_categoria").select("id").eq("company_id", data.companyId);
    const valid = new Set((cats || []).map((c: any) => c.id));
    const batch = crypto.randomUUID();
    const payload = data.rows.map((r) => ({
      company_id: data.companyId, tipo: r.type, descricao: r.description, valor_cents: r.amountCents,
      categoria_id: r.categoryId && valid.has(r.categoryId) ? r.categoryId : null, conta_id: data.accountId,
      status: "pago", vencimento: r.date, pago_em: r.date, competencia: r.date, ocorrido_em: `${r.date}T12:00:00.000Z`,
      fonte: "importacao", forma_pagamento: data.paymentMethod, created_by: context.userId,
      metadata: { import_batch: batch, import_file: data.fileName, ...(r.fitid ? { fitid: r.fitid } : {}) },
    }));
    for (let i = 0; i < payload.length; i += 200) {
      const { error } = await db.from("fin_lancamento").insert(payload.slice(i, i + 200));
      if (error) {
        await db.from("fin_lancamento").delete().eq("company_id", data.companyId).eq("metadata->>import_batch", batch);
        throw new Error(error.message);
      }
    }
    await refreshNotices(db, data.companyId, context.userId);
    return { ok: true, batch, count: payload.length };
  });

/** Desfaz uma importação inteira (só o lote criado por este usuário). */
export const undoStatementImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: uuid, batch: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await access(context, data.companyId);
    const { error } = await db.from("fin_lancamento").update({ status: "cancelado" }).eq("company_id", data.companyId).eq("created_by", context.userId).eq("fonte", "importacao").eq("metadata->>import_batch", data.batch);
    if (error) throw new Error(error.message);
    await refreshNotices(db, data.companyId, context.userId);
    return { ok: true };
  });
