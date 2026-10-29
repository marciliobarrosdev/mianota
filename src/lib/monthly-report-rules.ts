export type ReportRow = {
  tipo: "receita" | "despesa";
  status: string;
  valor_cents: number;
  categoria: string | null;
};

/** Limites do mês "AAAA-MM": primeiro dia e primeiro dia do mês seguinte. */
export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return { start, end: `${ny}-${String(nm).padStart(2, "0")}-01` };
}

/** Mês anterior ao dia informado (AAAA-MM-DD → AAAA-MM). */
export function previousMonth(today: string) {
  const [y, m] = today.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** Totais do relatório. Lançamentos cancelados ficam de fora. */
export function summarizeMonth(rows: ReportRow[]) {
  let income = 0;
  let expense = 0;
  let pending = 0;
  const byCat = new Map<string, number>();
  for (const r of rows) {
    if (r.status === "cancelado") continue;
    const v = Number(r.valor_cents || 0);
    if (r.tipo === "receita") income += v;
    else {
      expense += v;
      if (r.status === "pendente" || r.status === "atrasado") pending += v;
      const k = r.categoria || "Sem categoria";
      byCat.set(k, (byCat.get(k) || 0) + v);
    }
  }
  const categories = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, cents]) => ({ name, cents, pct: expense ? Math.round((cents / expense) * 100) : 0 }));
  return { income, expense, balance: income - expense, pending, categories };
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
};
