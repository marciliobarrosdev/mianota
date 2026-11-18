import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { brandedRouteHead } from "@/config/brand";
import { masterKpis } from "@/lib/master/master.functions";
import { getMasterSetupProgress } from "@/lib/master/master-setup.functions";
import { conversionPercent, localDate } from "@/lib/master/overview-rules";
import { BroadcastCard } from "@/components/master/broadcast-card";
import { DeletionRequestsCard } from "@/components/master/deletion-requests-card";
import { SystemHealthCard } from "@/components/master/system-health-card";
import { OverviewHeader } from "@/components/master/overview/overview-header";
import { SetupProgressCard } from "@/components/master/overview/setup-progress-card";
import { PrimaryMetrics, UsageMetrics } from "@/components/master/overview/overview-metrics";
import { SignupsChartCard } from "@/components/master/overview/signups-chart-card";
import { AttentionCard } from "@/components/master/overview/attention-card";
import { RecentCompaniesCard } from "@/components/master/overview/recent-companies-card";
import { QuickActionsCard } from "@/components/master/overview/quick-actions-card";
import type { DashboardData, SetupProgress } from "@/components/master/overview/overview-types";

export const Route = createFileRoute("/master/painel")({
  head: brandedRouteHead("Visão geral"),
  component: OverviewPage,
});

/** Visão geral do Master: carrega indicadores do período e monta os cartões. */
function OverviewPage() {
  const getKpis = useServerFn(masterKpis);
  const getSetup = useServerFn(getMasterSetupProgress);
  const [from, setFrom] = useState(() => localDate(29));
  const [to, setTo] = useState(() => localDate());
  const [activePreset, setActivePreset] = useState<number>(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [setup, setSetup] = useState<SetupProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kpis, setupProgress] = await Promise.all([
        getKpis({ data: { from, to } }),
        getSetup(),
      ]);
      setData(kpis as DashboardData);
      setSetup(setupProgress);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível carregar a visão geral.",
      );
    } finally {
      setLoading(false);
    }
  }, [from, getKpis, getSetup, to]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyPreset(days: number) {
    setActivePreset(days);
    setFrom(localDate(days - 1));
    setTo(localDate());
  }

  const conversion = useMemo(() => conversionPercent(data?.stats), [data]);

  if (!data && loading) {
    return (
      <div className="grid min-h-[55vh] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-violet-500" />
          <p className="mt-3 text-sm text-muted-foreground">Montando sua visão geral…</p>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const stats = data.stats;

  return (
    <div className="space-y-6">
      <OverviewHeader
        from={from}
        to={to}
        activePreset={activePreset}
        loading={loading}
        onPreset={applyPreset}
        onFromChange={(value) => {
          setActivePreset(0);
          setFrom(value);
        }}
        onToChange={(value) => {
          setActivePreset(0);
          setTo(value);
        }}
        onRefresh={() => void load()}
      />
      {setup && <SetupProgressCard setup={setup} />}
      <SystemHealthCard />
      <PrimaryMetrics stats={stats} conversion={conversion} />
      <section className="grid gap-5 xl:grid-cols-[1.55fr_.75fr]">
        <SignupsChartCard from={from} to={to} total={stats.novasPeriodo} series={data.series} />
        <AttentionCard stats={stats} />
      </section>
      <UsageMetrics stats={stats} />
      <section className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <RecentCompaniesCard companies={data.recentCompanies} />
        <QuickActionsCard />
      </section>
      <BroadcastCard />
      <DeletionRequestsCard />
    </div>
  );
}
