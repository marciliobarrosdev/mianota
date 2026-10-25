import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// The password and the forced-change flag are handled in the same trusted
// server action. That prevents a caller from clearing the flag without first
// proving that Supabase Auth accepted the new password.
export const completeForcedPasswordChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { password: string }) => {
    const password = String(d?.password || "");
    if (password.length < 8 || password.length > 128) {
      throw new Error("A senha precisa ter entre 8 e 128 caracteres.");
    }
    return { password };
  })
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.password,
    });
    if (passwordError) throw new Error(passwordError.message);

    const { error } = await supabaseAdmin
      .from("company_user")
      .update({ forcar_troca_senha: false })
      .eq("user_id", context.userId)
      .eq("ativo", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function resolveCompanyId(supabase: any, userId: string): Promise<string> {
  const { assertUserPasswordReady } = await import("./company-admin-access.server");
  await assertUserPasswordReady(supabase);
  const { data } = await supabase
    .from("company_user")
    .select("company_id, role, forcar_troca_senha")
    .eq("user_id", userId)
    .eq("ativo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Sem empresa.");
  if (data.forcar_troca_senha) throw new Error("Troque a senha temporária para continuar.");
  return data.company_id as string;
}

async function requireOwnerOrAdmin(supabase: any, userId: string): Promise<string> {
  const { assertUserPasswordReady } = await import("./company-admin-access.server");
  await assertUserPasswordReady(supabase);
  const { data } = await supabase
    .from("company_user")
    .select("company_id, role, forcar_troca_senha")
    .eq("user_id", userId)
    .eq("ativo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Sem empresa.");
  if (data.forcar_troca_senha) throw new Error("Troque a senha temporária para continuar.");
  if (!["owner", "admin"].includes(String(data.role))) throw new Error("Apenas owner/admin.");
  return data.company_id as string;
}

// ---------- Audit log ----------
export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const cid = await requireOwnerOrAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("audit_log")
      .select("*")
      .eq("company_id", cid)
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

// ---------- LGPD export ----------
export const exportLgpd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const cid = await requireOwnerOrAdmin(context.supabase, context.userId);
    const s = context.supabase;
    const tables = [
      "company",
      "company_user",
      "profiles",
      "mensagens",
      "contact_pause",
      "marcia_customer",
      "marcia_professional",
      "marcia_service",
      "marcia_professional_service",
      "marcia_availability_rule",
      "marcia_schedule_block",
      "marcia_appointment",
      "marcia_appointment_history",
      "marcia_work_order",
      "marcia_work_order_item",
      "marcia_work_order_checklist",
      "marcia_work_order_attachment",
      "marcia_work_order_history",
      "marcia_notification",
      "marcia_sync_record",
      "csat_response",
      "audit_log",
    ];
    const out: Record<string, any[]> = {};
    for (const t of tables) {
      try {
        const tbl = (s as any).from(t);
        const q =
          t === "company"
            ? tbl.select("*").eq("id", cid)
            : t === "profiles"
              ? tbl.select("*").eq("user_id", context.userId)
              : tbl.select("*").eq("company_id", cid);
        const { data } = await q;
        out[t] = data ?? [];
      } catch {
        out[t] = [];
      }
    }
    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      companyId: cid,
      userId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      acao: "lgpd.export",
      recurso: "company",
      detalhes: { tables: tables.length },
    });
    return {
      exported_at: new Date().toISOString(),
      company_id: cid,
      data: out,
    };
  });
