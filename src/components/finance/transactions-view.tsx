import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Copy,
  FileDown,
  FileText,
  Paperclip,
  Pencil,
  Search,
  Split,
  Tag,
  Upload,
  Sparkles,
  Trash2,
  Undo2,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinanceTransactionDetail } from "@/lib/finance-dashboard.functions";
import { PAYMENT_METHOD_LABELS, sourceLabel, statusLabel, toIsoDate, type FinancePeriod } from "@/lib/finance-period";
import {
  EMPTY_TX_FILTERS,
  filterTx,
  groupTxByDay,
  sortTx,
  txStatus,
  txToCsv,
  txTotals,
  type TxFilters,
  type TxSort,
} from "@/lib/transactions-rules";
import { PeriodFilter } from "./period-filter";
import { money } from "./finance-overview";
import { ExpenseCharts, SplitDialog, TagInput } from "./transactions-extras";

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

const STATUS_STYLES: Record<string, string> = {
  Pago: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  Recebido: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  Previsto: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  Vencido: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
};

const SORTS: { key: TxSort; label: string }[] = [
  { key: "date_desc", label: "Mais recentes" },
  { key: "date_asc", label: "Mais antigas" },
  { key: "amount_desc", label: "Maior valor" },
  { key: "amount_asc", label: "Menor valor" },
  { key: "category", label: "Categoria" },
];
const STATUS_CHIPS: { key: TxFilters["status"]; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "pago", label: "Pagas" },
  { key: "pendente", label: "Pendentes" },
  { key: "vencido", label: "Vencidas" },
];
const SOURCE_CHIPS: { key: TxFilters["source"]; label: string }[] = [
  { key: "all", label: "Qualquer origem" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "ia", label: "Chat MIA" },
  { key: "manual", label: "Manual" },
  { key: "foto", label: "Foto/PDF" },
];

/** Extrato detalhado — compartilhado entre o painel real e a demonstração. */
export function TransactionsView({
  items,
  period,
  onPeriodChange,
  loading,
  emptyState,
  actions,
  basePath = "/app",
}: {
  items: FinanceTransactionDetail[];
  period: FinancePeriod;
  onPeriodChange: (period: FinancePeriod) => void;
  loading?: boolean;
  emptyState?: ReactNode;
  actions?: TransactionsActions;
  basePath?: "/app" | "/demo";
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
  const totals = useMemo(() => txTotals(visible), [visible]);
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
        <SummaryCard icon={<Wallet className="size-4" />} label="Saldo do período" value={money(totals.balanceCents)} tone={totals.balanceCents >= 0 ? "text-[color:var(--brand-text)]" : "text-rose-700 dark:text-rose-400"} />
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
                    <span>{formatDayHeader(g.date, today)}</span>
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
                                {!g.date && <span>{formatDate(item.date)}</span>}
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
                            basePath={basePath}
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

function SummaryCard({ icon, label, value, tone, onClick, active }: { icon: ReactNode; label: string; value: string; tone?: string; onClick?: () => void; active?: boolean }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-2xl border bg-card p-3 text-left shadow-[var(--shadow-card)] transition sm:p-4 ${active ? "border-[color:var(--brand-text)]" : "border-border"} ${onClick ? "hover:bg-muted/40" : ""}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-1 truncate text-lg font-extrabold tabular-nums sm:text-xl ${tone || ""}`}>{value}</div>
    </Tag>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${active ? "border-[color:var(--brand-text)] bg-muted text-[color:var(--brand-text)]" : "border-border text-muted-foreground hover:bg-muted/50"}`}
    >
      {children}
    </button>
  );
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDayHeader(iso: string, today: string) {
  const d = new Date(`${iso}T12:00:00`);
  const y = new Date(`${today}T12:00:00`);
  y.setDate(y.getDate() - 1);
  const prefix = iso === today ? "Hoje · " : iso === toIsoDate(y) ? "Ontem · " : "";
  return prefix + d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

function TypeIcon({ type }: { type: "receita" | "despesa" }) {
  return (
    <span
      className={`grid size-9 shrink-0 place-items-center rounded-lg ${type === "receita" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"}`}
      aria-label={type === "receita" ? "Entrada" : "Saída"}
    >
      {type === "receita" ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
    </span>
  );
}

function Amount({ item }: { item: FinanceTransactionDetail }) {
  return (
    <strong className={`whitespace-nowrap text-sm tabular-nums ${item.type === "receita" ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
      {item.type === "receita" ? "+" : "−"} {money(item.amountCents)}
    </strong>
  );
}

function StatusPill({ label }: { label: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${STATUS_STYLES[label] || STATUS_STYLES.Previsto}`}>{label}</span>;
}

function Details({
  item,
  today,
  basePath,
  budget,
  actions,
  busy,
}: {
  item: FinanceTransactionDetail;
  today: string;
  basePath: "/app" | "/demo";
  budget?: { limitCents: number; spentCents: number; percentage: number };
  actions?: { act: (a: TxSingleAction) => void; edit: () => void; split?: () => void };
  busy: boolean;
}) {
  const paid = item.status === "pago";
  const rows: Array<[string, string]> = [
    ["Data", formatDate(item.date)],
    ["Hora", item.time || "Não informada"],
    ["Tipo", item.type === "receita" ? "Entrada" : "Saída"],
    ["Estabelecimento", item.merchant || "Não informado"],
    ["Categoria", item.splits?.length ? item.splits.map((p) => `${p.category || "Sem categoria"} ${money(p.amountCents)}`).join(" + ") : item.category || "Sem categoria"],
    ["Tags", item.tags?.length ? item.tags.map((t) => `#${t}`).join(" ") : "Nenhuma"],
    ["Valor", money(item.amountCents)],
    ["Forma de pagamento", item.paymentMethod ? PAYMENT_METHOD_LABELS[item.paymentMethod] || item.paymentMethod : "Não informada"],
    ["Conta / carteira / cartão", item.card || item.account || "Não informado"],
    ["Origem", sourceLabel(item.source, item.hasAttachment)],
    ["Status", statusLabel(item.type, item.status, item.dueDate || item.date, today)],
  ];
  if (item.dueDate) rows.push(["Vencimento", formatDate(item.dueDate)]);
  if (item.paidAt) rows.push([item.type === "receita" ? "Recebido em" : "Pago em", formatDate(item.paidAt)]);
  if (item.installment) rows.push(["Parcela", item.installment]);
  const question = `Me explique este ${item.type === "receita" ? "recebimento" : "gasto"}: ${item.description} de ${money(item.amountCents)} em ${formatDate(item.date)} (${item.category || "sem categoria"}).`;
  const fixCategory = `Qual a melhor categoria para "${item.merchant || item.description}"? Hoje está como ${item.category || "sem categoria"}.`;
  const overdue = txStatus(item, today) === "vencido";

  return (
    <div className="space-y-2 px-3 pb-3 md:px-4">
      {actions && (
        <div className="flex flex-wrap gap-1.5">
          {!paid ? (
            <Button size="sm" className="h-8 rounded-lg" disabled={busy} onClick={() => actions.act("pay")}>
              <Check /> {item.type === "receita" ? "Marcar como recebida" : "Marcar como paga"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={busy} onClick={() => actions.act("unpay")}>
              <Undo2 /> Voltar para pendente
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={busy} onClick={actions.edit}><Pencil /> Editar</Button>
          {actions.split && <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={busy} onClick={actions.split}><Split /> {item.splits?.length ? "Ajustar divisão" : "Dividir em categorias"}</Button>}
          <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={busy} onClick={() => actions.act("duplicate")}><Copy /> Duplicar</Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg text-rose-700 dark:text-rose-400" disabled={busy} onClick={() => actions.act("delete")}><Trash2 /> Excluir</Button>
        </div>
      )}
      {overdue && <p className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">Esta conta está vencida. Marque como paga para atualizar os avisos.</p>}
      {budget && item.type === "despesa" && (
        <div className="rounded-xl border border-border bg-card p-2.5 text-xs">
          <div className="flex justify-between font-bold">
            <span>Orçamento de {item.category}</span>
            <span className={budget.percentage >= 100 ? "text-rose-700 dark:text-rose-400" : budget.percentage >= 80 ? "text-amber-700 dark:text-amber-400" : ""}>{budget.percentage}% do limite</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${budget.percentage >= 100 ? "bg-rose-500" : budget.percentage >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, budget.percentage)}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">{money(budget.spentCents)} de {money(budget.limitCents)} no mês</div>
        </div>
      )}
      <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-border bg-card p-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 truncate font-semibold">{value}</dd>
          </div>
        ))}
        <div className="min-w-0 sm:col-span-2 lg:col-span-3">
          <dt className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Observação</dt>
          <dd className="mt-0.5 whitespace-pre-wrap font-semibold">{item.note || "Sem observação"}</dd>
        </div>
        {item.originalInput && (
          <div className="min-w-0 sm:col-span-2 lg:col-span-3">
            <dt className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Como foi registrado</dt>
            <dd className="mt-0.5 italic text-muted-foreground">“{item.originalInput}”</dd>
          </div>
        )}
        {item.hasAttachment && (
          <div className="min-w-0 sm:col-span-2 lg:col-span-3">
            <dt className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Comprovante</dt>
            <dd className="mt-1">
              {item.attachmentUrl ? (
                /\.(png|jpe?g|webp|gif)(\?|$)/i.test(item.attachmentUrl) ? (
                  <a href={item.attachmentUrl} target="_blank" rel="noreferrer"><img src={item.attachmentUrl} alt="Comprovante" className="max-h-48 rounded-lg border border-border" /></a>
                ) : (
                  <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-[color:var(--brand-text)] hover:underline"><Paperclip className="size-3" /> Abrir comprovante</a>
                )
              ) : (
                <span className="text-muted-foreground">Recebido pela MIA (o arquivo original não fica guardado).</span>
              )}
            </dd>
          </div>
        )}
      </dl>
      <div className="flex flex-wrap gap-1.5">
        <Button asChild size="sm" variant="ghost" className="h-8 rounded-lg">
          <Link to={basePath === "/app" ? "/app/planejamento" : "/demo/planejamento"}><CalendarDays /> Ver no calendário</Link>
        </Button>
        {basePath === "/app" && (
          <>
            <Button asChild size="sm" variant="ghost" className="h-8 rounded-lg">
              <Link to="/app/marcia" search={{ pergunta: question }}><Sparkles /> Perguntar à MIA</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8 rounded-lg">
              <Link to="/app/marcia" search={{ pergunta: fixCategory }}><Sparkles /> Corrigir categoria com a MIA</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function EditDialog({
  item,
  categories,
  tagSuggestions,
  onClose,
  onSave,
  busy,
}: {
  item: FinanceTransactionDetail;
  categories: { id: string; name: string; type: string }[];
  tagSuggestions: string[];
  onClose: () => void;
  onSave: (patch: TxEditPatch) => void;
  busy: boolean;
}) {
  const [description, setDescription] = useState(item.description);
  const [merchant, setMerchant] = useState(item.merchant || "");
  const [amountCents, setAmountCents] = useState<number | null>(item.amountCents);
  const [date, setDate] = useState(item.date);
  const [categoryId, setCategoryId] = useState(item.categoryId || "none");
  const [paymentMethod, setPaymentMethod] = useState(item.paymentMethod || "none");
  const [note, setNote] = useState(item.note || "");
  const [learn, setLearn] = useState(true);
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const split = Boolean(item.splits?.length);
  const options = categories.filter((c) => c.type === item.type || !c.type);
  const categoryChanged = (categoryId === "none" ? null : categoryId) !== (item.categoryId || null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!amountCents || !description.trim()) return;
    onSave({
      description: description.trim(),
      merchant: merchant.trim() || null,
      amountCents,
      date,
      categoryId: categoryId === "none" ? null : categoryId,
      paymentMethod: paymentMethod === "none" ? null : paymentMethod,
      note: note.trim() || null,
      tags,
      learn: learn && categoryChanged,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar movimentação</DialogTitle>
          <DialogDescription>As mudanças aparecem também no calendário e nos avisos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={240} />
            </div>
            <div className="space-y-1">
              <Label>Estabelecimento</Label>
              <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Opcional" maxLength={160} />
            </div>
            <div className="space-y-1">
              <Label>Valor</Label>
              <MoneyInput aria-label="Valor" cents={amountCents} onChange={setAmountCents} required allowZero={false} disabled={split} />
              {split && <p className="text-[10px] text-muted-foreground">Dividido: ajuste a divisão para mudar o valor.</p>}
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informada</SelectItem>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {options.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {categoryChanged && categoryId !== "none" && (
                <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={learn} onCheckedChange={(v) => setLearn(Boolean(v))} />
                  Ensinar a MIA a usar esta categoria para “{merchant || description}”
                </label>
              )}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Tags</Label>
              <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Observação</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Opcional" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={busy || !amountCents}>Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
