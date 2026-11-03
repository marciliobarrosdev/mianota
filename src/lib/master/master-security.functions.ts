/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuper(supabase: any) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error || data !== true) throw new Error("Acesso negado");
}

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

export const listBillingEventsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("billing_event_log")
      .select("id, provider, event_type, buyer_email, processed, error, matched_company_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

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
  .handler(async ({ context }) => {
    await assertSuper(context.supabase);
    const { data, error } = await (context.supabase as any)
      .from("master_audit_log")
      .select("id, actor_email, action, target, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as {
      id: string;
      actor_email: string | null;
      action: string;
      target: string | null;
      details: { added?: string[]; removed?: string[]; fields?: string[] } | null;
      created_at: string;
    }[];
  });
