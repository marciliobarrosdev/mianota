/* eslint-disable @typescript-eslint/no-explicit-any */
/** Gráficos de evolução e de categorias. */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPeriodLabel } from "@/lib/finance/finance-period";
import { pctChange } from "@/lib/finance/overview-rules";
import type { FinanceLinks } from "../finance-links";
import { money, type FinanceOverviewData } from "./overview-shared";

export function Evolution({ data, links }: { data: FinanceOverviewData; links: FinanceLinks }) {
  const chart = useMemo(() => {
    let balance = 0;
    return data.cashflow.map((item) => {
      balance += item.netCents;
      return {
        label: item.label,
        entradas: item.incomeCents / 100,
        saidas: item.expenseCents / 100,
        saldo: balance / 100,
      };
    });
  }, [data.cashflow]);
  const interval = Math.max(0, Math.ceil(chart.length / 7) - 1);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-black">Evolução</h2>
          <p className="text-[11px] text-muted-foreground">{formatPeriodLabel(data.period)}</p>
        </div>
        <Link
          to={links.transactions}
          className="text-xs font-extrabold text-[color:var(--brand-text)]"
        >
          Ver extrato →
        </Link>
      </div>
      <div className="mt-2 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart} margin={{ left: -18, right: 4, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="ovIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="ovExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--hairline)" strokeDasharray="4 6" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={10}
              interval={interval}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={10}
              tickFormatter={(value) =>
                Math.abs(value) >= 1000 ? `${Math.round(value / 1000)}k` : String(Math.round(value))
              }
            />
            <Tooltip formatter={(value: any) => money(Number(value) * 100)} />
            <Area
              type="monotone"
              dataKey="entradas"
              name="Entrou"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#ovIncome)"
            />
            <Area
              type="monotone"
              dataKey="saidas"
              name="Saiu"
              stroke="#F43F5E"
              strokeWidth={2}
              fill="url(#ovExpense)"
            />
            <Area
              type="monotone"
              dataKey="saldo"
              name="Saldo acumulado"
              stroke="var(--brand)"
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-emerald-500" /> Entrou
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-rose-500" /> Saiu
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-[color:var(--brand)]" /> Saldo acumulado
        </span>
      </div>
    </div>
  );
}

export function Categories({
  data,
  previous,
  links,
}: {
  data: FinanceOverviewData;
  previous?: FinanceOverviewData | null;
  links: FinanceLinks;
}) {
  const prev = new Map((previous?.categories || []).map((c) => [c.id, c.amountCents]));
  const slices = data.categories.length
    ? data.categories.map((item) => ({
        name: item.name,
        value: item.amountCents,
        color: item.color,
      }))
    : [{ name: "Sem gastos", value: 1, color: "#E2E8F0" }];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-base font-black">Maiores categorias</h2>
      <p className="text-[11px] text-muted-foreground">Onde mais saiu dinheiro</p>
      <div className="mt-2 flex items-center gap-4 xl:flex-col xl:items-stretch">
        <div className="relative h-[130px] w-[130px] shrink-0 xl:mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                innerRadius={42}
                outerRadius={60}
                paddingAngle={3}
                strokeWidth={0}
              >
                {slices.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <strong className="font-display text-sm font-black">
              {money(data.totals.spentCents)}
            </strong>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          {data.categories.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              to={links.transactions}
              className="flex items-center gap-2 rounded-md text-xs hover:bg-muted/60"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: item.color }} />
              <span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>
              {previous?.categories.length ? (() => {
                const d = pctChange(item.amountCents, prev.get(item.id) || 0);
                return d == null ? (
                  <span className="text-[10px] font-bold text-muted-foreground">novo</span>
                ) : (
                  <span className={`text-[10px] font-bold ${d > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {d > 0 ? "▲" : "▼"}{Math.abs(d)}%
                  </span>
                );
              })() : null}
              <span className="text-muted-foreground">{item.share}%</span>
              <strong className="tabular-nums">{money(item.amountCents)}</strong>
            </Link>
          ))}
          {!data.categories.length && (
            <p className="text-xs text-muted-foreground">Nenhuma saída registrada no período.</p>
          )}
        </div>
      </div>
    </div>
  );
}

