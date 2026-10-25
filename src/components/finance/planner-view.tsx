import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FinancePlannerItem } from "@/lib/finance-dashboard.functions";
import {
  PAYMENT_METHOD_LABELS,
  financeDayStatus,
  sourceLabel,
  summarizeFinanceDay,
  toIsoDate,
  type FinanceDayStatus,
} from "@/lib/finance-period";
import { money } from "./finance-overview";

const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const STATUS_META: Record<FinanceDayStatus, { label: string; dot: string; pill: string }> = {
  pago: {
    label: "Pago",
    dot: "bg-slate-500",
    pill: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  recebido: {
    label: "Recebido",
    dot: "bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  previsto: {
    label: "Previsto",
    dot: "bg-amber-500",
    pill: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  },
  vencido: {
    label: "Vencido",
    dot: "bg-rose-500",
    pill: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  },
};

export function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { iso: toIsoDate(d), day: d.getDate(), inMonth: d.getMonth() === month.getMonth() };
  });
}

/** Planejamento e calendário — compartilhado entre o painel real e a demonstração. */
export function PlannerView({
  items,
  month,
  onMonthChange,
  loading,
  renderDayComposer,
  aside,
}: {
  items: FinancePlannerItem[];
  month: Date;
  onMonthChange: (month: Date) => void;
  loading?: boolean;
  /** Área para adicionar lembrete/conta no dia escolhido (chat com a MárcIA). */
  renderDayComposer?: (date: string) => ReactNode;
  aside?: ReactNode;
}) {
  const today = toIsoDate(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const grid = useMemo(() => monthGrid(month), [month]);
  const byDay = useMemo(() => {
    const map = new Map<string, FinancePlannerItem[]>();
    for (const item of items) map.set(item.date, [...(map.get(item.date) || []), item]);
    return map;
  }, [items]);
  const monthKey = toIsoDate(month).slice(0, 7);
  const monthItems = items.filter((i) => i.date.startsWith(monthKey));
  const monthSummary = summarizeFinanceDay(monthItems);
  const overdue = monthItems.filter((i) => financeDayStatus(i, today) === "vencido");
  const upcoming = monthItems.filter((i) => i.status !== "pago" && i.date >= today).slice(0, 6);

  const shift = (delta: number) =>
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section
        className={`rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)] sm:p-4 ${loading ? "opacity-60" : ""}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              onClick={() => shift(-1)}
              aria-label="Mês anterior"
            >
              <ChevronLeft />
            </Button>
            <h2 className="min-w-[150px] text-center font-display text-base font-black capitalize">
              {month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              onClick={() => shift(1)}
              aria-label="Próximo mês"
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="ml-1 h-8 rounded-lg text-xs"
              onClick={() =>
                onMonthChange(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
              }
            >
              Hoje
            </Button>
          </div>
          <Legend />
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase tracking-[.1em] text-muted-foreground">
          {WEEK.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell) => {
            const dayItems = byDay.get(cell.iso) || [];
            const s = summarizeFinanceDay(dayItems);
            const statuses = Array.from(new Set(dayItems.map((i) => financeDayStatus(i, today))));
            const isToday = cell.iso === today;
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => setSelected(cell.iso)}
                aria-label={`${new Date(`${cell.iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}: ${dayItems.length} item(ns)`}
                className={`group flex min-h-[54px] flex-col rounded-xl border p-1 text-left transition hover:border-[color:var(--brand-soft-strong)] hover:bg-[color:var(--brand-soft)] sm:min-h-[84px] sm:p-1.5 ${cell.inMonth ? "border-border bg-background" : "border-transparent bg-muted/30 text-muted-foreground"} ${isToday ? "ring-2 ring-[color:var(--brand)]" : ""}`}
              >
                <span
                  className={`text-[11px] font-black ${isToday ? "text-[color:var(--brand-text)]" : ""}`}
                >
                  {cell.day}
                </span>
                {dayItems.length > 0 && (
                  <>
                    <div className="mt-auto flex flex-wrap gap-0.5 sm:hidden">
                      {statuses.map((st) => (
                        <i key={st} className={`size-1.5 rounded-full ${STATUS_META[st].dot}`} />
                      ))}
                    </div>
                    <div className="mt-1 hidden space-y-0.5 sm:block">
                      {dayItems.slice(0, 2).map((item) => {
                        const st = financeDayStatus(item, today);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-1 truncate text-[10px] leading-tight"
                          >
                            <i
                              className={`size-1.5 shrink-0 rounded-full ${STATUS_META[st].dot}`}
                            />
                            <span className="truncate">{item.title}</span>
                          </div>
                        );
                      })}
                      {dayItems.length > 2 && (
                        <div className="text-[10px] font-bold text-muted-foreground">
                          +{dayItems.length - 2}
                        </div>
                      )}
                      {(s.incomeCents > 0 || s.expenseCents > 0) && (
                        <div
                          className={`text-[10px] font-black tabular-nums ${s.netCents >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}
                        >
                          {s.netCents >= 0 ? "+" : "−"}
                          {money(Math.abs(s.netCents)).replace("R$", "").trim()}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="space-y-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <h3 className="text-[10px] font-extrabold uppercase tracking-[.14em] text-muted-foreground">
            Resumo do mês
          </h3>
          <dl className="mt-2 space-y-1.5 text-sm">
            <Row
              label="Entrou"
              value={money(monthSummary.incomeCents)}
              className="text-emerald-700 dark:text-emerald-400"
            />
            <Row
              label="Saiu"
              value={money(monthSummary.expenseCents)}
              className="text-rose-700 dark:text-rose-400"
            />
            <Row
              label={`${monthSummary.pendingCount} compromisso(s) pendente(s)`}
              value={money(monthSummary.pendingCents)}
            />
          </dl>
          {overdue.length > 0 && (
            <p className="mt-3 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              {overdue.length} item(ns) vencido(s) neste mês
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <h3 className="text-[10px] font-extrabold uppercase tracking-[.14em] text-muted-foreground">
            Próximos compromissos
          </h3>
          <div className="mt-2 space-y-1">
            {upcoming.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.date)}
                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-muted"
              >
                <span className="w-9 shrink-0 text-center text-[10px] font-black text-muted-foreground">
                  {item.date.slice(8, 10)}/{item.date.slice(5, 7)}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold">{item.title}</span>
                <span className="text-xs font-black tabular-nums">
                  {item.type === "receita" ? "+" : "−"}
                  {money(item.amountCents)}
                </span>
              </button>
            ))}
            {!upcoming.length && (
              <p className="py-3 text-xs text-muted-foreground">Nada pendente pela frente.</p>
            )}
          </div>
        </div>
        {aside}
      </aside>

      <DayDialog
        date={selected}
        items={selected ? byDay.get(selected) || [] : []}
        today={today}
        onClose={() => setSelected(null)}
        composer={selected && renderDayComposer ? renderDayComposer(selected) : null}
      />
    </div>
  );
}

function Row({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`font-black tabular-nums ${className}`}>{value}</dd>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-muted-foreground">
      {(Object.keys(STATUS_META) as FinanceDayStatus[]).map((key) => (
        <span key={key} className="inline-flex items-center gap-1">
          <i className={`size-2 rounded-full ${STATUS_META[key].dot}`} /> {STATUS_META[key].label}
        </span>
      ))}
    </div>
  );
}

function DayDialog({
  date,
  items,
  today,
  onClose,
  composer,
}: {
  date: string | null;
  items: FinancePlannerItem[];
  today: string;
  onClose: () => void;
  composer: ReactNode;
}) {
  const s = summarizeFinanceDay(items);
  const sorted = [...items].sort((a, b) =>
    String(a.time || "99").localeCompare(String(b.time || "99")),
  );
  return (
    <Dialog open={Boolean(date)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-black capitalize">
            {date
              ? new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              : ""}
          </DialogTitle>
          <DialogDescription>
            Resumo do dia e tudo que está registrado ou previsto.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="Entrou"
            value={money(s.incomeCents)}
            className="text-emerald-700 dark:text-emerald-400"
          />
          <Stat
            label="Saiu"
            value={money(s.expenseCents)}
            className="text-rose-700 dark:text-rose-400"
          />
          <Stat
            label="Saldo do dia"
            value={money(s.netCents)}
            className={s.netCents >= 0 ? "" : "text-rose-700 dark:text-rose-400"}
          />
        </div>
        {s.pendingCount > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            {s.pendingCount} compromisso(s) pendente(s) · {money(Math.abs(s.pendingCents))}
          </p>
        )}
        <div>
          <h4 className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] text-muted-foreground">
            Linha do tempo
          </h4>
          {sorted.length ? (
            <ol className="space-y-1.5">
              {sorted.map((item) => {
                const st = financeDayStatus(item, today);
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-2.5 rounded-xl border border-border p-2.5"
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.type === "receita" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"}`}
                    >
                      {item.type === "receita" ? (
                        <ArrowDownLeft className="size-3.5" />
                      ) : (
                        <ArrowUpRight className="size-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold">{item.title}</span>
                        {item.recurring && (
                          <Repeat
                            className="size-3 shrink-0 text-muted-foreground"
                            aria-label="Recorrente"
                          />
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="size-3" /> {item.time || "Sem hora"}
                        </span>
                        {item.category && <span>{item.category}</span>}
                        {item.paymentMethod && (
                          <span>
                            {PAYMENT_METHOD_LABELS[item.paymentMethod] || item.paymentMethod}
                          </span>
                        )}
                        {item.source && <span>{sourceLabel(item.source)}</span>}
                      </div>
                      {item.note && (
                        <p className="mt-1 text-[11px] italic text-muted-foreground">{item.note}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black tabular-nums">
                        {item.type === "receita" ? "+" : "−"} {money(item.amountCents)}
                      </div>
                      <span
                        className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${STATUS_META[st].pill}`}
                      >
                        {STATUS_META[st].label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="rounded-xl border border-dashed border-border py-5 text-center text-xs text-muted-foreground">
              Nada registrado neste dia.
            </p>
          )}
        </div>
        {composer && (
          <div>
            <h4 className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] text-muted-foreground">
              Adicionar lembrete ou conta neste dia
            </h4>
            {composer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-2.5">
      <div className="text-[10px] font-bold text-muted-foreground">{label}</div>
      <div className={`mt-0.5 truncate text-sm font-black tabular-nums ${className}`}>{value}</div>
    </div>
  );
}
