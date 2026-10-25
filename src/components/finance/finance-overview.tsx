/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Mic,
  PiggyBank,
  Scale,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { FinanceDashboardSnapshot } from "@/lib/finance-dashboard.functions";
import { formatPeriodLabel, type FinancePeriod } from "@/lib/finance-period";
import { PeriodFilter } from "./period-filter";
import type { FinanceLinks } from "./finance-links";

export const money = (valueCents: number) =>
  (valueCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type FinanceOverviewData = Pick<
  FinanceDashboardSnapshot,
  "period" | "totals" | "cashflow" | "categories" | "upcoming" | "latest" | "insight"
>;

/** Visão do mês — compartilhada entre o painel real e a demonstração. */
export function FinanceOverview({
  data,
  period,
  onPeriodChange,
  links,
  assistantName,
  loading,
  banner,
}: {
  data: FinanceOverviewData;
  period: FinancePeriod;
  onPeriodChange: (period: FinancePeriod) => void;
  links: FinanceLinks;
  assistantName: string;
  loading?: boolean;
  banner?: ReactNode;
}) {
  const { totals } = data;
  const hasData = data.latest.length > 0 || data.upcoming.length > 0;
  return (
    <div className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[color:var(--brand-text)]">
            Visão do mês
          </div>
          <h1 className="mt-1 font-display text-2xl font-black tracking-[-.04em] sm:text-[28px]">
            Seu dinheiro em um olhar.
          </h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PeriodFilter value={period} onChange={onPeriodChange} />
          <Button
            asChild
            size="sm"
            className="h-9 rounded-xl bg-[color:var(--brand)] hover:brightness-95"
          >
            <Link to={links.chat}>
              <Mic /> Falar com {assistantName}
            </Link>
          </Button>
        </div>
      </header>

      {banner}

      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4" aria-label="Indicadores">
        <Metric
          icon={Scale}
          label="Saldo do período"
          value={money(totals.netCents)}
          helper="entrou menos saiu"
          tone={totals.netCents >= 0 ? "brand" : "rose"}
        />
        <Metric
          icon={ArrowDownLeft}
          label="Entrou"
          value={money(totals.receivedCents)}
          helper={
            totals.pendingIncomeCents
              ? `+ ${money(totals.pendingIncomeCents)} a receber`
              : "recebimentos confirmados"
          }
          tone="emerald"
        />
        <Metric
          icon={ArrowUpRight}
          label="Saiu"
          value={money(totals.spentCents)}
          helper={
            totals.pendingExpenseCents
              ? `+ ${money(totals.pendingExpenseCents)} a pagar`
              : "pagamentos confirmados"
          }
          tone="rose"
        />
        <Metric
          icon={PiggyBank}
          label="Sobra prevista"
          value={money(totals.leftoverCents)}
          helper={totals.leftoverCents >= 0 ? "após contas do período" : "faltará no período"}
          tone={totals.leftoverCents >= 0 ? "cyan" : "amber"}
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
        <Evolution data={data} links={links} />
        <Categories data={data} />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[color:var(--brand-soft-strong)] bg-[color:var(--brand-soft)] p-3.5 sm:flex-row sm:items-center">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[color:var(--brand)] text-white">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black">{data.insight.title}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{data.insight.body}</p>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-xl bg-card">
          <Link to={links.chat}>
            Perguntar <ArrowRight />
          </Link>
        </Button>
      </section>

      {hasData ? (
        <section className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
          <Latest data={data} links={links} />
          <Upcoming data={data} links={links} />
        </section>
      ) : (
        <FirstMove links={links} assistantName={assistantName} />
      )}
    </div>
  );
}

const TONES: Record<string, string> = {
  brand: "bg-[color:var(--brand-soft)] text-[color:var(--brand-text)]",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

function Metric({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  helper: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <span className={`grid size-7 place-items-center rounded-lg ${TONES[tone]}`}>
          <Icon className="size-3.5" />
        </span>
        <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 truncate font-display text-lg font-black tracking-[-.03em] sm:text-xl">
        {value}
      </div>
      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{helper}</div>
    </div>
  );
}

function Evolution({ data, links }: { data: FinanceOverviewData; links: FinanceLinks }) {
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

function Categories({ data }: { data: FinanceOverviewData }) {
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
            <div key={item.id} className="flex items-center gap-2 text-xs">
              <span className="size-2 shrink-0 rounded-full" style={{ background: item.color }} />
              <span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>
              <span className="text-muted-foreground">{item.share}%</span>
              <strong className="tabular-nums">{money(item.amountCents)}</strong>
            </div>
          ))}
          {!data.categories.length && (
            <p className="text-xs text-muted-foreground">Nenhuma saída registrada no período.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Latest({ data, links }: { data: FinanceOverviewData; links: FinanceLinks }) {
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

function Upcoming({ data, links }: { data: FinanceOverviewData; links: FinanceLinks }) {
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
            item.status === "atrasado" || item.dueDate < new Date().toISOString().slice(0, 10);
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

function FirstMove({ links, assistantName }: { links: FinanceLinks; assistantName: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-lg font-black">Comece contando o que aconteceu.</h2>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        {assistantName} entende uma frase simples, pergunta só o que faltar e registra depois da sua
        confirmação.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          "Gastei 87 na farmácia no Pix",
          "Recebi 1.200 do projeto",
          "Academia de 99 todo dia 10",
        ].map((text) => (
          <span
            key={text}
            className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold"
          >
            “{text}”
          </span>
        ))}
      </div>
      <Button asChild size="sm" className="mt-4 rounded-xl bg-[color:var(--brand)]">
        <Link to={links.chat}>
          <Mic /> Falar com {assistantName}
        </Link>
      </Button>
    </section>
  );
}
