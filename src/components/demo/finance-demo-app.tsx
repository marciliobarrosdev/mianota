import { useMemo, useState, type ReactNode } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { Mic, Sparkles } from "lucide-react";
import { useBrand } from "@/contexts/brand-context";
import { Button } from "@/components/ui/button";
import { LoadingBlocks, PageHeader } from "@/components/marcia/page-kit";
import { FinanceOverview } from "@/components/finance/finance-overview";
import { TransactionsView } from "@/components/finance/transactions-view";
import { PlannerView } from "@/components/finance/planner-view";
import { MarciaChat } from "@/components/finance/marcia-chat";
import { MarciaChatShell } from "@/components/finance/marcia-chat-shell";
import { financeLinks } from "@/components/finance/finance-links";
import { useDemoMarciaChat } from "@/hooks/use-demo-marcia-chat";
import {
  buildDemoPlanner,
  buildDemoSnapshot,
  buildDemoTransactions,
} from "@/lib/finance-demo-data";
import { resolveFinancePeriod, toIsoDate, type FinancePeriod } from "@/lib/finance-period";

const links = financeLinks("demo");

// As telas da demonstração dependem de "hoje" e do fuso do visitante:
// renderizam só no navegador para não divergir do HTML do servidor.
function DemoClient({ children }: { children: ReactNode }) {
  return <ClientOnly fallback={<LoadingBlocks count={6} />}>{children}</ClientOnly>;
}

function DemoCta() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--brand-soft-strong)] bg-[color:var(--brand-soft)] p-3 text-sm sm:flex-row sm:items-center">
      <Sparkles className="size-4 shrink-0 text-[color:var(--brand-text)]" />
      <span className="flex-1 text-xs font-semibold">
        Dados fictícios da Família Aurora. Crie seu acesso para organizar o seu dinheiro de verdade.
      </span>
      <Button asChild size="sm" className="h-8 rounded-lg bg-[color:var(--brand)]">
        <Link to="/" hash="planos">
          Criar meu acesso
        </Link>
      </Button>
    </div>
  );
}

function useDemoTransactions() {
  return useMemo(() => buildDemoTransactions(), []);
}

export function DemoOverviewPage() {
  return (
    <DemoClient>
      <DemoOverview />
    </DemoClient>
  );
}

function DemoOverview() {
  const branding = useBrand();
  const transactions = useDemoTransactions();
  const [period, setPeriod] = useState<FinancePeriod>(() => resolveFinancePeriod("this_month"));
  const data = useMemo(() => buildDemoSnapshot(transactions, period), [transactions, period]);
  return (
    <FinanceOverview
      data={data}
      period={period}
      onPeriodChange={setPeriod}
      links={links}
      assistantName={branding.assistantName}
      banner={<DemoCta />}
    />
  );
}

export function DemoMovementsPage() {
  return (
    <DemoClient>
      <DemoMovements />
    </DemoClient>
  );
}

function DemoMovements() {
  const branding = useBrand();
  const transactions = useDemoTransactions();
  const [period, setPeriod] = useState<FinancePeriod>(() => resolveFinancePeriod("this_month"));
  const items = useMemo(
    () => transactions.filter((t) => t.date >= period.from && t.date <= period.to),
    [transactions, period],
  );
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Seu extrato"
        title="Movimentações"
        description="Tudo que entrou pelo chat, WhatsApp, foto ou registro manual, com todos os detalhes."
        action={
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link to={links.chat}>
              <Mic /> Registrar falando com {branding.assistantName}
            </Link>
          </Button>
        }
      />
      <TransactionsView items={items} period={period} onPeriodChange={setPeriod} />
    </div>
  );
}

export function DemoPlannerPage() {
  return (
    <DemoClient>
      <DemoPlanner />
    </DemoClient>
  );
}

function DemoPlanner() {
  const branding = useBrand();
  const transactions = useDemoTransactions();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const items = useMemo(() => {
    const first = toIsoDate(new Date(month.getFullYear(), month.getMonth(), -7));
    const last = toIsoDate(new Date(month.getFullYear(), month.getMonth() + 1, 7));
    return buildDemoPlanner(transactions, first, last);
  }, [transactions, month]);
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="O que já aconteceu e o que vem pela frente"
        title="Planejamento e calendário"
        description="Clique em um dia para ver o resumo, a linha do tempo e adicionar lembretes ou contas."
        action={
          <Button asChild size="sm" className="rounded-xl bg-[color:var(--brand)]">
            <Link to={links.chat}>
              <Mic /> Planejar com {branding.assistantName}
            </Link>
          </Button>
        }
      />
      <PlannerView
        items={items}
        month={month}
        onMonthChange={setMonth}
        renderDayComposer={(date) => <DemoDayComposer key={date} date={date} />}
      />
    </div>
  );
}

function DemoDayComposer({ date }: { date: string }) {
  const branding = useBrand();
  const label = new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
  const controller = useDemoMarciaChat({ seed: false, dateLabel: label });
  return (
    <MarciaChat
      controller={controller}
      assistantName={branding.assistantName}
      variant="compact"
      placeholder={`Ex.: conta de luz de 180 para ${label}`}
      composeText={(text) => `${text} (data: ${label})`}
    />
  );
}

export function DemoChatPage() {
  return (
    <DemoClient>
      <DemoChat />
    </DemoClient>
  );
}

function DemoChat() {
  const branding = useBrand();
  const controller = useDemoMarciaChat();
  return (
    <MarciaChatShell
      assistantName={branding.assistantName}
      subtitle="Demonstração · respostas simuladas"
    >
      <MarciaChat
        controller={controller}
        assistantName={branding.assistantName}
        suggestions={[
          "Gastei R$ 84,90 no mercado pelo Pix",
          "Recebi R$ 850 do projeto",
          "Conta de água de R$ 96 vence dia 25",
          "Quanto eu gastei este mês?",
        ]}
      />
    </MarciaChatShell>
  );
}
