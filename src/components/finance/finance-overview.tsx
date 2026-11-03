/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  Bell,
  CalendarClock,
  Check,
  Clock,
  FileDown,
  MessageCircle,
  Mic,
  Plus,
  Target,
  Upload,
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
import type { FinanceDashboardSnapshot } from "@/lib/finance/finance-dashboard.functions";
import { formatPeriodLabel, type FinancePeriod } from "@/lib/finance/finance-period";
import { PeriodFilter } from "./period-filter";
import {
  buildOverviewAlerts,
  buildOverviewInsights,
  greeting,
  pctChange,
} from "@/lib/finance/overview-rules";
import type { FinanceLinks } from "./finance-links";

export const money = (valueCents: number) =>
  (valueCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type FinanceOverviewData = Pick<
  FinanceDashboardSnapshot,
  "period" | "totals" | "cashflow" | "categories" | "upcoming" | "latest" | "insight"
> &
  Partial<Pick<FinanceDashboardSnapshot, "budgets" | "goals">>;

export type OverviewActions = {
  pay?: (id: string) => Promise<void>;
  postpone?: (id: string, days: number) => Promise<void>;
  downloadPdf?: () => Promise<void>;
  sendPdf?: () => Promise<void>;
};

const todayIso = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

/** Visão do mês — compartilhada entre o painel real e a demonstração. */
export function FinanceOverview({
  data,
  period,
  onPeriodChange,
  links,
  assistantName,
  loading,
  banner,
  previous,
  actions,
  unreadCount,
  summary,
}: {
  data: FinanceOverviewData;
  period: FinancePeriod;
  onPeriodChange: (period: FinancePeriod) => void;
  links: FinanceLinks;
  assistantName: string;
  loading?: boolean;
  banner?: ReactNode;
  previous?: FinanceOverviewData | null;
  actions?: OverviewActions;
  unreadCount?: number;
  summary?: import("@/lib/finance/summary-cards-rules").FinanceSummaryCards | null;
}) {
  const { totals } = data;
  const cards = summary
    ? {
        balance: summary.monthBalanceCents,
        prevBalance: summary.previousMonthBalanceCents,
        received: summary.receivedMtdCents,
        prevReceived: summary.previousReceivedMtdCents,
        spent: summary.spentMtdCents,
        prevSpent: summary.previousSpentMtdCents,
        leftover: summary.monthBalanceCents,
      }
    : {
        balance: totals.netCents,
        prevBalance: previous?.totals.netCents,
        received: totals.receivedCents,
        prevReceived: previous?.totals.receivedCents,
        spent: totals.spentCents,
        prevSpent: previous?.totals.spentCents,
        leftover: totals.leftoverCents,
      };
  const today = todayIso();
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(new Date()),
  );
  const alerts = buildOverviewAlerts({
    upcoming: data.upcoming,
    budgets: data.budgets || [],
    leftoverCents: totals.leftoverCents,
    today,
    money,
  });
  const insights = buildOverviewInsights({
    categories: data.categories,
    previousCategories: previous?.categories,
    latest: data.latest,
    upcoming: data.upcoming,
    today,
    money,
  });
  const delta = (cur: number, prev?: number) =>
    previous && prev !== undefined ? pctChange(cur, prev) : null;
  const target = (t: "planner" | "transactions" | "settings") => links[t];
  const hasData = data.latest.length > 0 || data.upcoming.length > 0;
  return (
    <div className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[color:var(--brand-text)]">
            Visão do mês ·{" "}
            {new Date(`${today}T12:00:00`).toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </div>
          <h1 className="mt-1 font-display text-2xl font-black tracking-[-.04em] sm:text-[28px]">
            {greeting(hour)}! Seu dinheiro em um olhar.
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

      <nav aria-label="Ações rápidas" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <QuickLink to={links.chat} icon={Plus} label="Nova despesa" search={{ pergunta: "Quero registrar uma despesa" }} />
        <QuickLink to={links.chat} icon={ArrowDownLeft} label="Nova receita" search={{ pergunta: "Quero registrar uma receita" }} />
        <QuickLink to={links.transactions} icon={Upload} label="Importar extrato" />
        <QuickLink to={links.planner} icon={CalendarClock} label="Planejamento" />
        {unreadCount !== undefined && (
          <QuickLink
            to="/app/notificacoes"
            icon={Bell}
            label={unreadCount ? `${unreadCount} aviso${unreadCount > 1 ? "s" : ""} não lido${unreadCount > 1 ? "s" : ""}` : "Avisos"}
          />
        )}
        {actions?.downloadPdf && <ActionChip icon={FileDown} label="PDF do mês" run={actions.downloadPdf} />}
        {actions?.sendPdf && <ActionChip icon={MessageCircle} label="Enviar no WhatsApp" run={actions.sendPdf} />}
      </nav>

      {alerts.length > 0 && (
        <section aria-label="Atenção" className="grid gap-2 sm:grid-cols-2">
          {alerts.map((a) => (
            <Link
              key={a.key}
              to={target(a.target)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-bold transition hover:brightness-95 ${a.tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"}`}
            >
              <AlertTriangle className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">{a.title}</span>
              <ArrowRight className="size-3.5 shrink-0" />
            </Link>
          ))}
        </section>
      )}

      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4" aria-label="Indicadores">
        <Metric
          icon={Scale}
          label="Saldo do período"
          value={money(cards.balance)}
          helper={summary ? "sobra do mês anterior + entrou − saiu" : "entrou menos saiu"}
          tone={cards.balance >= 0 ? "brand" : "rose"}
          delta={delta(cards.balance, cards.prevBalance)}
          highlight
        />
        <Metric
          icon={ArrowDownLeft}
          label="Entrou"
          value={money(cards.received)}
          helper={summary ? "recebido do dia 1 até hoje" : "recebimentos confirmados"}
          tone="emerald"
          delta={delta(cards.received, cards.prevReceived)}
        />
        <Metric
          icon={ArrowUpRight}
          label="Saiu"
          value={money(cards.spent)}
          helper={summary ? "gasto do dia 1 até hoje" : "pagamentos confirmados"}
          tone="rose"
          delta={delta(cards.spent, cards.prevSpent)}
          inverse
        />
        <Metric
          icon={PiggyBank}
          label="Sobra prevista"
          value={money(cards.leftover)}
          helper={summary ? "sobra anterior + entradas − saídas até hoje" : totals.leftoverCents >= 0 ? "após contas do período" : "faltará no período"}
          tone={cards.leftover >= 0 ? "cyan" : "amber"}
          highlight
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
        <Evolution data={data} links={links} />
        <Categories data={data} previous={previous} links={links} />
      </section>

      <Projection data={data} today={today} />

      <section className="rounded-2xl border border-[color:var(--brand-soft-strong)] bg-[color:var(--brand-soft)] p-3.5">
        <div className="flex items-center gap-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[color:var(--brand)] text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div className="text-sm font-black">Dicas da {assistantName}</div>
        </div>
        <div className={`mt-2.5 grid gap-2 ${insights.length >= 3 ? "md:grid-cols-3" : insights.length === 2 ? "md:grid-cols-2" : ""}`}>
          {(insights.length
            ? insights
            : [{ title: data.insight.title, body: data.insight.body, question: data.insight.title }]
          ).map((i) => (
            <div key={i.title} className="flex flex-col rounded-xl bg-card p-3">
              <div className="text-xs font-black">{i.title}</div>
              <p className="mt-0.5 flex-1 text-[11px] text-muted-foreground">{i.body}</p>
              <Link
                to={links.chat}
                search={{ pergunta: i.question } as any}
                className="mt-2 text-[11px] font-extrabold text-[color:var(--brand-text)]"
              >
                Perguntar à {assistantName} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {(data.budgets?.length || data.goals?.length) ? (
        <section className="grid gap-3 lg:grid-cols-2">
          {data.budgets?.length ? <Budgets data={data} links={links} /> : null}
          {data.goals?.length ? <Goals data={data} links={links} /> : null}
        </section>
      ) : null}

      {hasData ? (
        <section className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
          <Latest data={data} links={links} />
          <Upcoming data={data} links={links} actions={actions} today={today} />
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
  delta,
  inverse,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  helper: string;
  tone: keyof typeof TONES;
  delta?: number | null;
  inverse?: boolean;
  highlight?: boolean;
}) {
  const good = delta == null ? null : inverse ? delta <= 0 : delta >= 0;
  return (
    <div
      className={`rounded-2xl border bg-card p-3.5 shadow-[var(--shadow-card)] ${highlight ? "border-[color:var(--brand-soft-strong)] ring-1 ring-[color:var(--brand-soft-strong)]" : "border-border"}`}
    >
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
      {delta != null && (
        <div
          className={`mt-1 text-[10px] font-extrabold ${good ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}
        >
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "="} {Math.abs(delta)}% vs. período anterior
        </div>
      )}
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, search }: { to: string; icon: any; label: string; search?: Record<string, string> }) {
  return (
    <Link
      to={to as any}
      search={search as any}
      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold shadow-[var(--shadow-card)] hover:bg-muted"
    >
      <Icon className="size-3.5 text-[color:var(--brand-text)]" /> {label}
    </Link>
  );
}

function ActionChip({ icon: Icon, label, run }: { icon: any; label: string; run: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await run();
        } finally {
          setBusy(false);
        }
      }}
      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold shadow-[var(--shadow-card)] hover:bg-muted disabled:opacity-60"
    >
      <Icon className="size-3.5 text-[color:var(--brand-text)]" /> {busy ? "Aguarde…" : label}
    </button>
  );
}

function Projection({ data, today }: { data: FinanceOverviewData; today: string }) {
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
      <span className="font-bold text-muted-foreground">Saldo hoje</span>
      <strong className="tabular-nums">{money(todayBal)}</strong>
      <ArrowRight className="size-3.5 text-muted-foreground" />
      <span className="font-bold text-muted-foreground">previsto no fim ({fmt(data.period.to)})</span>
      <strong className={`tabular-nums ${end < 0 ? "text-rose-700 dark:text-rose-400" : ""}`}>{money(end)}</strong>
      {min && (
        <span className="ml-auto text-muted-foreground">
          Dia mais apertado: <b>{fmt(min.date)}</b> ({money(min.bal)})
        </span>
      )}
    </section>
  );
}

function Budgets({ data, links }: { data: FinanceOverviewData; links: FinanceLinks }) {
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

function Goals({ data, links }: { data: FinanceOverviewData; links: FinanceLinks }) {
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

function Categories({
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

function Upcoming({
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
