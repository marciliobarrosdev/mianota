// Pure rules for the summary cards on Visão do mês, Movimentações and Planejamento.
// Dates are ISO "YYYY-MM-DD" in São Paulo time; amounts are integer cents.

export type SummaryEntry = {
  type: "receita" | "despesa" | string;
  status: string; // pago | pendente | atrasado | cancelado
  amountCents: number;
  /** Date money actually moved (paid entries) — pago_em or competência. */
  paidDate?: string | null;
  /** Due date for open entries. */
  dueDate?: string | null;
};

export type FinanceSummaryCards = {
  today: string;
  monthStart: string;
  receivedMtdCents: number;
  spentMtdCents: number;
  previousCarryCents: number;
  monthBalanceCents: number;
  previousReceivedMtdCents: number;
  previousSpentMtdCents: number;
  previousMonthBalanceCents: number;
  last30BalanceCents: number;
  overdueOpenCents: number;
  overdueOpenCount: number;
  toReceiveCents: number;
  toPayCents: number;
};

export function saoPauloToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function shiftIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Same day next month, clamped to the month's last day (31/01 → 28/02). */
export function plusOneMonth(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, last))).toISOString().slice(0, 10);
}

export function summaryWindows(today: string) {
  const monthStart = `${today.slice(0, 7)}-01`;
  const prevMonthStart = (() => {
    const [y, m] = today.split("-").map(Number);
    return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
  })();
  const prevMonthEnd = shiftIso(monthStart, -1);
  const prevSameDay = (() => {
    const day = Number(today.slice(8, 10));
    const lastDay = Number(prevMonthEnd.slice(8, 10));
    return `${prevMonthStart.slice(0, 8)}${String(Math.min(day, lastDay)).padStart(2, "0")}`;
  })();
  return { monthStart, prevMonthStart, prevSameDay, last30Start: shiftIso(today, -29), oneMonthAhead: plusOneMonth(today) };
}

const isPaid = (e: SummaryEntry) => e.status === "pago";
const isOpen = (e: SummaryEntry) => e.status === "pendente" || e.status === "atrasado";

function paidBetween(entries: SummaryEntry[], type: string, from: string | null, to: string) {
  return entries.reduce((sum, e) => {
    const d = e.paidDate;
    if (!isPaid(e) || e.type !== type || !d || d > to || (from && d < from)) return sum;
    return sum + e.amountCents;
  }, 0);
}

/**
 * entries: every non-cancelled entry of the account (paid and open).
 * upcoming: open planner items (entries + recurrences) from today to one month ahead.
 */
export function computeSummaryCards(entries: SummaryEntry[], today: string, upcoming: SummaryEntry[] = entries): FinanceSummaryCards {
  const w = summaryWindows(today);
  const active = entries.filter((e) => e.status !== "cancelado");
  const receivedMtd = paidBetween(active, "receita", w.monthStart, today);
  const spentMtd = paidBetween(active, "despesa", w.monthStart, today);
  const beforeMonth = shiftIso(w.monthStart, -1);
  const carry = paidBetween(active, "receita", null, beforeMonth) - paidBetween(active, "despesa", null, beforeMonth);
  const beforePrev = shiftIso(w.prevMonthStart, -1);
  const prevCarry = paidBetween(active, "receita", null, beforePrev) - paidBetween(active, "despesa", null, beforePrev);
  const prevReceived = paidBetween(active, "receita", w.prevMonthStart, w.prevSameDay);
  const prevSpent = paidBetween(active, "despesa", w.prevMonthStart, w.prevSameDay);
  const last30 = paidBetween(active, "receita", w.last30Start, today) - paidBetween(active, "despesa", w.last30Start, today);
  let overdue = 0, overdueCount = 0;
  for (const e of active) {
    if (isOpen(e) && e.dueDate && e.dueDate < today) { overdue += e.amountCents; overdueCount++; }
  }
  let toReceive = 0, toPay = 0;
  for (const e of upcoming) {
    if (!isOpen(e) || !e.dueDate || e.dueDate < today || e.dueDate > w.oneMonthAhead) continue;
    if (e.type === "receita") toReceive += e.amountCents;
    else if (e.type === "despesa") toPay += e.amountCents;
  }
  return {
    today,
    monthStart: w.monthStart,
    receivedMtdCents: receivedMtd,
    spentMtdCents: spentMtd,
    previousCarryCents: carry,
    monthBalanceCents: carry + receivedMtd - spentMtd,
    previousReceivedMtdCents: prevReceived,
    previousSpentMtdCents: prevSpent,
    previousMonthBalanceCents: prevCarry + prevReceived - prevSpent,
    last30BalanceCents: last30,
    overdueOpenCents: overdue,
    overdueOpenCount: overdueCount,
    toReceiveCents: toReceive,
    toPayCents: toPay,
  };
}
