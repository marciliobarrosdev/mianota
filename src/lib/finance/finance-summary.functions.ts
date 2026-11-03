/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPlannerItems } from "@/lib/finance/finance-dashboard.functions";
import { computeSummaryCards, saoPauloToday, summaryWindows, type FinanceSummaryCards, type SummaryEntry } from "@/lib/finance/summary-cards-rules";

export const getFinanceSummaryCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => {
    const companyId = String(input?.companyId || "").trim();
    if (!companyId) throw new Error("Conta não informada.");
    return { companyId };
  })
  .handler(async ({ context, data }): Promise<FinanceSummaryCards> => {
    const { data: allowed, error: accessError } = await (context.supabase as any).rpc("has_company_access", { _company_id: data.companyId });
    if (accessError) throw new Error(accessError.message);
    if (!allowed) throw new Error("Sem acesso a esta conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const today = saoPauloToday();
    const w = summaryWindows(today);

    const entries: SummaryEntry[] = [];
    const pageSize = 1000;
    for (let offset = 0; offset < 50000; offset += pageSize) {
      const { data: rows, error } = await db
        .from("fin_lancamento")
        .select("id,tipo,status,valor_cents,pago_em,competencia,vencimento")
        .eq("company_id", data.companyId)
        .neq("status", "cancelado")
        .order("id")
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(error.message);
      for (const r of rows || []) {
        entries.push({
          type: r.tipo,
          status: r.status,
          amountCents: Number(r.valor_cents || 0),
          paidDate: r.status === "pago" ? String(r.pago_em || r.competencia || "").slice(0, 10) || null : null,
          dueDate: r.status === "pago" ? null : String(r.vencimento || r.competencia || "").slice(0, 10) || null,
        });
      }
      if (!rows || rows.length < pageSize) break;
    }

    const planner = await buildPlannerItems(db, data.companyId, today, w.oneMonthAhead);
    const upcoming: SummaryEntry[] = planner.map((i) => ({ type: i.type, status: i.status, amountCents: i.amountCents, dueDate: i.date }));
    return computeSummaryCards(entries, today, upcoming);
  });
