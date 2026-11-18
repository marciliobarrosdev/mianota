/** Lista de e-mails com acesso de Super Administrador. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSuper } from "@/lib/master/master-guards";

export const getSuperAdminEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_config")
      .select("super_admin_emails")
      .eq("id", true)
      .maybeSingle();
    return { emails: (data?.super_admin_emails ?? []) as string[] };
  });

export const setSuperAdminEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { emails: string[] }) => {
    const clean = Array.from(
      new Set((d.emails ?? []).map((e) => String(e).trim().toLowerCase()).filter(Boolean)),
    );
    for (const e of clean) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error(`Email inválido: ${e}`);
    }
    return { emails: clean };
  })
  .handler(async ({ context, data }) => {
    await assertSuper(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.emails.length === 0) throw new Error("É preciso manter pelo menos um administrador.");
    const [{ data: me }, { data: guard }, { data: prev }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(context.userId),
      supabaseAdmin.from("remix_installation_guard").select("claimed_by").eq("id", true).maybeSingle(),
      supabaseAdmin.from("app_config").select("super_admin_emails").eq("id", true).maybeSingle(),
    ]);
    const myEmail = me?.user?.email?.toLowerCase();
    if (myEmail && !data.emails.includes(myEmail))
      throw new Error("Você não pode remover o seu próprio acesso.");
    if (guard?.claimed_by) {
      const { data: owner } = await supabaseAdmin.auth.admin.getUserById(guard.claimed_by);
      const ownerEmail = owner?.user?.email?.toLowerCase();
      if (ownerEmail && !data.emails.includes(ownerEmail))
        throw new Error("O dono da instalação não pode ser removido.");
    }
    const { error } = await supabaseAdmin
      .from("app_config")
      .upsert({ id: true, super_admin_emails: data.emails });
    if (error) throw error;
    // A trigger do banco sincroniza as promoções e também revoga imediatamente
    // os super_admins removidos da allowlist, na mesma transação do upsert.
    const before = ((prev?.super_admin_emails ?? []) as string[]).map((e) => e.toLowerCase());
    const { writeMasterAudit } = await import("@/lib/master/master-audit.server");
    await writeMasterAudit({
      actorId: context.userId,
      action: "admins.update",
      details: {
        added: data.emails.filter((e) => !before.includes(e)),
        removed: before.filter((e) => !data.emails.includes(e)),
      },
    });
    return { ok: true };
  });

