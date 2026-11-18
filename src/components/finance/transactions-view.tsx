/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown, Clock, FileDown, FileText, Paperclip, Search, Split, Tag, Upload, Trash2, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinanceTransactionDetail } from "@/lib/finance/finance-dashboard.functions";
import { PAYMENT_METHOD_LABELS, sourceLabel, statusLabel, toIsoDate, type FinancePeriod } from "@/lib/finance/finance-period";
import { EMPTY_TX_FILTERS, filterTx, groupTxByDay, sortTx, txToCsv, txTotals, type TxFilters, type TxSort } from "@/lib/finance/transactions-rules";
import { PeriodFilter } from "./period-filter";
import { money } from "./finance-overview";
import { ExpenseCharts, SplitDialog, TagInput } from "./transactions-extras";
import { formatTxDate, formatTxDayHeader } from "@/lib/finance/transactions-rules";
import { SORTS, STATUS_CHIPS, SOURCE_CHIPS } from "./transactions/tx-constants";
import { SummaryCard, FilterChip, TypeIcon, Amount, StatusPill, Details } from "./transactions/tx-parts";
import { EditDialog } from "./transactions/edit-dialog";

/** Compatibilidade com chamadas antigas. */
export function filterTransactions(items: FinanceTransactionDetail[], f: Partial<TxFilters>) {
  return filterTx(items, { ...EMPTY_TX_FILTERS, ...f }, toIsoDate(new Date()));
}

export type TxEditPatch = {
  description: string;
  merchant: string | null;
  amountCents: number;
  date: string;
  categoryId: string | null;
  paymentMethod: string | null;
  note: string | null;
  tags: string[];
  learn: boolean;
};
export type TxSingleAction = "pay" | "unpay" | "delete" | "duplicate";
export type TxBulkAction = "pay" | "delete" | "category" | "tag";

export type TransactionsActions = {
  categories: { id: string; name: string; type: string }[];
  budgets?: { categoryId: string; limitCents: number; spentCents: number; percentage: number }[];
  onAction: (item: FinanceTransactionDetail, action: TxSingleAction) => Promise<void> | void;
  onEdit: (item: FinanceTransactionDetail, patch: TxEditPatch) => Promise<void> | void;
  onBulk: (ids: string[], action: TxBulkAction, categoryId?: string | null, tags?: string[]) => Promise<void> | void;
  onSplit?: (item: FinanceTransactionDetail, parts: { categoryId: string | null; amountCents: number }[]) => Promise<void> | void;
  onImport?: () => void;
  onExportPdf?: () => Promise<void> | void;
};
/** Extrato detalhado do assinante. */
export function TransactionsView({
  items,
  period,
  onPeriodChange,
  loading,
  emptyState,
  actions,
  summary,
}: {
  items: FinanceTransactionDetail[];
  period: FinancePeriod;
  onPeriodChange: (period: FinancePeriod) => void;
  loading?: boolean;
  emptyState?: ReactNode;
  actions?: TransactionsActions;
  summary?: import("@/lib/finance/summary-cards-rules").FinanceSummaryCards | null;
}) {
  const [filters, setFilters] = useState<TxFilters>(EMPTY_TX_FILTERS);
  const [sort, setSort] = useState<TxSort>("date_desc");
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<FinanceTransactionDetail | null>(null);
  const [splitting, setSplitting] = useState<FinanceTransactionDetail | null>(null);
  const [bulkTags, setBulkTags] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const today = toIsoDate(new Date());

  const categories = useMemo(() => Array.from(new Set(items.flatMap((i) => (i.splits?.length ? i.splits.map((p) => p.category || "Sem categoria") : [i.category || "Sem categoria"])))).sort(), [items]);
  const allTags = useMemo(() => Array.from(new Set(items.flatMap((i) => i.tags || []))).sort(), [items]);
  const payments = useMemo(() => Array.from(new Set(items.map((i) => i.paymentMethod || "nao_informado"))), [items]);
  const visible = useMemo(() => sortTx(filterTx(items, filters, today), sort), [items, filters, sort, today]);
  const listTotals = useMemo(() => txTotals(visible), [visible]);
  const totals = summary
    ? { incomeCents: summary.receivedMtdCents, expenseCents: summary.spentMtdCents, balanceCents: summary.last30BalanceCents, pendingCents: summary.overdueOpenCents, pendingCount: summary.overdueOpenCount }
    : listTotals;
  const groups = useMemo(() => (sort.startsWith("date") ? groupTxByDay(visible) : [{ date: "", items: visible, netCents: 0, runningCents: 0 }]), [visible, sort]);
  const set = (patch: Partial<TxFilters>) => setFilters((c) => ({ ...c, ...patch }));
  const active = (Object.keys(EMPTY_TX_FILTERS) as (keyof TxFilters)[]).filter((k) => filters[k] !== EMPTY_TX_FILTERS[k]);

  useEffect(() => {
    const ids = new Set(items.map((i) => i.id));
    setSelected((s) => new Set([...s].filter((id) => ids.has(id))));
  }, [items]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allSelected = visible.length > 0 && visible.every((i) => selected.has(i.id));

  const run = async (fn: () => Promise<void> | void) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const blob = new Blob([txToCsv(visible, today)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `movimentacoes-${period.from}_${period.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const chipLabel = (k: keyof TxFilters) => {
    const v = filters[k];
    if (k === "query") return `“${v}”`;
    if (k === "type") return v === "receita" ? "Só entradas" : "Só saídas";
    if (k === "payment") return v === "nao_informado" ? "Forma não informada" : PAYMENT_METHOD_LABELS[v] || v;
    if (k === "status") return STATUS_CHIPS.find((s) => s.key === v)?.label || v;
    if (k === "source") return SOURCE_CHIPS.find((s) => s.key === v)?.label || v;
    if (k === "tag") return `#${v}`;
    return v;
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <SummaryCard icon={<ArrowDownLeft className="size-4" />} label="Entradas" value={money(totals.incomeCents)} tone="text-emerald-700 dark:text-emerald-400" onClick={() => set({ type: filters.type === "receita" ? "all" : "receita" })} active={filters.type === "receita"} />
        <SummaryCard icon={<ArrowUpRight className="size-4" />} label="Saídas" value={money(totals.expenseCents)} tone="text-rose-700 dark:text-rose-400" onClick={() => set({ type: filters.type === "despesa" ? "all" : "despesa" })} active={filters.type === "despesa"} />
        <SummaryCard icon={<Wallet className="size-4" />} label={summary ? "Saldo dos últimos 30 dias" : "Saldo do período"} value={money(totals.balanceCents)} tone={totals.balanceCents >= 0 ? "text-[color:var(--brand-text)]" : "text-rose-700 dark:text-rose-400"} />
        <SummaryCard icon={<Clock className="size-4" />} label="Pendentes" value={money(totals.pendingCents)} tone={totals.pendingCount ? "text-amber-700 dark:text-amber-400" : ""} onClick={() => set({ status: filters.status === "pendente" ? "all" : "pendente" })} active={filters.status === "pendente"} />
      </div>

      <ExpenseCharts items={visible} activeCategory={filters.category} onPickCategory={(name) => set({ category: filters.category === name ? "all" : name })} />

      <section className={`rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] ${loading ? "opacity-60" : ""}`}>
        <div className="space-y-3 border-b border-border p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PeriodFilter value={period} onChange={onPeriodChange} />
            <div className="flex flex-wrap gap-1.5">
              {actions?.onImport && (
                <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={actions.onImport}>
                  <Upload /> Importar extrato
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={exportCsv} disabled={!visible.length}>
                <FileDown /> CSV
              </Button>
              {actions?.onExportPdf && (
                <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => run(actions.onExportPdf!)} disabled={busy}>
                  <FileText /> PDF
                </Button>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={filters.query} onChange={(e) => set({ query: e.target.value })} placeholder="Buscar descrição, estabelecimento ou observação" aria-label="Buscar movimentação" className="h-9 rounded-lg pl-9" />
            </div>
            <Select value={filters.type} onValueChange={(v) => set({ type: v as TxFilters["type"] })}>
              <SelectTrigger className="h-9 rounded-lg" aria-label="Tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Entradas e saídas</SelectItem>
                <SelectItem value="receita">Só entradas</SelectItem>
                <SelectItem value="despesa">Só saídas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.category} onValueChange={(v) => set({ category: v })}>
              <SelectTrigger className="h-9 rounded-lg" aria-label="Categoria"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.payment} onValueChange={(v) => set({ payment: v })}>
              <SelectTrigger className="h-9 rounded-lg" aria-label="Forma de pagamento"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as formas</SelectItem>
                {payments.map((p) => (
                  <SelectItem key={p} value={p}>{p === "nao_informado" ? "Não informada" : PAYMENT_METHOD_LABELS[p] || p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as TxSort)}>
              <SelectTrigger className="h-9 rounded-lg" aria-label="Ordenar"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_CHIPS.map((s) => (
              <FilterChip key={s.key} active={filters.status === s.key} onClick={() => set({ status: s.key })}>{s.label}</FilterChip>
            ))}
            <span className="mx-1 h-4 w-px bg-border" />
            {SOURCE_CHIPS.map((s) => (
              <FilterChip key={s.key} active={filters.source === s.key} onClick={() => set({ source: s.key })}>{s.label}</FilterChip>
            ))}
            {allTags.length > 0 && (
              <>
                <span className="mx-1 h-4 w-px bg-border" />
                <Tag className="size-3.5 text-muted-foreground" />
                {allTags.map((t) => (
                  <FilterChip key={t} active={filters.tag === t} onClick={() => set({ tag: filters.tag === t ? "all" : t })}>#{t}</FilterChip>
                ))}
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{visible.length} de {items.length} movimentações</span>
            {active.map((k) => (
              <button key={k} type="button" onClick={() => set({ [k]: EMPTY_TX_FILTERS[k] } as Partial<TxFilters>)} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-bold text-foreground">
                {chipLabel(k)} <X className="size-3" />
              </button>
            ))}
            {active.length > 0 && (
              <button type="button" className="font-bold text-[color:var(--brand-text)] underline-offset-2 hover:underline" onClick={() => setFilters(EMPTY_TX_FILTERS)}>
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {actions && selected.size > 0 && (
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-card/95 px-3 py-2 backdrop-blur sm:px-4">
            <strong className="text-xs">{selected.size} selecionada(s)</strong>
            <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={busy} onClick={() => run(async () => { await actions.onBulk([...selected], "pay"); setSelected(new Set()); })}>
              <Check /> Marcar como pagas
            </Button>
            <Select onValueChange={(v) => run(async () => { await actions.onBulk([...selected], "category", v === "none" ? null : v); setSelected(new Set()); })}>
              <SelectTrigger className="h-8 w-auto rounded-lg text-xs" aria-label="Mudar categoria"><SelectValue placeholder="Mudar categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {actions.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={busy} onClick={() => setBulkTags([])}>
              <Tag /> Adicionar tag
            </Button>
            <Button size="sm" variant="outline" className="h-8 rounded-lg text-rose-700 dark:text-rose-400" disabled={busy} onClick={() => { if (confirm(`Excluir ${selected.size} movimentação(ões)?`)) void run(async () => { await actions.onBulk([...selected], "delete"); setSelected(new Set()); }); }}>
              <Trash2 /> Excluir
            </Button>
            <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={() => setSelected(new Set())}>Cancelar</Button>
          </div>
        )}

        {!items.length ? (
          <div className="p-4">{emptyState}</div>
        ) : !visible.length ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma movimentação corresponde aos filtros.</div>
        ) : (
          <div>
            {actions && (
              <label className="flex items-center gap-2 border-b border-border px-3 py-2 text-[11px] font-bold text-muted-foreground sm:px-4">
                <Checkbox checked={allSelected} onCheckedChange={(v) => setSelected(v ? new Set(visible.map((i) => i.id)) : new Set())} aria-label="Selecionar todas" />
                Selecionar todas
              </label>
            )}
            {groups.map((g) => (
              <div key={g.date || "all"}>
                {g.date && (
                  <div className="sticky top-0 z-[5] flex items-center justify-between border-b border-border bg-muted/70 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.1em] text-muted-foreground backdrop-blur sm:px-4">
                    <span>{formatTxDayHeader(g.date, today)}</span>
                    <span className="flex flex-wrap justify-end gap-x-3 tabular-nums normal-case tracking-normal">
                      <span className={g.netCents >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"} title="Entradas menos saídas só deste dia">
                        Resultado do dia {g.netCents >= 0 ? "+" : "−"} {money(Math.abs(g.netCents))}
                      </span>
                      <span className={g.runningCents >= 0 ? "text-foreground" : "text-rose-700 dark:text-rose-400"} title="Soma de todas as entradas e saídas do período até o fim deste dia">
                        Saldo até aqui {g.runningCents < 0 ? "−" : ""}{money(Math.abs(g.runningCents))}
                      </span>
                    </span>
                  </div>
                )}
                <ul className="divide-y divide-border">
                  {g.items.map((item) => {
                    const open = openId === item.id;
                    const label = statusLabel(item.type, item.status, item.dueDate || item.date, today);
                    return (
                      <li key={item.id} className={open ? "bg-muted/30" : ""}>
                        <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
                          {actions && <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} aria-label={`Selecionar ${item.description}`} />}
                          <button type="button" onClick={() => setOpenId(open ? null : item.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open}>
                            <TypeIcon type={item.type} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-bold">{item.description}</div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                {!g.date && <span>{formatTxDate(item.date)}</span>}
                                {item.time && <span>{item.time}</span>}
                                {item.splits?.length ? (
                                  <span className="inline-flex items-center gap-1 font-bold"><Split className="size-3" /> Dividido em {item.splits.length}</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    <i className="size-2 rounded-full" style={{ background: item.categoryColor || "var(--muted-foreground)" }} />
                                    {item.category || "Sem categoria"}
                                  </span>
                                )}
                                {(item.tags || []).slice(0, 3).map((t) => <span key={t} className="font-bold text-[color:var(--brand-text)]">#{t}</span>)}
                                {item.paymentMethod && <span className="hidden sm:inline">{PAYMENT_METHOD_LABELS[item.paymentMethod] || item.paymentMethod}</span>}
                                <span className="hidden items-center gap-1 md:inline-flex">
                                  {item.hasAttachment && <Paperclip className="size-3" />}
                                  {sourceLabel(item.source, item.hasAttachment)}
                                </span>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <Amount item={item} />
                              <StatusPill label={label} />
                            </div>
                            <ChevronDown className={`hidden size-4 shrink-0 text-muted-foreground transition sm:block ${open ? "rotate-180" : ""}`} />
                          </button>
                        </div>
                        {open && (
                          <Details
                            item={item}
                            today={today}
                            budget={actions?.budgets?.find((b) => b.categoryId === item.categoryId)}
                            busy={busy}
                            actions={actions ? {
                              act: (a) => run(() => actions.onAction(item, a)),
                              edit: () => setEditing(item),
                              split: actions.onSplit ? () => setSplitting(item) : undefined,
                            } : undefined}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {actions && editing && (
        <EditDialog
          item={editing}
          categories={actions.categories}
          tagSuggestions={allTags}
          onClose={() => setEditing(null)}
          onSave={(patch) => run(async () => { await actions.onEdit(editing, patch); setEditing(null); })}
          busy={busy}
        />
      )}
      {actions?.onSplit && splitting && (
        <SplitDialog
          item={splitting}
          categories={actions.categories}
          onClose={() => setSplitting(null)}
          onSave={(parts) => run(async () => { await actions.onSplit!(splitting, parts); setSplitting(null); })}
          busy={busy}
        />
      )}
      {actions && bulkTags && (
        <Dialog open onOpenChange={(o) => !o && setBulkTags(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar tag</DialogTitle>
              <DialogDescription>Vale para as {selected.size} movimentações selecionadas. As tags que já existem nelas são mantidas.</DialogDescription>
            </DialogHeader>
            <TagInput value={bulkTags} onChange={setBulkTags} suggestions={allTags} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setBulkTags(null)}>Cancelar</Button>
              <Button disabled={busy || !bulkTags.length} onClick={() => run(async () => { await actions.onBulk([...selected], "tag", null, bulkTags); setBulkTags(null); setSelected(new Set()); })}>Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
