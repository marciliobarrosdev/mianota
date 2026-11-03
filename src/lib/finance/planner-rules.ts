import type { FinancePlannerItem } from "@/lib/finance/finance-dashboard.functions";
import { financeDayStatus } from "@/lib/finance/finance-period";

export type PlannerFilter = "todos" | "receita" | "despesa" | "pendente" | "vencido";

export function filterPlannerItems(items: FinancePlannerItem[], filter: PlannerFilter, today: string) {
  if (filter === "todos") return items;
  if (filter === "receita" || filter === "despesa") return items.filter((i) => i.type === filter);
  if (filter === "vencido") return items.filter((i) => financeDayStatus(i, today) === "vencido");
  return items.filter((i) => i.status !== "pago" && financeDayStatus(i, today) !== "vencido");
}

const signed = (i: FinancePlannerItem) => (i.type === "receita" ? i.amountCents : -i.amountCents);

/** Totais do mês: a receber/a pagar pendentes, vencidos e saldo projetado (realizado + pendente). */
export function plannerTotals(monthItems: FinancePlannerItem[], today: string) {
  let toReceiveCents = 0, toPayCents = 0, overdueCount = 0, overdueCents = 0, realizedCents = 0;
  for (const i of monthItems) {
    if (i.status === "pago") { realizedCents += signed(i); continue; }
    if (i.type === "receita") toReceiveCents += i.amountCents; else toPayCents += i.amountCents;
    if (financeDayStatus(i, today) === "vencido") { overdueCount++; overdueCents += i.amountCents; }
  }
  return { toReceiveCents, toPayCents, overdueCount, overdueCents, realizedCents,
    projectedCents: realizedCents + toReceiveCents - toPayCents };
}

/** Saldo acumulado dia a dia no mês (todas as entradas e saídas, pagas ou não). */
export function dailyProjection(monthItems: FinancePlannerItem[]) {
  const byDay = new Map<string, number>();
  for (const i of monthItems) byDay.set(i.date, (byDay.get(i.date) || 0) + signed(i));
  let acc = 0;
  return [...byDay.keys()].sort().map((date) => ({ date, balanceCents: (acc += byDay.get(date)!) }));
}

const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

/** Gera um arquivo .ics com as contas pendentes (eventos de dia inteiro). */
export function toIcs(items: FinancePlannerItem[], appName = "MIAnota") {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${appName}//Planejamento//PT`];
  for (const i of items.filter((x) => x.status !== "pago")) {
    const d = i.date.replace(/-/g, "");
    const value = (i.amountCents / 100).toFixed(2).replace(".", ",");
    lines.push("BEGIN:VEVENT", `UID:${i.id}@${appName.toLowerCase()}`, `DTSTART;VALUE=DATE:${d}`,
      `SUMMARY:${esc(`${i.type === "receita" ? "Receber" : "Pagar"}: ${i.title} (R$ ${value})`)}`,
      "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// ---------- Fase 2: semana, adiamento, arrastar e relatórios por período ----------

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fmt = (d: Date) => d.toISOString().slice(0, 10);

/** Soma dias a uma data AAAA-MM-DD (sem efeito de fuso). */
export function shiftDate(iso: string, days: number) {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}

/** Os 7 dias (domingo a sábado) da semana que contém a data. */
export function weekDays(iso: string) {
  const start = shiftDate(iso, -parse(iso).getUTCDay());
  return Array.from({ length: 7 }, (_, i) => shiftDate(start, i));
}

/** Só contas ainda não pagas/canceladas podem ser movidas, e nunca para o mesmo dia. */
export function canMoveItem(item: Pick<FinancePlannerItem, "status" | "date">, target?: string) {
  if (item.status === "pago" || item.status === "cancelado") return false;
  if (target !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(target) || target === item.date)) return false;
  return true;
}

export type ReportPeriodKind = "dia" | "semana" | "quinzena" | "mes" | "periodo";
export const REPORT_MAX_DAYS = 366;

const lastDayOfMonth = (iso: string) => {
  const d = parse(iso);
  return fmt(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
};
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Intervalo (inclusive) e rótulo do relatório para o tipo de período a partir de uma data de referência. */
export function reportPeriod(kind: ReportPeriodKind, ref: string, customTo?: string) {
  let from = ref;
  let to = ref;
  if (kind === "semana") [from, to] = [weekDays(ref)[0], weekDays(ref)[6]];
  else if (kind === "quinzena") {
    const day = Number(ref.slice(8, 10));
    from = `${ref.slice(0, 8)}${day <= 15 ? "01" : "16"}`;
    to = day <= 15 ? `${ref.slice(0, 8)}15` : lastDayOfMonth(ref);
  } else if (kind === "mes") [from, to] = [`${ref.slice(0, 8)}01`, lastDayOfMonth(ref)];
  else if (kind === "periodo") {
    to = customTo || ref;
    if (to < from) [from, to] = [to, from];
  }
  const label = from === to ? br(from) : `${br(from)} a ${br(to)}`;
  return { from, to, label };
}

/** Período válido para relatório: datas reais, início ≤ fim e no máximo 366 dias. */
export function isValidReportRange(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return false;
  if (fmt(parse(from)) !== from || fmt(parse(to)) !== to || from > to) return false;
  return (parse(to).getTime() - parse(from).getTime()) / 86400000 + 1 <= REPORT_MAX_DAYS;
}
