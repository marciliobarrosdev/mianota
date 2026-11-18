/* eslint-disable @typescript-eslint/no-explicit-any */
/** Projeção do mês, orçamentos e metas. */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Target } from "lucide-react";
import type { FinanceLinks } from "../finance-links";
import { money, type FinanceOverviewData } from "./overview-shared";

export function Projection({ data, today }: { data: FinanceOverviewData; today: string }) {
  let bal = 0;
  let min: { date: string; bal: number } | null = null;
  let todayBal = 0;
  for (const d of data.cashflow) {
    bal += d.netCents;
    if (d.date <= today) todayBal = bal;
    if (d.date >= today && (!min || bal < min.bal)) min = { date: d.date, bal };
  }
  if (!data.cashflow.length) return null;
  const end = data.totals.leftoverCents;
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border bg-card px-4 py-3 text-xs shadow-[var(--shadow-card)]">
      <span className="font-bold text-muted-foreground">Resultado do período até hoje</span>
      <strong className="tabular-nums">{money(todayBal)}</strong>
      <ArrowRight className="size-3.5 text-muted-foreground" />
      <span className="font-bold text-muted-foreground">Resultado após pendências ({fmt(data.period.to)})</span>
      <strong className={`tabular-nums ${end < 0 ? "text-rose-700 dark:text-rose-400" : ""}`}>{money(end)}</strong>
      {min && (
        <span className="ml-auto text-muted-foreground">
          Dia mais apertado: <b>{fmt(min.date)}</b> ({money(min.bal)})
        </span>
      )}
    </section>
  );
}

export function Budgets({ data, links }: { data: FinanceOverviewData; links: FinanceLinks }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-black">Orçamentos</h2>
        <Link to={links.transactions} className="text-xs font-extrabold text-[color:var(--brand-text)]">
          Detalhes →
        </Link>
      </div>
      <div className="mt-3 space-y-2.5">
        {(data.budgets || []).slice(0, 5).map((b) => {
          const pct = b.limitCents ? Math.round((b.spentCents / b.limitCents) * 100) : 0;
          const bar = pct > 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
          return (
            <div key={b.id}>
              <div className="flex justify-between text-xs">
                <span className="font-bold">{b.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {money(b.spentCents)} / {money(b.limitCents)}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Goals({ data, links }: { data: FinanceOverviewData; links: FinanceLinks }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-black">Metas</h2>
        <Link to={links.planner} className="text-xs font-extrabold text-[color:var(--brand-text)]">
          Planejamento →
        </Link>
      </div>
      <div className="mt-3 space-y-2.5">
        {(data.goals || []).slice(0, 5).map((g) => (
          <div key={g.id}>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold">
                <Target className="size-3.5" style={{ color: g.color }} /> {g.name}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {money(g.savedCents)} / {money(g.targetCents)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full" style={{ width: `${g.percentage}%`, background: g.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

