/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSuper } from "@/lib/master/master-guards";
import { clampWindow, fetchWindow, safeSearchTerm } from "@/lib/common/pagination-rules";
import type { EventStatus } from "@/lib/master/security-rules";

/** Admins with owner flag, creation and last sign-in, plus the caller's e-mail. */
export const getAdminAccessDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: cfg }, { data: guard }, { data: me }] = await Promise.all([
      supabaseAdmin.from("app_config").select("super_admin_emails").eq("id", true).maybeSingle(),
      supabaseAdmin.from("remix_installation_guard").select("claimed_by").eq("id", true).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(context.userId),
    ]);
    const emails = ((cfg?.super_admin_emails ?? []) as string[]).map((e) => e.toLowerCase());
    let ownerEmail: string | null = null;
    if (guard?.claimed_by) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(guard.claimed_by);
      ownerEmail = data?.user?.email?.toLowerCase() ?? null;
    }
    const details: Record<string, { createdAt: string | null; lastSignIn: string | null }> = {};
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of list?.users ?? []) {
      const e = u.email?.toLowerCase();
      if (e && emails.includes(e))
        details[e] = { createdAt: u.created_at ?? null, lastSignIn: u.last_sign_in_at ?? null };
    }
    return {
      me: me?.user?.email?.toLowerCase() ?? null,
      ownerEmail,
      details,
    };
  });

/** Avisos de pagamento e registro do Master por "Carregar mais". */
export const BILLING_EVENTS_PAGE = 50;
export const MASTER_AUDIT_PAGE = 50;
const BILLING_PROVIDERS = ["infinitepay", "kiwify", "cakto", "perfectpay"];
// Mesma regra de `eventStatus`: "evento ignorado" não é erro; erro = texto de erro ou não processado.
const NOT_IGNORED = 'error.is.null,error.neq."evento ignorado"';
const HAS_ERROR = "error.not.is.null,processed.is.false";

export const listBillingEventsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { limit?: number; provider?: string; status?: string; search?: string } | undefined) => ({
      limit: clampWindow(d?.limit, BILLING_EVENTS_PAGE),
      provider: BILLING_PROVIDERS.includes(String(d?.provider)) ? String(d?.provider) : "",
      status: (["ok", "ignored", "error"].includes(String(d?.status)) ? d?.status : "all") as
        | EventStatus
        | "all",
      search: safeSearchTerm(d?.search),
    }),
  )
  .handler(async ({ context, data }) => {
    await assertSuper(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const base = (fields: string, opts: Record<string, unknown>) =>
      db.from("billing_event_log").select(fields, opts);
    const onlyErrors = (q: any) => q.or(NOT_IGNORED).or(HAS_ERROR);
    const count = async (apply: (q: any) => any) => {
      const { count: n, error } = await apply(base("id", { count: "exact", head: true }));
      if (error) throw new Error(error.message);
      return n ?? 0;
    };

    const page = await fetchWindow<BillingEventRow>(data.limit, (from, to) => {
      let q = base("id, provider, event_type, buyer_email, processed, error, matched_company_id, created_at", {
        count: "exact",
      })
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to);
      if (data.provider) q = q.eq("provider", data.provider);
      if (data.status === "ok") q = q.is("error", null).eq("processed", true);
      if (data.status === "ignored") q = q.eq("error", "evento ignorado");
      if (data.status === "error") q = onlyErrors(q);
      if (data.search) q = q.ilike("buyer_email", `%${data.search}%`);
      return q.then(({ data: rows, count: n, error }: any) => {
        if (error) throw new Error(error.message);
        return { rows: (rows ?? []) as BillingEventRow[], count: n as number | null };
      });
    });

    // Resumo e "último aviso" contam no banco inteiro, não só nas linhas carregadas.
    const now = new Date();
    const todayStart = `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
    const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const [total, errors, errors24h, today, ...latest] = await Promise.all([
      count((q) => q),
      count(onlyErrors),
      count((q) => onlyErrors(q).gte("created_at", dayAgo)),
      count((q) => q.gte("created_at", todayStart)),
      ...BILLING_PROVIDERS.map((provider) =>
        base("created_at", {})
          .eq("provider", provider)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data: row }: any) => [provider, row?.created_at ?? null] as const),
      ),
    ]);
    const lastBy: Record<string, string> = {};
    for (const [provider, at] of latest as (readonly [string, string | null])[]) if (at) lastBy[provider] = at;
    return {
      rows: page.rows,
      total: page.total,
      summary: { today, ok: total - errors, errors, errors24h },
      lastBy,
    };
  });

type BillingEventRow = {
  id: string;
  provider: string;
  event_type: string | null;
  buyer_email: string | null;
  processed: boolean;
  error: string | null;
  matched_company_id: string | null;
  created_at: string;
};

/** Re-applies a failed billing event from its stored payload. */
export const reprocessBillingEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(String(d?.id))) throw new Error("Evento inválido.");
    return { id: String(d.id) };
  })
  .handler(async ({ context, data }) => {
    await assertSuper(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any)
      .from("billing_event_log")
      .select("id, payload, event_key, processed, error")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Evento não encontrado.");
    if (row.processed && !row.error) throw new Error("Este evento já foi processado.");
    if (!row.payload?.provider || !row.payload?.eventType)
      throw new Error("Este evento não tem dados suficientes para reprocessar.");
    const key = row.event_key ?? `retry:${row.id}`;
    await (supabaseAdmin as any).from("billing_event_log").delete().eq("id", row.id);
    const { applyEvent } = await import("@/lib/billing/apply.server");
    await applyEvent(row.payload, key);
    const { writeMasterAudit } = await import("@/lib/master/master-audit.server");
    await writeMasterAudit({
      actorId: context.userId,
      action: "billing.reprocess",
      target: row.payload.buyerEmail ?? null,
    });
    return { ok: true };
  });

export const listMasterAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number; action?: string } | undefined) => ({
    limit: clampWindow(d?.limit, MASTER_AUDIT_PAGE),
    action: d?.action && d.action !== "all" ? String(d.action).slice(0, 80) : "",
  }))
  .handler(async ({ context, data }) => {
    await assertSuper(context.supabase);
    const sb = context.supabase as any;
    const page = await fetchWindow<MasterAuditRow>(data.limit, (from, to) => {
        let q = sb
          .from("master_audit_log")
          .select("id, actor_email, action, target, details, created_at", { count: "exact" })
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to);
        if (data.action) q = q.eq("action", data.action);
        return q.then(({ data: rows, count, error }: any) => {
          if (error) throw new Error(error.message);
          return { rows: (rows ?? []) as MasterAuditRow[], count: count as number | null };
        });
      });
    // Total geral para o cartão "Ações registradas", independente do filtro.
    const all = data.action
      ? ((await sb.from("master_audit_log").select("id", { count: "exact", head: true })).count ?? 0)
      : page.total;
    return { rows: page.rows, total: page.total, all };
  });

type MasterAuditRow = {
  id: string;
  actor_email: string | null;
  action: string;
  target: string | null;
  details: { added?: string[]; removed?: string[]; fields?: string[] } | null;
  created_at: string;
};
