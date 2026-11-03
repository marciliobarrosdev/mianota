import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { plannerItemAction, undoPlannerAction } from "@/lib/finance/finance-planner.functions";
import { downloadMonthlyReport, sendMonthlyReportWhatsapp } from "@/lib/finance/monthly-report.functions";
import { previousPeriod } from "@/lib/finance/overview-rules";
import { addDays } from "@/lib/finance/finance-period";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { RefreshCw } from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { Button } from "@/components/ui/button";
import { LoadingBlocks } from "@/components/marcia/page-kit";
import { FinanceOverview } from "@/components/finance/finance-overview";
import { financeLinks } from "@/components/finance/finance-links";
import { useFinanceDashboard } from "@/hooks/use-finance-dashboard";
import { resolveFinancePeriod, type FinancePeriod } from "@/lib/finance/finance-period";

export const Route = createFileRoute("/app/inicio")({
  head: brandedRouteHead("Visão do mês"),
  component: MonthOverviewPage,
});

function MonthOverviewPage() {
  const branding = useBrand();
  const ctx = Route.useRouteContext();
  const [period, setPeriod] = useState<FinancePeriod>(() => resolveFinancePeriod("this_month"));
  const companyId = ctx.company?.id;
  const { data, loading, error, refresh } = useFinanceDashboard(companyId, period);
  const prevRange = useMemo(() => previousPeriod(period), [period.from, period.to]);
  const { data: previous } = useFinanceDashboard(companyId, prevRange);
  const { unread } = useUnreadNotifications(companyId, (ctx as any).user?.id);
  const act = useServerFn(plannerItemAction);
  const undo = useServerFn(undoPlannerAction);
  const pdf = useServerFn(downloadMonthlyReport);
  const sendPdf = useServerFn(sendMonthlyReportWhatsapp);
  const month = period.from.slice(0, 7);

  const run = async (entryId: string, action: "pay" | "move", newDate?: string) => {
    if (!companyId || !data) return;
    const item = data.upcoming.find((u) => u.id === entryId);
    try {
      const r = await act({
        data: { companyId, entryId, date: item?.dueDate || period.from, action, newDate },
      });
      await refresh();
      toast.success(r.message, {
        action: {
          label: "Desfazer",
          onClick: async () => {
            await undo({ data: { companyId, undo: r.undo } as any });
            await refresh();
          },
        },
      });
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível concluir.");
    }
  };

  const actions = companyId
    ? {
        pay: (id: string) => run(id, "pay"),
        postpone: (id: string, days: number) => {
          const item = data?.upcoming.find((u) => u.id === id);
          const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
          const base = item && item.dueDate > today ? item.dueDate : today;
          return run(id, "move", addDays(base, days));
        },
        downloadPdf: async () => {
          try {
            const r = await pdf({ data: { companyId, month } });
            const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
            const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = r.fileName;
            a.click();
            URL.revokeObjectURL(url);
          } catch {
            toast.error("Não foi possível gerar o PDF.");
          }
        },
        sendPdf: async () => {
          const r = await sendPdf({ data: { companyId, month } }).catch(() => null);
          if (r?.ok) toast.success("Relatório enviado no seu WhatsApp.");
          else toast.error((r as any)?.error || "Não foi possível enviar agora.");
        },
      }
    : undefined;

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
      previous={previous}
      actions={actions}
      unreadCount={unread}
    />
  );
}
