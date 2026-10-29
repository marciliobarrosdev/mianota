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
};

export const EMPTY_TX_FILTERS: TxFilters = {
  query: "",
  type: "all",
  category: "all",
  payment: "all",
  status: "all",
  source: "all",
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
    if (f.category !== "all" && (i.category || "Sem categoria") !== f.category) return false;
    if (f.payment !== "all" && (i.paymentMethod || "nao_informado") !== f.payment) return false;
    if (f.status !== "all" && txStatus(i, today) !== f.status) return false;
    if (f.source !== "all" && txSourceGroup(i) !== f.source) return false;
    if (!q) return true;
    return norm([i.description, i.merchant, i.category, i.note, i.account, i.card].filter(Boolean).join(" ")).includes(q);
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

/** Agrupa por dia mantendo a ordem recebida; netCents = entradas − saídas do dia. */
export function groupTxByDay<T extends TxLike>(items: T[]) {
  const groups: { date: string; items: T[]; netCents: number }[] = [];
  const idx = new Map<string, number>();
  for (const i of items) {
    let g = idx.get(i.date);
    if (g === undefined) { g = groups.length; idx.set(i.date, g); groups.push({ date: i.date, items: [], netCents: 0 }); }
    groups[g].items.push(i);
    groups[g].netCents += i.type === "receita" ? i.amountCents : -i.amountCents;
  }
  return groups;
}

const csvCell = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV com ponto e vírgula e valor em reais com vírgula (abre direto no Excel em português). */
export function txToCsv(items: TxLike[], today: string): string {
  const head = ["Data", "Tipo", "Descrição", "Estabelecimento", "Categoria", "Forma", "Situação", "Valor"];
  const rows = items.map((i) => [
    i.date.split("-").reverse().join("/"),
    i.type === "receita" ? "Entrada" : "Saída",
    i.description,
    i.merchant || "",
    i.category || "Sem categoria",
    i.paymentMethod || "",
    txStatus(i, today),
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
