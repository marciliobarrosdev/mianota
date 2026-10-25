import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { Button } from "@/components/ui/button";
import { LoadingBlocks } from "@/components/marcia/page-kit";
import { FinanceOverview } from "@/components/finance/finance-overview";
import { financeLinks } from "@/components/finance/finance-links";
import { useFinanceDashboard } from "@/hooks/use-finance-dashboard";
import { resolveFinancePeriod, type FinancePeriod } from "@/lib/finance-period";

export const Route = createFileRoute("/app/inicio")({
  head: brandedRouteHead("Visão do mês"),
  component: MonthOverviewPage,
});

function MonthOverviewPage() {
  const branding = useBrand();
  const ctx = Route.useRouteContext();
  const [period, setPeriod] = useState<FinancePeriod>(() => resolveFinancePeriod("this_month"));
  const { data, loading, error, refresh } = useFinanceDashboard(ctx.company?.id, period);

  if (!data) {
    if (loading || !error) return <LoadingBlocks count={6} />;
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-card p-6 text-center shadow-[var(--shadow-card)]">
          <h1 className="font-display text-xl font-black">Sua visão do mês não carregou</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => void refresh()} className="mt-4 rounded-xl">
            <RefreshCw /> Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FinanceOverview
      data={data}
      period={period}
      onPeriodChange={setPeriod}
      links={financeLinks("app")}
      assistantName={branding.assistantName}
      loading={loading}
    />
  );
}
