// Pure rules for Master subscribers/subscriptions screens.
const DAY = 86_400_000;

export function daysUntil(date: string | null | undefined, now = Date.now()): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now) / DAY);
}

export type SubLike = {
  status: string;
  current_period_end: string | null;
  created_at: string;
  updated_at?: string | null;
  plan: { preco_cents: number } | null;
};

/** Paid subscriptions about to end (0..days) and already ended without renewal. */
export function renewalBuckets<T extends SubLike>(rows: T[], now = Date.now(), days = 7) {
  const expiringSoon: T[] = [];
  const overdue: T[] = [];
  for (const r of rows) {
    if (!["active", "past_due"].includes(r.status)) continue;
    const d = daysUntil(r.current_period_end, now);
    if (d === null) continue;
    if (d < 0 || r.status === "past_due") overdue.push(r);
    else if (d <= days) expiringSoon.push(r);
  }
  return { expiringSoon, overdue };
}

export function revenueStats(rows: SubLike[], now = Date.now()) {
  const n = new Date(now);
  const monthStart = new Date(n.getFullYear(), n.getMonth(), 1).getTime();
  const active = rows.filter((r) => r.status === "active");
  const mrr = active.reduce((s, r) => s + (r.plan?.preco_cents ?? 0), 0);
  const newPaid = active.filter((r) => new Date(r.created_at).getTime() >= monthStart).length;
  const canceledMonth = rows.filter(
    (r) => r.status === "canceled" && new Date(r.updated_at ?? r.created_at).getTime() >= monthStart,
  ).length;
  const paidEver = rows.filter((r) => ["active", "past_due", "canceled"].includes(r.status)).length;
  const conversionPct = paidEver ? Math.round((active.length / paidEver) * 100) : null;
  return { mrr, active: active.length, newPaid, canceledMonth, conversionPct };
}

function esc(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with ";" separator (opens correctly in Excel pt-BR). */
export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(esc).join(";")).join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
