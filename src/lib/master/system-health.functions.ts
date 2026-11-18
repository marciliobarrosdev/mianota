/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSystemHealth, overallLevel } from "@/lib/master/system-health-rules";

/** Painel "Saúde do sistema": só leitura, apenas para o Super Admin. */
export const getSystemHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isSuper, error: roleError } = await context.supabase.rpc("is_super_admin");
    if (roleError || isSuper !== true) throw new Error("Acesso negado");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const now = new Date();
    const day = new Date(now.getTime() - 86_400_000).toISOString();
    const week = new Date(now.getTime() - 7 * 86_400_000).toISOString();
    const stuck = new Date(now.getTime() - 15 * 60_000).toISOString();
    const count = (q: any) => q.then((r: any) => r.count ?? 0).catch(() => 0);

    const [ai, commands24h, commandErrors24h, whatsappStuck, billingErrors7d, outboxErrors, webhookErrors24h] =
      await Promise.all([
        db
          .from("ai_provider_config")
          .select("mode,test_ok,tested_at,last_error,paused_until,consecutive_failures")
          .eq("id", true)
          .maybeSingle()
          .then((r: any) => r.data ?? null),
        count(db.from("marcia_ai_command").select("id", { count: "exact", head: true }).gte("created_at", day)),
        count(
          db
            .from("marcia_ai_command")
            .select("id", { count: "exact", head: true })
            .gte("created_at", day)
            .not("error_message", "is", null),
        ),
        count(
          db
            .from("platform_support_message")
            .select("id", { count: "exact", head: true })
            .eq("direction", "outbound")
            .in("delivery_status", ["failed", "queued"])
            .gte("created_at", week)
            .lte("created_at", stuck),
        ),
        count(
          db
            .from("billing_event_log")
            .select("id", { count: "exact", head: true })
            .gte("created_at", week)
            .not("error", "is", null),
        ),
        count(
          db
            .from("marcia_outbox_event")
            .select("id", { count: "exact", head: true })
            .is("processed_at", null)
            .not("last_error", "is", null),
        ),
        count(
          db
            .from("webhook_delivery_log")
            .select("id", { count: "exact", head: true })
            .gte("created_at", day)
            .or("erro.not.is.null,status_code.gte.400"),
        ),
      ]);

    const items = buildSystemHealth({
      now,
      ai,
      commands24h,
      commandErrors24h,
      whatsappStuck,
      billingErrors7d,
      outboxErrors,
      webhookErrors24h,
    });
    return { checkedAt: now.toISOString(), overall: overallLevel(items), items };
  });
