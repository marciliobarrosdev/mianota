/** As duas faixas de indicadores da Visão geral. */
import { Activity, Bot, Building2, CircleDollarSign, CreditCard, Landmark, Sparkles, TrendingUp } from "lucide-react";
import { MetricCard } from "./overview-parts";
import type { DashboardStats } from "./overview-types";

export function PrimaryMetrics({ stats, conversion }: { stats: DashboardStats; conversion: number }) {
  return (
  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <MetricCard
      accent
      icon={<CircleDollarSign className="size-4" />}
      label="Receita recorrente"
      value={(stats.mrr / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}
      helper={`${stats.assinaturasAtivas} assinaturas ativas`}
    />
    <MetricCard
      icon={<Building2 className="size-4" />}
      label="Assinantes"
      value={stats.total}
      helper={`+${stats.novasPeriodo} no período`}
    />
    <MetricCard
      icon={<Activity className="size-4" />}
      label="Operações ativas"
      value={stats.ativas}
      helper={`${conversion}% da base`}
    />
    <MetricCard
      icon={<Sparkles className="size-4" />}
      label="Em teste"
      value={stats.trial}
      helper={`${stats.trialsVencendo} vencem em até 7 dias`}
    />
  </section>
  );
}

export function UsageMetrics({ stats }: { stats: DashboardStats }) {
  return (
  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <MetricCard
      compact
      icon={<Bot className="size-4" />}
      label="Comandos de IA"
      value={stats.comandosIa}
      helper="no período"
    />
    <MetricCard
      compact
      icon={<CreditCard className="size-4" />}
      label="Assinaturas em trial"
      value={stats.assinaturasTrial}
      helper="checkout InfinityPay"
    />
    <MetricCard
      compact
      icon={<TrendingUp className="size-4" />}
      label="Movimentações"
      value={stats.movimentacoes}
      helper="registradas no período"
    />
    <MetricCard
      compact
      icon={<Landmark className="size-4" />}
      label="Contas financeiras"
      value={stats.contas}
      helper="criadas no período"
    />
  </section>
  );
}
