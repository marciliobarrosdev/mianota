/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const saoPauloDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const addDays = (date: string, amount: number) => {
  const next = new Date(`${date}T12:00:00-03:00`);
  next.setDate(next.getDate() + amount);
  return saoPauloDate(next);
};

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

function reminderTitle(date: string, today: string) {
  if (date < today) return "Conta atrasada";
  if (date === today) return "Conta vence hoje";
  if (date === addDays(today, 1)) return "Conta vence amanhã";
  return "Conta perto do vencimento";
}

export const syncFinanceReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => {
    const companyId = String(input?.companyId || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(companyId)) throw new Error("Empresa inválida.");
    return { companyId };
  })
  .handler(async ({ context, data }) => {
    const { requireCompanyMemberAccess } = await import("./company-admin-access.server");
    await requireCompanyMemberAccess(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const today = saoPauloDate();
    const from = addDays(today, -30);
    const until = addDays(today, 3);

    const [billsResult, recurrencesResult, existingResult] = await Promise.all([
      db
        .from("fin_lancamento")
        .select("id,descricao,valor_cents,vencimento,status")
        .eq("company_id", data.companyId)
        .eq("tipo", "despesa")
        .in("status", ["pendente", "atrasado"])
        .gte("vencimento", from)
        .lte("vencimento", until)
        .order("vencimento"),
      db
        .from("fin_recorrencia")
        .select("id,descricao,valor_cents,proxima_data")
        .eq("company_id", data.companyId)
        .eq("tipo", "despesa")
        .eq("ativo", true)
        .gte("proxima_data", today)
        .lte("proxima_data", until)
        .order("proxima_data"),
      db
        .from("marcia_notification")
        .select("entity_type,entity_id,data")
        .eq("company_id", data.companyId)
        .eq("recipient_user_id", context.userId)
        .eq("type", "finance.due")
        .gte("created_at", `${from}T00:00:00-03:00`),
    ]);

    if (billsResult.error) throw new Error(billsResult.error.message);
    if (recurrencesResult.error) throw new Error(recurrencesResult.error.message);
    if (existingResult.error) throw new Error(existingResult.error.message);

    const existing = new Set(
      (existingResult.data || []).map(
        (row: any) => `${row.entity_type}:${row.entity_id}:${row.data?.dueDate || ""}`,
      ),
    );
    const candidates = [
      ...(billsResult.data || []).map((row: any) => ({
        entityType: "fin_lancamento",
        id: row.id,
        description: row.descricao,
        amount: Number(row.valor_cents || 0),
        date: row.vencimento,
      })),
      ...(recurrencesResult.data || []).map((row: any) => ({
        entityType: "fin_recorrencia",
        id: row.id,
        description: row.descricao,
        amount: Number(row.valor_cents || 0),
        date: row.proxima_data,
      })),
    ];
    const rows = candidates
      .filter((item) => !existing.has(`${item.entityType}:${item.id}:${item.date}`))
      .slice(0, 50)
      .map((item) => ({
        company_id: data.companyId,
        recipient_user_id: context.userId,
        type: "finance.due",
        title: reminderTitle(item.date, today),
        body: `${item.description} · ${money(item.amount)} · ${new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")}`,
        entity_type: item.entityType,
        entity_id: item.id,
        data: { dueDate: item.date, route: "/app/planejamento" },
      }));

    if (rows.length) {
      const inserted = await db.from("marcia_notification").insert(rows);
      if (inserted.error) throw new Error(inserted.error.message);
    }
    return { created: rows.length, checkedAt: new Date().toISOString() };
  });
