/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileDown, MessageCircle, Mic, Plus } from "lucide-react";
import { toast } from "sonner";
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
import {
  createPlannerBill,
  downloadPeriodReport,
  getPlannerExtras,
  plannerItemAction,
  sendPeriodReportWhatsapp,
  undoPlannerAction,
  updatePlannerRecurrence,
  type PlannerExtras,
} from "@/lib/finance-planner.functions";
import {
  NewBillDialog,
  RecurrencesPanel,
  ReportDialog,
  ToolbarButton,
  type PlannerActions,
} from "@/components/finance/planner-actions";

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

  const loadExtras = useServerFn(getPlannerExtras);
  const act = useServerFn(plannerItemAction);
  const undoFn = useServerFn(undoPlannerAction);
  const createBill = useServerFn(createPlannerBill);
  const updateRec = useServerFn(updatePlannerRecurrence);
  const pdf = useServerFn(downloadPeriodReport);
  const pdfWa = useServerFn(sendPeriodReportWhatsapp);
  const [extras, setExtras] = useState<PlannerExtras | null>(null);
  const [newBill, setNewBill] = useState(false);
  const [report, setReport] = useState(false);
  const monthKey = toIsoDate(month).slice(0, 7);

  const refreshExtras = useCallback(async () => {
    if (!companyId) return;
    try {
      setExtras(await loadExtras({ data: { companyId, month: monthKey } }));
    } catch {
      /* painel opcional */
    }
  }, [companyId, loadExtras, monthKey]);

  const changed = useCallback(() => {
    window.dispatchEvent(new Event("marcia:finance-updated"));
  }, []);

  const actions: PlannerActions | undefined = companyId
    ? {
        categories: extras?.categories,
        run: async (item, req) => {
          try {
            const r = await act({
              data: { companyId, entryId: item.entryId || null, recurrenceId: item.recurrenceId || null, date: item.date, ...req },
            });
            changed();
            toast.success(r.message, {
              action: {
                label: "Desfazer",
                onClick: async () => {
                  await undoFn({ data: { companyId, undo: r.undo } });
                  changed();
                  toast("Ação desfeita.");
                },
              },
            });
          } catch (e: any) {
            toast.error(e?.message || "Não foi possível concluir.");
            throw e;
          }
        },
      }
    : undefined;

  useEffect(() => {
    void refreshExtras();
    const on = () => void refreshExtras();
    window.addEventListener("marcia:finance-updated", on);
    return () => window.removeEventListener("marcia:finance-updated", on);
  }, [refreshExtras]);

  const downloadReport = async (p: { from: string; to: string; label: string }) => {
    if (!companyId) return;
    try {
      const r = await pdf({ data: { companyId, ...p } });
      const bin = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bin], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = r.fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível gerar o relatório.");
    }
  };
  const sendReport = async (p: { from: string; to: string; label: string }) => {
    if (!companyId) return;
    try {
      const r = await pdfWa({ data: { companyId, ...p } });
      if (r.ok) toast.success(r.mode === "pdf" ? "Relatório enviado no seu WhatsApp." : "Resumo enviado no WhatsApp.");
      else toast.error(r.error);
    } catch {
      toast.error("Não foi possível enviar pelo WhatsApp agora.");
    }
  };

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
          actions={actions}
          extras={extras}
          toolbar={
            <>
              <ToolbarButton icon={<Plus className="size-3.5" />} onClick={() => setNewBill(true)}>Nova conta</ToolbarButton>
              <ToolbarButton icon={<FileDown className="size-3.5" />} onClick={() => setReport(true)}>Relatório</ToolbarButton>
            </>
          }
          aside={
            extras ? (
              <RecurrencesPanel
                extras={extras}
                onToggle={async (id, active) => {
                  if (!companyId) return;
                  await updateRec({ data: { companyId, id, active } });
                  changed();
                  toast.success(active ? "Recorrência retomada." : "Recorrência pausada.");
                }}
              />
            ) : null
          }
          renderAskMia={(label) => (
            <Button asChild variant="outline" size="sm" className="w-full rounded-xl">
              <Link to="/app/marcia" search={{ pergunta: `Como ficam minhas finanças no dia ${label}? O que vence e o que posso planejar?` }}>
                <MessageCircle /> Perguntar à {branding.assistantName} sobre este dia
              </Link>
            </Button>
          )}
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
      <NewBillDialog
        open={newBill}
        onClose={() => setNewBill(false)}
        categories={extras?.categories || []}
        defaultDate={toIsoDate(new Date())}
        onCreate={async (v) => {
          if (!companyId) return;
          try {
            await createBill({ data: { companyId, ...v } });
            changed();
            toast.success(v.repeat ? "Conta recorrente criada." : "Conta criada.");
          } catch (e: any) {
            toast.error(e?.message || "Não foi possível salvar.");
            throw e;
          }
        }}
      />
      <ReportDialog open={report} onClose={() => setReport(false)} refDate={toIsoDate(new Date())} onDownload={downloadReport} onSend={sendReport} />
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
