/* eslint-disable @typescript-eslint/no-explicit-any */
// Geração de avisos usada pela tela (ao abrir o app) e pela rotina diária do servidor.
import {
  DEFAULT_PREFERENCE,
  budgetAlertLevel,
  withinReminderLead,
} from "./notification-rules";

export const saoPauloDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const addDays = (date: string, amount: number) => {
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

async function leadDaysFor(db: any, userId: string) {
  const { data } = await db
    .from("notification_preference")
    .select("reminder_lead_days")
    .eq("user_id", userId)
    .maybeSingle();
  return Number(data?.reminder_lead_days ?? DEFAULT_PREFERENCE.reminder_lead_days);
}

/** Avisos de contas a vencer/atrasadas. Idempotente por item + data de vencimento. */
export async function syncDueReminders(db: any, companyId: string, userId: string) {
  const today = saoPauloDate();
  const from = addDays(today, -30);
  const until = addDays(today, 3);
  const lead = await leadDaysFor(db, userId);

  const [bills, recurrences, existing] = await Promise.all([
    db
      .from("fin_lancamento")
      .select("id,descricao,valor_cents,vencimento,status")
      .eq("company_id", companyId)
      .eq("tipo", "despesa")
      .in("status", ["pendente", "atrasado"])
      .gte("vencimento", from)
      .lte("vencimento", until),
    db
      .from("fin_recorrencia")
      .select("id,descricao,valor_cents,proxima_data")
      .eq("company_id", companyId)
      .eq("tipo", "despesa")
      .eq("ativo", true)
      .gte("proxima_data", today)
      .lte("proxima_data", until),
    db
      .from("marcia_notification")
      .select("entity_type,entity_id,data")
      .eq("company_id", companyId)
      .eq("recipient_user_id", userId)
      .eq("type", "finance.due")
      .gte("created_at", `${from}T00:00:00-03:00`),
  ]);
  if (bills.error) throw new Error(bills.error.message);
  if (recurrences.error) throw new Error(recurrences.error.message);
  if (existing.error) throw new Error(existing.error.message);

  const seen = new Set(
    (existing.data || []).map((r: any) => `${r.entity_type}:${r.entity_id}:${r.data?.dueDate || ""}`),
  );
  const candidates = [
    ...(bills.data || []).map((r: any) => ({ et: "fin_lancamento", id: r.id, d: r.descricao, a: Number(r.valor_cents || 0), date: r.vencimento })),
    ...(recurrences.data || []).map((r: any) => ({ et: "fin_recorrencia", id: r.id, d: r.descricao, a: Number(r.valor_cents || 0), date: r.proxima_data })),
  ];
  const rows = candidates
    .filter((c) => withinReminderLead(c.date, today, lead))
    .filter((c) => !seen.has(`${c.et}:${c.id}:${c.date}`))
    .slice(0, 50)
    .map((c) => ({
      company_id: companyId,
      recipient_user_id: userId,
      type: "finance.due",
      title: reminderTitle(c.date, today),
      body: `${c.d} · ${money(c.a)} · ${new Date(`${c.date}T12:00:00`).toLocaleDateString("pt-BR")}`,
      entity_type: c.et,
      entity_id: c.id,
      priority: c.date < today ? "high" : "normal",
      data: { dueDate: c.date, amountCents: c.a, route: "/app/planejamento" },
    }));
  if (rows.length) {
    const r = await db.from("marcia_notification").insert(rows);
    if (r.error) throw new Error(r.error.message);
  }
  return rows.length;
}

/** Um aviso por chave estável (ex.: orçamento do mês, plano vencendo) — nunca repete. */
async function insertOnce(db: any, row: any, key: string) {
  const { data } = await db
    .from("marcia_notification")
    .select("id")
    .eq("company_id", row.company_id)
    .eq("recipient_user_id", row.recipient_user_id)
    .eq("type", row.type)
    .contains("data", { key })
    .limit(1);
  if (data?.length) return 0;
  const r = await db.from("marcia_notification").insert({ ...row, data: { ...(row.data || {}), key } });
  return r.error ? 0 : 1;
}

/** Orçamentos do mês que passaram do percentual de alerta ou estouraram. */
export async function syncBudgetAlerts(db: any, companyId: string, userId: string) {
  const today = saoPauloDate();
  const month = `${today.slice(0, 7)}-01`;
  const { data: budgets } = await db
    .from("fin_orcamento")
    .select("id,categoria_id,limite_cents,alerta_percentual")
    .eq("company_id", companyId)
    .eq("competencia", month);
  if (!budgets?.length) return 0;
  const nextMonth = addDays(`${today.slice(0, 7)}-28`, 5).slice(0, 7) + "-01";
  const { data: spent } = await db
    .from("fin_lancamento")
    .select("categoria_id,valor_cents")
    .eq("company_id", companyId)
    .eq("tipo", "despesa")
    .neq("status", "cancelado")
    .gte("competencia", month)
    .lt("competencia", nextMonth);
  const { data: cats } = await db.from("fin_categoria").select("id,nome").eq("company_id", companyId);
  const catName = new Map((cats || []).map((c: any) => [c.id, c.nome]));
  const totals = new Map<string, number>();
  for (const s of spent || []) totals.set(s.categoria_id, (totals.get(s.categoria_id) || 0) + Number(s.valor_cents || 0));

  let created = 0;
  for (const b of budgets) {
    const used = totals.get(b.categoria_id) || 0;
    const level = budgetAlertLevel(used, Number(b.limite_cents || 0), Number(b.alerta_percentual || 80));
    if (!level) continue;
    const name = catName.get(b.categoria_id) || "uma categoria";
    const pct = Math.round((used / Number(b.limite_cents)) * 100);
    created += await insertOnce(
      db,
      {
        company_id: companyId,
        recipient_user_id: userId,
        type: "budget.alert",
        title: level === "exceeded" ? `Orçamento de ${name} estourado` : `Orçamento de ${name} em ${pct}%`,
        body: `Você já usou ${money(used)} de ${money(Number(b.limite_cents))} este mês.`,
        entity_type: "fin_orcamento",
        entity_id: b.id,
        priority: level === "exceeded" ? "high" : "normal",
        data: { route: "/app/orcamentos" },
      },
      `budget:${b.id}:${month}:${level}`,
    );
  }
  return created;
}

/** Plano perto de vencer (3 dias) e créditos de IA acabando. */
export async function syncAccountAlerts(db: any, companyId: string, userId: string) {
  const today = saoPauloDate();
  let created = 0;
  const [{ data: sub }, { data: company }] = await Promise.all([
    db.from("subscription").select("status,current_period_end,trial_ends_at").eq("company_id", companyId).maybeSingle(),
    db.from("company").select("creditos_saldo,trial_ate").eq("id", companyId).maybeSingle(),
  ]);
  const end = sub?.current_period_end || sub?.trial_ends_at || company?.trial_ate;
  if (end) {
    const endDay = saoPauloDate(new Date(end));
    if (endDay >= today && endDay <= addDays(today, 3)) {
      created += await insertOnce(
        db,
        {
          company_id: companyId,
          recipient_user_id: userId,
          type: "billing.expiring",
          title: "Seu plano MIAnota vence em breve",
          body: `Seu acesso vai até ${new Date(`${endDay}T12:00:00`).toLocaleDateString("pt-BR")}. Renove para não perder a MIA.`,
          priority: "high",
          data: { route: "/app/checkout" },
        },
        `expiring:${endDay}`,
      );
    }
  }
  const credits = Number(company?.creditos_saldo ?? -1);
  if (credits >= 0 && credits <= 10) {
    created += await insertOnce(
      db,
      {
        company_id: companyId,
        recipient_user_id: userId,
        type: "system.credits_low",
        title: "Créditos de IA acabando",
        body: credits === 0 ? "Seus créditos acabaram." : `Restam ${credits} créditos de IA.`,
        data: { route: "/app/checkout" },
      },
      `credits:${today.slice(0, 7)}:${credits === 0 ? "zero" : "low"}`,
    );
  }
  return created;
}

export async function runAllForUser(db: any, companyId: string, userId: string) {
  const a = await syncDueReminders(db, companyId, userId);
  const b = await syncBudgetAlerts(db, companyId, userId).catch(() => 0);
  const c = await syncAccountAlerts(db, companyId, userId).catch(() => 0);
  return a + b + c;
}

/** Aviso de pagamento confirmado para os donos/admins ativos da empresa. Nunca lança erro. */
export async function notifyPaymentConfirmed(db: any, companyId: string, periodEnd: string | null, eventKey: string) {
  try {
    const { data: members } = await db
      .from("company_user")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("ativo", true)
      .in("role", ["owner", "admin"]);
    const until = periodEnd ? new Date(periodEnd).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : null;
    for (const m of members || []) {
      await insertOnce(
        db,
        {
          company_id: companyId,
          recipient_user_id: m.user_id,
          type: "billing.paid",
          title: "Pagamento confirmado",
          body: until ? `Plano MIAnota ativo até ${until}.` : "Seu plano MIAnota está ativo.",
          data: { route: "/app/configuracoes" },
        },
        `paid:${eventKey}`,
      );
    }
  } catch (error) {
    console.error("[billing.notify]", error instanceof Error ? error.message : "falha");
  }
}

/** Resumo diário (só para quem ligou nas preferências): gastos de hoje e contas dos próximos 3 dias. */
export async function sendDailySummary(db: any, companyId: string, userId: string) {
  const { data: pref } = await db
    .from("notification_preference")
    .select("daily_summary")
    .eq("user_id", userId)
    .maybeSingle();
  if (!pref?.daily_summary) return 0;
  const today = saoPauloDate();
  const [{ data: spent }, { data: bills }] = await Promise.all([
    db
      .from("fin_lancamento")
      .select("valor_cents")
      .eq("company_id", companyId)
      .eq("tipo", "despesa")
      .neq("status", "cancelado")
      .gte("ocorrido_em", `${today}T00:00:00-03:00`)
      .lte("ocorrido_em", `${today}T23:59:59-03:00`),
    db
      .from("fin_lancamento")
      .select("valor_cents")
      .eq("company_id", companyId)
      .eq("tipo", "despesa")
      .in("status", ["pendente", "atrasado"])
      .gt("vencimento", today)
      .lte("vencimento", addDays(today, 3)),
  ]);
  const total = (spent || []).reduce((s: number, r: any) => s + Number(r.valor_cents || 0), 0);
  const upcoming = (bills || []).length;
  const upTotal = (bills || []).reduce((s: number, r: any) => s + Number(r.valor_cents || 0), 0);
  return insertOnce(
    db,
    {
      company_id: companyId,
      recipient_user_id: userId,
      type: "system.daily_summary",
      title: "Seu resumo do dia",
      body:
        `Hoje você gastou ${money(total)}.` +
        (upcoming ? ` ${upcoming} ${upcoming === 1 ? "conta vence" : "contas vencem"} nos próximos 3 dias (${money(upTotal)}).` : " Nenhuma conta nos próximos 3 dias."),
      data: { route: "/app/inicio" },
    },
    `summary:${today}`,
  );
}

/** Dia 1: relatório do mês anterior — aviso na Central e PDF no WhatsApp (uma vez por conta). */
export async function sendMonthlyReport(db: any, companyId: string, userId: string) {
  const { data: pref } = await db
    .from("notification_preference")
    .select("monthly_report")
    .eq("user_id", userId)
    .maybeSingle();
  if (pref && pref.monthly_report === false) return 0;
  const { previousMonth, monthLabel } = await import("./monthly-report-rules");
  const month = previousMonth(saoPauloDate());
  const created = await insertOnce(
    db,
    {
      company_id: companyId,
      recipient_user_id: userId,
      type: "system.monthly_report",
      title: `Relatório de ${monthLabel(month)} pronto`,
      body: "Baixe o PDF com receitas, despesas e gastos por categoria.",
      data: { route: "/app/notificacoes", month, whatsappSkip: true },
    },
    `monthly:${month}`,
  );
  if (!created) return 0;
  const { buildMonthlyReport, bytesToBase64 } = await import("./monthly-report.server");
  const { userWhatsappPhone, sendCentralDocument } = await import("./notification-whatsapp.server");
  const { reportCaption } = await import("./monthly-report.functions");
  const phone = await userWhatsappPhone(db, companyId, userId);
  if (phone) {
    const { bytes, summary } = await buildMonthlyReport(db, companyId, month);
    await sendCentralDocument(phone, bytesToBase64(bytes), `MIAnota-relatorio-${month}.pdf`, reportCaption(monthLabel(month), summary));
  }
  return created;
}
