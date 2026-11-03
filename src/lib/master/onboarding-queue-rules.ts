export type QueueRow = {
  status: string;
  created_at: string;
  company_name?: string | null;
  buyer_name?: string | null;
  buyer_email?: string | null;
  buyer_phone_masked?: string | null;
  source?: string | null;
};

export type QueuePeriod = "all" | "today" | "7d" | "30d";
const DONE = ["paired", "cancelled"];

export function filterQueue<T extends QueueRow>(
  rows: T[],
  search: string,
  period: QueuePeriod,
  now = new Date(),
): T[] {
  const q = search.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  let since = 0;
  if (period === "today") since = new Date(now).setHours(0, 0, 0, 0);
  else if (period === "7d") since = now.getTime() - 7 * 864e5;
  else if (period === "30d") since = now.getTime() - 30 * 864e5;
  return rows.filter((r) => {
    if (since && new Date(r.created_at).getTime() < since) return false;
    if (!q) return true;
    const text = [r.company_name, r.buyer_name, r.buyer_email].join(" ").toLowerCase();
    if (text.includes(q)) return true;
    return digits.length >= 3 && (r.buyer_phone_masked ?? "").replace(/\D/g, "").includes(digits);
  });
}

/** Hours a purchase has been waiting to be linked; null once finished. */
export function waitingHours(row: QueueRow, now = new Date()): number | null {
  if (DONE.includes(row.status)) return null;
  return Math.max(0, Math.floor((now.getTime() - new Date(row.created_at).getTime()) / 36e5));
}

export function isWaitingTooLong(row: QueueRow, now = new Date()): boolean {
  const h = waitingHours(row, now);
  return h !== null && h >= 24;
}

export function queueCsv(rows: QueueRow[], label: (s: string) => string): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Nome", "E-mail", "Telefone", "Origem", "Status", "Criado em"];
  const body = rows.map((r) =>
    [
      r.company_name || r.buyer_name,
      r.buyer_email,
      r.buyer_phone_masked,
      r.source,
      label(r.status),
      new Date(r.created_at).toLocaleString("pt-BR"),
    ]
      .map(esc)
      .join(";"),
  );
  return [head.map(esc).join(";"), ...body].join("\n");
}
