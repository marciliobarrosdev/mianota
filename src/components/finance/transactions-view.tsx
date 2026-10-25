import { Fragment, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Paperclip,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FinanceTransactionDetail } from "@/lib/finance-dashboard.functions";
import {
  PAYMENT_METHOD_LABELS,
  sourceLabel,
  statusLabel,
  toIsoDate,
  type FinancePeriod,
} from "@/lib/finance-period";
import { PeriodFilter } from "./period-filter";
import { money } from "./finance-overview";

type Filters = {
  query: string;
  type: "all" | "receita" | "despesa";
  category: string;
  payment: string;
};

export function filterTransactions(items: FinanceTransactionDetail[], filters: Filters) {
  const q = filters.query
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return items.filter((item) => {
    if (filters.type !== "all" && item.type !== filters.type) return false;
    if (filters.category !== "all" && (item.category || "Sem categoria") !== filters.category)
      return false;
    if (filters.payment !== "all" && (item.paymentMethod || "nao_informado") !== filters.payment)
      return false;
    if (!q) return true;
    const haystack = [
      item.description,
      item.merchant,
      item.category,
      item.note,
      item.account,
      item.card,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return haystack.includes(q);
  });
}

const STATUS_STYLES: Record<string, string> = {
  Pago: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Recebido: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  Previsto: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  Vencido: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
};

/** Extrato detalhado — compartilhado entre o painel real e a demonstração. */
export function TransactionsView({
  items,
  period,
  onPeriodChange,
  loading,
  emptyState,
}: {
  items: FinanceTransactionDetail[];
  period: FinancePeriod;
  onPeriodChange: (period: FinancePeriod) => void;
  loading?: boolean;
  emptyState?: ReactNode;
}) {
  const [filters, setFilters] = useState<Filters>({
    query: "",
    type: "all",
    category: "all",
    payment: "all",
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const today = toIsoDate(new Date());
  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category || "Sem categoria"))).sort(),
    [items],
  );
  const payments = useMemo(
    () => Array.from(new Set(items.map((i) => i.paymentMethod || "nao_informado"))),
    [items],
  );
  const visible = useMemo(() => filterTransactions(items, filters), [items, filters]);
  const totals = useMemo(
    () =>
      visible.reduce(
        (acc, item) => {
          if (item.type === "receita") acc.income += item.amountCents;
          else acc.expense += item.amountCents;
          return acc;
        },
        { income: 0, expense: 0 },
      ),
    [visible],
  );
  const set = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));

  return (
    <section
      className={`rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] ${loading ? "opacity-60" : ""}`}
    >
      <div className="space-y-3 border-b border-border p-3 sm:p-4">
        <PeriodFilter value={period} onChange={onPeriodChange} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.query}
              onChange={(e) => set({ query: e.target.value })}
              placeholder="Buscar descrição, estabelecimento ou observação"
              aria-label="Buscar movimentação"
              className="h-9 rounded-lg pl-9"
            />
          </div>
          <Select value={filters.type} onValueChange={(v) => set({ type: v as Filters["type"] })}>
            <SelectTrigger className="h-9 rounded-lg" aria-label="Tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Entradas e saídas</SelectItem>
              <SelectItem value="receita">Só entradas</SelectItem>
              <SelectItem value="despesa">Só saídas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.category} onValueChange={(v) => set({ category: v })}>
            <SelectTrigger className="h-9 rounded-lg" aria-label="Categoria">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.payment} onValueChange={(v) => set({ payment: v })}>
            <SelectTrigger className="h-9 rounded-lg" aria-label="Forma de pagamento">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as formas</SelectItem>
              {payments.map((p) => (
                <SelectItem key={p} value={p}>
                  {p === "nao_informado" ? "Não informada" : PAYMENT_METHOD_LABELS[p] || p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <SlidersHorizontal className="size-3" /> {visible.length} de {items.length}{" "}
            movimentações
          </span>
          <span>
            Entrou{" "}
            <strong className="text-emerald-700 dark:text-emerald-400">
              {money(totals.income)}
            </strong>
          </span>
          <span>
            Saiu{" "}
            <strong className="text-rose-700 dark:text-rose-400">{money(totals.expense)}</strong>
          </span>
        </div>
      </div>

      {!items.length ? (
        <div className="p-4">{emptyState}</div>
      ) : !visible.length ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma movimentação corresponde aos filtros.
        </div>
      ) : (
        <>
          {/* Celular: cards */}
          <div className="divide-y divide-border md:hidden">
            {visible.map((item) => (
              <article key={item.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(openId === item.id ? null : item.id)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left"
                  aria-expanded={openId === item.id}
                >
                  <TypeIcon type={item.type} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{item.description}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {formatDate(item.date)}
                      {item.time ? ` · ${item.time}` : ""} · {item.category || "Sem categoria"}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <StatusPill
                        label={statusLabel(
                          item.type,
                          item.status,
                          item.dueDate || item.date,
                          today,
                        )}
                      />
                      {item.paymentMethod && (
                        <Chip>
                          {PAYMENT_METHOD_LABELS[item.paymentMethod] || item.paymentMethod}
                        </Chip>
                      )}
                    </div>
                  </div>
                  <Amount item={item} />
                </button>
                {openId === item.id && <Details item={item} today={today} />}
              </article>
            ))}
          </div>

          {/* Desktop: tabela expansível */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">
                  <th className="px-4 py-2.5">Data</th>
                  <th className="px-2 py-2.5">Descrição</th>
                  <th className="px-2 py-2.5">Categoria</th>
                  <th className="px-2 py-2.5">Pagamento</th>
                  <th className="px-2 py-2.5">Origem</th>
                  <th className="px-2 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Valor</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const open = openId === item.id;
                  return (
                    <Fragment key={item.id}>
                      <tr
                        onClick={() => setOpenId(open ? null : item.id)}
                        className={`cursor-pointer border-b border-border transition hover:bg-muted/40 ${open ? "bg-muted/40" : ""}`}
                      >
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <div className="font-semibold">{formatDate(item.date)}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.time || "—"}
                          </div>
                        </td>
                        <td className="max-w-[260px] px-2 py-2.5">
                          <div className="flex items-center gap-2">
                            <TypeIcon type={item.type} small />
                            <div className="min-w-0">
                              <div className="truncate font-bold">{item.description}</div>
                              {item.merchant && item.merchant !== item.description && (
                                <div className="truncate text-[11px] text-muted-foreground">
                                  {item.merchant}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <i
                              className="size-2 rounded-full"
                              style={{ background: item.categoryColor || "#94A3B8" }}
                            />
                            {item.category || "Sem categoria"}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-xs">
                          {item.paymentMethod
                            ? PAYMENT_METHOD_LABELS[item.paymentMethod] || item.paymentMethod
                            : "—"}
                          {(item.card || item.account) && (
                            <div className="truncate text-[11px] text-muted-foreground">
                              {item.card || item.account}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-xs">
                          <span className="inline-flex items-center gap-1">
                            {item.hasAttachment && <Paperclip className="size-3" />}
                            {sourceLabel(item.source, item.hasAttachment)}
                          </span>
                        </td>
                        <td className="px-2 py-2.5">
                          <StatusPill
                            label={statusLabel(
                              item.type,
                              item.status,
                              item.dueDate || item.date,
                              today,
                            )}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <Amount item={item} />
                        </td>
                        <td className="pr-3">
                          <ChevronDown
                            className={`size-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
                          />
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-border bg-muted/20">
                          <td colSpan={8}>
                            <Details item={item} today={today} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TypeIcon({ type, small }: { type: "receita" | "despesa"; small?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-lg ${small ? "size-7" : "size-9"} ${type === "receita" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"}`}
      aria-label={type === "receita" ? "Entrada" : "Saída"}
    >
      {type === "receita" ? (
        <ArrowDownLeft className="size-3.5" />
      ) : (
        <ArrowUpRight className="size-3.5" />
      )}
    </span>
  );
}

function Amount({ item }: { item: FinanceTransactionDetail }) {
  return (
    <strong
      className={`tabular-nums ${item.type === "receita" ? "text-emerald-700 dark:text-emerald-400" : ""}`}
    >
      {item.type === "receita" ? "+" : "−"} {money(item.amountCents)}
    </strong>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${STATUS_STYLES[label] || STATUS_STYLES.Previsto}`}
    >
      {label}
    </span>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
      {children}
    </span>
  );
}

function Details({ item, today }: { item: FinanceTransactionDetail; today: string }) {
  const rows: Array<[string, string]> = [
    ["Data", formatDate(item.date)],
    ["Hora", item.time || "Não informada"],
    ["Tipo", item.type === "receita" ? "Entrada" : "Saída"],
    ["Descrição", item.description],
    ["Estabelecimento", item.merchant || "Não informado"],
    ["Categoria", item.category || "Sem categoria"],
    ["Valor", money(item.amountCents)],
    [
      "Forma de pagamento",
      item.paymentMethod
        ? PAYMENT_METHOD_LABELS[item.paymentMethod] || item.paymentMethod
        : "Não informada",
    ],
    ["Conta / carteira / cartão", item.card || item.account || "Não informado"],
    ["Origem", sourceLabel(item.source, item.hasAttachment)],
    ["Status", statusLabel(item.type, item.status, item.dueDate || item.date, today)],
  ];
  if (item.dueDate) rows.push(["Vencimento", formatDate(item.dueDate)]);
  if (item.paidAt)
    rows.push([item.type === "receita" ? "Recebido em" : "Pago em", formatDate(item.paidAt)]);
  if (item.installment) rows.push(["Parcela", item.installment]);
  return (
    <div className="px-3 pb-3 md:px-4 md:py-3">
      <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-border bg-card p-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-0.5 truncate font-semibold">{value}</dd>
          </div>
        ))}
        <div className="min-w-0 sm:col-span-2 lg:col-span-3">
          <dt className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">
            Observação
          </dt>
          <dd className="mt-0.5 whitespace-pre-wrap font-semibold">
            {item.note || "Sem observação"}
          </dd>
        </div>
        {item.originalInput && (
          <div className="min-w-0 sm:col-span-2 lg:col-span-3">
            <dt className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">
              Como foi registrado
            </dt>
            <dd className="mt-0.5 italic text-muted-foreground">“{item.originalInput}”</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
