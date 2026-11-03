/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Rotina diária: gera avisos de contas, orçamento e plano para todos os membros ativos,
// mesmo com o app fechado. O envio ao celular sai pelo gatilho de push existente.
export const Route = createFileRoute("/api/public/cron/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const body = (await request.json().catch(() => ({}))) as { kind?: string };
        const jobs = await import("@/lib/finance/notification-jobs.server");
        const run =
          body.kind === "summary" ? jobs.sendDailySummary : body.kind === "monthly" ? jobs.sendMonthlyReport : jobs.runAllForUser;
        const db = supabaseAdmin as any;
        const { data: members, error } = await db
          .from("company_user")
          .select("company_id,user_id")
          .eq("ativo", true)
          .limit(5000);
        if (error) return Response.json({ ok: false }, { status: 500 });
        let created = 0;
        let failed = 0;
        for (const m of members || []) {
          try {
            created += await run(db, m.company_id, m.user_id);
          } catch {
            failed++;
          }
        }
        return Response.json({ ok: true, members: (members || []).length, created, failed });
      },
    },
  },
});
