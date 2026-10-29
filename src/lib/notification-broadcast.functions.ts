/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperAdmin(supabase: any) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error || data !== true) throw new Error("Acesso restrito ao proprietário da instalação.");
}

export const getBroadcastOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [{ data: plans }, devices] = await Promise.all([
      db.from("plan").select("id,nome").eq("ativo", true).order("ordem"),
      db.from("marcia_push_subscription").select("id", { count: "exact", head: true }).eq("active", true),
    ]);
    return { plans: (plans || []) as { id: string; nome: string }[], activeDevices: devices.count || 0 };
  });

export const sendBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().trim().min(3).max(80),
        body: z.string().trim().min(3).max(300),
        planId: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    let companyIds: string[] | null = null;
    if (data.planId) {
      const { data: subs } = await db.from("subscription").select("company_id").eq("plan_id", data.planId);
      companyIds = (subs || []).map((s: any) => s.company_id);
      if (!companyIds!.length) return { sent: 0 };
    }
    let q = db.from("company_user").select("company_id,user_id").eq("ativo", true).limit(10000);
    if (companyIds) q = q.in("company_id", companyIds);
    const { data: members, error } = await q;
    if (error) throw new Error("Não foi possível listar os assinantes.");
    const batchKey = crypto.randomUUID();
    const rows = (members || []).map((m: any) => ({
      company_id: m.company_id,
      recipient_user_id: m.user_id,
      type: "system.broadcast",
      title: data.title,
      body: data.body,
      data: { key: `broadcast:${batchKey}` },
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const r = await db.from("marcia_notification").insert(rows.slice(i, i + 500));
      if (r.error) throw new Error("Falha ao enviar o aviso.");
    }
    return { sent: rows.length };
  });
