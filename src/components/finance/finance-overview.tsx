/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, AlertTriangle, Bell, CalendarClock, FileDown, MessageCircle, Mic, Plus, Upload, PiggyBank, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type FinancePeriod } from "@/lib/finance/finance-period";
import { PeriodFilter } from "./period-filter";
import { buildOverviewAlerts, buildOverviewInsights, greeting, pctChange } from "@/lib/finance/overview-rules";
import type { FinanceLinks } from "./finance-links";
import { Metric, QuickLink, ActionChip, FirstMove } from "./overview/overview-cards";
import { Projection, Budgets, Goals } from "./overview/overview-planning";
import { Evolution, Categories } from "./overview/overview-charts";
import { Latest, Upcoming } from "./overview/overview-lists";
import { money, todayIso, type FinanceOverviewData, type OverviewActions } from "./overview/overview-shared";

/** Mantidos aqui para quem já importava deste arquivo. */
export { money, type FinanceOverviewData, type OverviewActions } from "./overview/overview-shared";

/** Visão do mês com os dados reais do assinante. */
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
