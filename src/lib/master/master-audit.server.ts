/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-only: records sensitive Master actions. Never throws into the caller.
export async function writeMasterAudit(params: {
  actorId: string | null;
  action: string;
  target?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let actorEmail: string | null = null;
    if (params.actorId) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(params.actorId);
      actorEmail = data?.user?.email ?? null;
    }
    await (supabaseAdmin as any).from("master_audit_log").insert({
      actor_id: params.actorId,
      actor_email: actorEmail,
      action: params.action,
      target: params.target ?? null,
      details: params.details ?? {},
    });
  } catch (e) {
    console.warn("[writeMasterAudit]", e);
  }
}
