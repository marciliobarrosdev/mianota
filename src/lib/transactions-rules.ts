/** Regras puras do extrato (Movimentações): filtros, ordenação, agrupamento, totais e CSV. */
import type { CategoryRule } from "./assistant-profile-rules";
import { MAX_CATEGORY_RULES } from "./assistant-profile-rules";

export type TxLike = {
  id: string;
  date: string;
  type: "receita" | "despesa";
  description: string;
  merchant: string | null;
  category: string | null;
  amountCents: number;
  paymentMethod: string | null;
  source: string;
  hasAttachment: boolean;
  status: string;
  dueDate: string | null;
  note?: string | null;
  account?: string | null;
  card?: string | null;
  tags?: string[];
  splits?: { categoryId: string | null; category: string | null; color?: string | null; amountCents: number }[];
};

export type TxStatusFilter = "all" | "pago" | "pendente" | "vencido";
export type TxSourceFilter = "all" | "whatsapp" | "ia" | "manual" | "foto" | "outros";
export type TxSort = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "category";

export type TxFilters = {
  query: string;
  type: "all" | "receita" | "despesa";
  category: string;
  payment: string;
  status: TxStatusFilter;
  source: TxSourceFilter;
  tag: string;
};

export const EMPTY_TX_FILTERS: TxFilters = {
  query: "",
  type: "all",
  category: "all",
  payment: "all",
  status: "all",
  source: "all",
  tag: "all",
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Situação efetiva: pago, vencido (pendente com vencimento antes de hoje) ou pendente. */
export function txStatus(item: Pick<TxLike, "status" | "dueDate" | "date">, today: string): "pago" | "pendente" | "vencido" {
  if (item.status === "pago") return "pago";
  if (item.status === "atrasado") return "vencido";
  return (item.dueDate || item.date) < today ? "vencido" : "pendente";
}

export function txSourceGroup(item: Pick<TxLike, "source" | "hasAttachment">): Exclude<TxSourceFilter, "all"> {
  if (item.hasAttachment) return "foto";
  if (item.source === "whatsapp") return "whatsapp";
  if (item.source === "ia") return "ia";
  if (item.source === "manual") return "manual";
  return "outros";
}

export function filterTx<T extends TxLike>(items: T[], f: TxFilters, today: string): T[] {
  const q = norm(f.query.trim());
  return items.filter((i) => {
    if (f.type !== "all" && i.type !== f.type) return false;
    if (f.category !== "all" && !txCategoryNames(i).includes(f.category)) return false;
    if (f.tag !== "all" && !(i.tags || []).includes(f.tag)) return false;
    if (f.payment !== "all" && (i.paymentMethod || "nao_informado") !== f.payment) return false;
    if (f.status !== "all" && txStatus(i, today) !== f.status) return false;
    if (f.source !== "all" && txSourceGroup(i) !== f.source) return false;
    if (!q) return true;
    return norm([i.description, i.merchant, i.category, i.note, i.account, i.card, ...(i.tags || []).map((t) => `#${t}`)].filter(Boolean).join(" ")).includes(q);
  });
}

export function sortTx<T extends TxLike>(items: T[], sort: TxSort): T[] {
  const out = [...items];
  const byDate = (a: T, b: T) => a.date.localeCompare(b.date);
  if (sort === "date_asc") out.sort(byDate);
  else if (sort === "amount_desc") out.sort((a, b) => b.amountCents - a.amountCents);
  else if (sort === "amount_asc") out.sort((a, b) => a.amountCents - b.amountCents);
  else if (sort === "category") out.sort((a, b) => (a.category || "~").localeCompare(b.category || "~", "pt-BR") || byDate(b, a));
  else out.sort((a, b) => byDate(b, a));
  return out;
}

/** Totais: entradas/saídas pagas, saldo (entradas − saídas) e pendentes (não pagos, ambos os tipos). */
export function txTotals(items: TxLike[]) {
  let income = 0, expense = 0, pending = 0, pendingCount = 0;
  for (const i of items) {
    if (i.type === "receita") income += i.amountCents;
    else expense += i.amountCents;
    if (i.status !== "pago") { pending += i.amountCents; pendingCount++; }
  }
  return { incomeCents: income, expenseCents: expense, balanceCents: income - expense, pendingCents: pending, pendingCount };
}

/**
 * Agrupa por dia mantendo a ordem recebida.
 * netCents = resultado do dia (entradas − saídas só daquele dia);
 * runningCents = saldo acumulado do período até o fim daquele dia (ordem cronológica).
 */
export function groupTxByDay<T extends TxLike>(items: T[]) {
  const groups: { date: string; items: T[]; netCents: number; runningCents: number }[] = [];
  const idx = new Map<string, number>();
  for (const i of items) {
    let g = idx.get(i.date);
    if (g === undefined) { g = groups.length; idx.set(i.date, g); groups.push({ date: i.date, items: [], netCents: 0, runningCents: 0 }); }
    groups[g].items.push(i);
    groups[g].netCents += i.type === "receita" ? i.amountCents : -i.amountCents;
  }
  let run = 0;
  for (const g of [...groups].sort((a, b) => a.date.localeCompare(b.date))) {
    run += g.netCents;
    g.runningCents = run;
  }
  return groups;
}

/** Nomes de categoria de um lançamento (as partes, quando dividido). */
export function txCategoryNames(i: Pick<TxLike, "category" | "splits">): string[] {
  if (i.splits && i.splits.length) return i.splits.map((s) => s.category || "Sem categoria");
  return [i.category || "Sem categoria"];
}

/** Despesas por categoria, contando cada parte de um lançamento dividido na sua categoria. */
export function expensesByCategory(items: TxLike[]) {
  const map = new Map<string, number>();
  for (const i of items) {
    if (i.type !== "despesa") continue;
    const parts = i.splits && i.splits.length ? i.splits.map((s) => [s.category || "Sem categoria", s.amountCents] as const) : [[i.category || "Sem categoria", i.amountCents] as const];
    for (const [k, v] of parts) map.set(k, (map.get(k) || 0) + v);
  }
  return [...map.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents);
}

/** Entradas e saídas por dia (ordem cronológica). */
export function dailyFlow(items: TxLike[]) {
  const map = new Map<string, { date: string; incomeCents: number; expenseCents: number }>();
  for (const i of items) {
    const d = map.get(i.date) || { date: i.date, incomeCents: 0, expenseCents: 0 };
    if (i.type === "receita") d.incomeCents += i.amountCents;
    else d.expenseCents += i.amountCents;
    map.set(i.date, d);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Partes válidas: 2 a 10, cada uma > 0 e a soma igual ao total. */
export function validateSplits(totalCents: number, parts: { amountCents: number }[]): string | null {
  if (parts.length < 2) return "Divida em pelo menos 2 partes.";
  if (parts.length > 10) return "No máximo 10 partes.";
  if (parts.some((p) => !Number.isInteger(p.amountCents) || p.amountCents <= 0)) return "Cada parte precisa de um valor maior que zero.";
  const sum = parts.reduce((a, p) => a + p.amountCents, 0);
  if (sum !== totalCents) return `A soma das partes precisa ser igual ao total (faltam ${((totalCents - sum) / 100).toFixed(2).replace(".", ",")}).`;
  return null;
}

/** Normaliza tags: minúsculas, sem #, sem espaços nas pontas, únicas, até 10 com 30 caracteres. */
export function normalizeTags(raw: string[] | string): string[] {
  const list = Array.isArray(raw) ? raw : raw.split(/[,;\s]+/);
  const out: string[] = [];
  for (const t of list) {
    const k = t.trim().replace(/^#+/, "").toLowerCase().replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 30);
    if (k && !out.includes(k)) out.push(k);
  }
  return out.slice(0, 10);
}

const csvCell = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV com ponto e vírgula e valor em reais com vírgula (abre direto no Excel em português). */
export function txToCsv(items: TxLike[], today: string): string {
  const head = ["Data", "Tipo", "Descrição", "Estabelecimento", "Categoria", "Forma", "Situação", "Tags", "Valor"];
  const rows = items.map((i) => [
    i.date.split("-").reverse().join("/"),
    i.type === "receita" ? "Entrada" : "Saída",
    i.description,
    i.merchant || "",
    i.splits && i.splits.length ? i.splits.map((p) => `${p.category || "Sem categoria"} ${(p.amountCents / 100).toFixed(2).replace(".", ",")}`).join(" + ") : i.category || "Sem categoria",
    i.paymentMethod || "",
    txStatus(i, today),
    (i.tags || []).map((t) => `#${t}`).join(" "),
    `${i.type === "receita" ? "" : "-"}${(i.amountCents / 100).toFixed(2).replace(".", ",")}`,
  ]);
  return "\uFEFF" + [head, ...rows].map((r) => r.map(csvCell).join(";")).join("\n");
}

/** A MIA aprende: estabelecimento → categoria (substitui a mesma palavra, limite do perfil). */
export function learnCategoryRule(rules: CategoryRule[], keyword: string, categoryId: string): CategoryRule[] {
  const k = norm(keyword.trim()).slice(0, 60);
  if (k.length < 3) return rules;
  const rest = rules.filter((r) => norm(r.keyword) !== k);
  return [{ keyword: k, categoryId }, ...rest].slice(0, MAX_CATEGORY_RULES);
}
