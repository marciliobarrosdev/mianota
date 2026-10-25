/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic } from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { PageHeader } from "@/components/marcia/page-kit";
import { Button } from "@/components/ui/button";
import { FinanceError, FinanceLoading } from "@/components/finance/finance-states";
import { PlannerView } from "@/components/finance/planner-view";
import { MarciaChat } from "@/components/finance/marcia-chat";
import { useMarciaFinanceChat } from "@/hooks/use-marcia-finance-chat";
import { getFinancePlanner, type FinancePlannerItem } from "@/lib/finance-dashboard.functions";
import { toIsoDate } from "@/lib/finance-period";

export const Route = createFileRoute("/app/planejamento")({
  head: brandedRouteHead("Planejamento e calendário"),
  component: PlannerPage,
});

function PlannerPage() {
  const branding = useBrand();
  const ctx = Route.useRouteContext();
  const companyId = ctx.company?.id;
  const load = useServerFn(getFinancePlanner);
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [items, setItems] = useState<FinancePlannerItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = useMemo(() => {
    // Inclui as semanas visíveis antes/depois do mês.
    const first = new Date(month.getFullYear(), month.getMonth(), 1 - 7);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 7);
    return { first: toIsoDate(first), last: toIsoDate(last) };
  }, [month]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      setItems(await load({ data: { companyId, ...range } }));
    } catch (e: any) {
      setError(e?.message || "Não foi possível carregar o calendário.");
    } finally {
      setLoading(false);
    }
  }, [companyId, load, range]);

  useEffect(() => {
    void refresh();
    const onUpdate = () => void refresh();
    window.addEventListener("marcia:finance-updated", onUpdate);
    return () => window.removeEventListener("marcia:finance-updated", onUpdate);
  }, [refresh]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="O que já aconteceu e o que vem pela frente"
        title="Planejamento e calendário"
        description="Clique em um dia para ver o resumo, a linha do tempo e adicionar lembretes ou contas."
        action={
          <Button asChild size="sm" className="rounded-xl bg-[color:var(--brand)]">
            <Link to="/app/marcia">
              <Mic /> Planejar com {branding.assistantName}
            </Link>
          </Button>
        }
      />
      {loading && !items ? (
        <FinanceLoading />
      ) : error && !items ? (
        <FinanceError message={error} retry={refresh} />
      ) : (
        <PlannerView
          items={items || []}
          month={month}
          onMonthChange={setMonth}
          loading={loading}
          renderDayComposer={(date) => (
            <DayComposer
              key={date}
              companyId={companyId}
              date={date}
              assistantName={branding.assistantName}
            />
          )}
        />
      )}
    </div>
  );
}

function DayComposer({
  companyId,
  date,
  assistantName,
}: {
  companyId?: string;
  date: string;
  assistantName: string;
}) {
  const controller = useMarciaFinanceChat(companyId, { loadHistory: false });
  const label = new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
  return (
    <MarciaChat
      controller={controller}
      assistantName={assistantName}
      variant="compact"
      placeholder={`Ex.: conta de luz de 180 para ${label}`}
      composeText={(text) =>
        /\d{1,2}\/\d{1,2}/.test(text) || /\bhoje\b|\bamanh/i.test(text)
          ? text
          : `${text} (data: ${label})`
      }
    />
  );
}
