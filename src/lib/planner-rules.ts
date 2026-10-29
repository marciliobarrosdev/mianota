import type { FinancePlannerItem } from "@/lib/finance-dashboard.functions";
import { financeDayStatus } from "@/lib/finance-period";

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
