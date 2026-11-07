/**
 * Regras puras da Central de Notificações do assinante (/app/notificacoes).
 * Sem banco nem React: contadores, filtros, agrupamento por dia, resumo da semana e adiamento.
 * Testadas em tests/notification-center-rules.test.ts.
 */
import {
  NOTIFICATION_CATEGORIES,
  dayGroup,
  notificationCategory,
  type DayGroup,
  type NotificationCategory,
} from "@/lib/finance/notification-rules";

/** Linha de `marcia_notification` (nome histórico da tabela, mantido para preservar dados). */
export type Notice = {
  id: string;
  company_id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  archived_at: string | null;
  priority: string | null;
  created_at: string;
};

export type NoticeFilter = "all" | "unread" | NotificationCategory;

export const NOTICE_PAGE_SIZE = 50;
export const NOTICE_COLUMNS =
  "id,company_id,recipient_user_id,type,title,body,entity_type,entity_id,data,read_at,archived_at,priority,created_at";
const GROUP_ORDER: DayGroup[] = ["Hoje", "Ontem", "Esta semana", "Mais antigas"];

/** Hoje (YYYY-MM-DD) no fuso de São Paulo — vencimentos são comparados nesse fuso. */
export const todayInSaoPaulo = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);

export function countNotices(items: Notice[]): Record<string, number> {
  const counts: Record<string, number> = { all: items.length, unread: 0 };
  for (const category of NOTIFICATION_CATEGORIES) counts[category] = 0;
  for (const notice of items) {
    if (!notice.read_at) counts.unread++;
    counts[notificationCategory(notice)]++;
  }
  return counts;
}

export function filterNotices(items: Notice[], filter: NoticeFilter) {
  if (filter === "all") return items;
  if (filter === "unread") return items.filter((n) => !n.read_at);
  return items.filter((n) => notificationCategory(n) === filter);
}

/** Agrupa em Hoje/Ontem/Esta semana/Mais antigas, sempre nessa ordem e sem grupos vazios. */
export function groupNoticesByDay(items: Notice[], now = new Date()) {
  const map = new Map<DayGroup, Notice[]>();
  for (const notice of items) {
    const group = dayGroup(notice.created_at, now);
    map.set(group, [...(map.get(group) || []), notice]);
  }
  return GROUP_ORDER.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const);
}

/**
 * Contas que vencem até 7 dias à frente (inclui atrasadas).
 * O mesmo lançamento pode gerar vários avisos (ex.: "3 dias antes" e "hoje"):
 * a chave lançamento+vencimento garante que cada conta é somada uma única vez.
 */
export function summarizeDueThisWeek(items: Notice[], today: string) {
  const until = new Date(`${today}T12:00:00Z`);
  until.setUTCDate(until.getUTCDate() + 7);
  const limit = until.toISOString().slice(0, 10);
  const seen = new Set<string>();
  let total = 0;
  let overdue = 0;
  for (const notice of items) {
    if (notice.type !== "finance.due") continue;
    const due = String(notice.data?.dueDate || "");
    const key = `${notice.entity_id}:${due}`;
    if (!due || seen.has(key) || due > limit) continue;
    seen.add(key);
    total += Number(notice.data?.amountCents || 0);
    if (due < today) overdue++;
  }
  return { count: seen.size, total, overdue };
}

/** "Adiar 1 dia": conta atrasada vai para amanhã; conta futura ganha +1 dia sobre o vencimento. */
export function postponedDueDate(due: string, today: string) {
  const date = new Date(`${due < today ? today : due}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function relativeNoticeDate(value: string, now = Date.now()) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const minutes = Math.max(0, Math.floor((now - time) / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(time),
  );
}

export const formatNoticeMoney = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
