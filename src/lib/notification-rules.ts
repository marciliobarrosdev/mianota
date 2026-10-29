// Regras puras da Central de avisos (categorias, destino, urgência, preferências).

export type NotificationCategory = "finance" | "budget" | "agenda" | "system";
export const NOTIFICATION_CATEGORIES: NotificationCategory[] = ["finance", "budget", "agenda", "system"];
export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  finance: "Contas e vencimentos",
  budget: "Orçamento e metas",
  agenda: "Agenda",
  system: "Sistema",
};

export type NotificationLike = {
  type: string;
  entity_type?: string | null;
  data?: Record<string, unknown> | null;
  title?: string;
  priority?: string | null;
};

export function notificationCategory(n: NotificationLike): NotificationCategory {
  const key = `${n.type} ${n.entity_type || ""}`.toLowerCase();
  if (key.includes("budget") || key.includes("orcamento") || key.includes("meta") || key.includes("goal")) return "budget";
  if (key.includes("finance") || key.includes("fin_") || key.includes("bill")) return "finance";
  if (key.includes("appointment") || key.includes("agenda") || key.includes("work_order")) return "agenda";
  return "system";
}

/** Para onde levar o usuário ao tocar no aviso. Só aceita caminhos internos de /app. */
export function notificationTarget(n: NotificationLike): string {
  const route = typeof n.data?.route === "string" ? n.data.route : "";
  if (/^\/app\/[a-z0-9/_-]*$/i.test(route)) return route;
  const et = (n.entity_type || "").toLowerCase();
  if (et === "fin_lancamento" || et === "fin_recorrencia") return "/app/planejamento";
  if (et === "fin_orcamento") return "/app/orcamentos";
  if (et.includes("appointment")) return "/app/agenda";
  if (et.includes("work_order")) return "/app/ordens";
  if (n.type.startsWith("billing")) return "/app/configuracoes";
  return "/app/notificacoes";
}

export type Urgency = "overdue" | "today" | "soon" | "info";

export function notificationUrgency(n: NotificationLike, today: string): Urgency {
  if (n.priority === "high") return "overdue";
  const due = typeof n.data?.dueDate === "string" ? n.data.dueDate : "";
  if (!due) return "info";
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "soon";
}

export type DayGroup = "Hoje" | "Ontem" | "Esta semana" | "Mais antigas";

export function dayGroup(createdAt: string, now = new Date()): DayGroup {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
  const created = new Date(createdAt);
  const day = fmt(created);
  const today = fmt(now);
  const yesterday = fmt(new Date(now.getTime() - 86_400_000));
  if (day === today) return "Hoje";
  if (day === yesterday) return "Ontem";
  if (now.getTime() - created.getTime() < 7 * 86_400_000) return "Esta semana";
  return "Mais antigas";
}

/** Hora atual (0–23) em São Paulo dentro do horário de silêncio? Aceita faixa que atravessa a meia-noite. */
export function isQuietHour(hour: number, start: number | null | undefined, end: number | null | undefined) {
  if (start == null || end == null || start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export type NotificationPreference = {
  push_categories: string[];
  quiet_start: number | null;
  quiet_end: number | null;
  reminder_lead_days: number;
  daily_summary: boolean;
};

export const DEFAULT_PREFERENCE: NotificationPreference = {
  push_categories: [...NOTIFICATION_CATEGORIES],
  quiet_start: null,
  quiet_end: null,
  reminder_lead_days: 3,
  daily_summary: false,
};

/** Decide se o aviso vai para o celular agora. A Central sempre guarda o aviso. */
export function shouldSendPush(
  n: NotificationLike,
  pref: NotificationPreference | null | undefined,
  hourInSaoPaulo: number,
) {
  const p = pref || DEFAULT_PREFERENCE;
  if (n.type === "push.test") return true;
  if (!p.push_categories.includes(notificationCategory(n))) return false;
  return !isQuietHour(hourInSaoPaulo, p.quiet_start, p.quiet_end);
}

/** Lembrete de conta só entra quando a data cabe na antecedência escolhida (atrasadas sempre entram). */
export function withinReminderLead(dueDate: string, today: string, leadDays: number) {
  if (dueDate <= today) return true;
  const diff = Math.round(
    (new Date(`${dueDate}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86_400_000,
  );
  return diff <= leadDays;
}

/** Orçamento passa a gerar alerta ao atingir o percentual configurado (padrão 80%). */
export function budgetAlertLevel(spentCents: number, limitCents: number, alertPercent = 80) {
  if (limitCents <= 0) return null;
  const pct = (spentCents / limitCents) * 100;
  if (pct >= 100) return "exceeded" as const;
  if (pct >= alertPercent) return "warning" as const;
  return null;
}
