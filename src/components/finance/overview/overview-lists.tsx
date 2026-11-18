/* eslint-disable @typescript-eslint/no-explicit-any */
/** Últimas movimentações e próximos vencimentos. */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Check, Clock } from "lucide-react";
import type { FinanceLinks } from "../finance-links";
import { money, type FinanceOverviewData, type OverviewActions } from "./overview-shared";
import { TONES } from "./overview-cards";

export function Latest({ data, links }: { data: FinanceOverviewData; links: FinanceLinks }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-black">Últimas movimentações</h2>
        <Link
          to={links.transactions}
          className="text-xs font-extrabold text-[color:var(--brand-text)]"
        >
          Ver todas →
        </Link>
      </div>
      <div className="mt-2 divide-y divide-border">
        {data.latest.slice(0, 6).map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-2.5">
            <div
              className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.type === "receita" ? TONES.emerald : TONES.rose}`}
            >
              {item.type === "receita" ? (
                <ArrowDownLeft className="size-3.5" />
              ) : (
                <ArrowUpRight className="size-3.5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{item.description}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {item.category || "Sem categoria"} ·{" "}
                {new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </div>
            </div>
            <strong
              className={`text-sm tabular-nums ${item.type === "receita" ? "text-emerald-700 dark:text-emerald-400" : ""}`}
            >
              {item.type === "receita" ? "+" : "−"} {money(item.amountCents)}
            </strong>
          </div>
        ))}
        {!data.latest.length && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Nada registrado neste período.
          </p>
        )}
      </div>
    </div>
  );
}

export function Upcoming({
  data,
  links,
  actions,
  today,
}: {
  data: FinanceOverviewData;
  links: FinanceLinks;
  actions?: OverviewActions;
  today: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (id: string, fn?: () => Promise<void>) => {
    if (!fn) return;
    setBusy(id);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-black">Próximos 14 dias</h2>
        <Link to={links.planner} className="text-xs font-extrabold text-[color:var(--brand-text)]">
          Calendário →
        </Link>
      </div>
      <div className="mt-2 space-y-1.5">
        {data.upcoming.slice(0, 6).map((item) => {
          const overdue =
            item.status === "atrasado" || item.dueDate < today;
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2">
              <CalendarClock
                className={`size-4 shrink-0 ${overdue ? "text-rose-600" : "text-amber-600"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{item.description}</div>
                <div
                  className={`text-[11px] ${overdue ? "font-bold text-rose-600" : "text-muted-foreground"}`}
                >
                  {overdue ? "Vencido · " : ""}
                  {new Date(`${item.dueDate}T12:00:00`).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </div>
              </div>
              <strong className="text-sm tabular-nums">
                {item.type === "receita" ? "+" : "−"} {money(item.amountCents)}
              </strong>
              {actions?.pay && item.status !== "pago" && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    title={item.type === "receita" ? "Marcar como recebida" : "Marcar como paga"}
                    aria-label={item.type === "receita" ? "Marcar como recebida" : "Marcar como paga"}
                    disabled={busy === item.id}
                    onClick={() => run(item.id, () => actions.pay!(item.id))}
                    className="grid size-7 place-items-center rounded-lg bg-card text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                  >
                    <Check className="size-3.5" />
                  </button>
                  {actions.postpone && (
                    <button
                      type="button"
                      title="Adiar 1 dia"
                      aria-label="Adiar 1 dia"
                      disabled={busy === item.id}
                      onClick={() => run(item.id, () => actions.postpone!(item.id, 1))}
                      className="grid size-7 place-items-center rounded-lg bg-card text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                      <Clock className="size-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!data.upcoming.length && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Nenhum compromisso nos próximos dias.
          </p>
        )}
      </div>
    </div>
  );
}

