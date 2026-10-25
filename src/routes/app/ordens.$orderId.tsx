/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Download,
  Mic,
  Printer,
  UserRound,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/marcia/page-kit";
import { supabase } from "@/lib/auth/realm-supabase";
import {
  friendlyError,
  money,
  shortDate,
  workOrderLabels,
  type MarciaWorkOrder,
} from "@/lib/marcia";

export const Route = createFileRoute("/app/ordens/$orderId")({
  beforeLoad: () => {
    throw redirect({ to: "/app/movimentacoes" });
  },
  component: WorkOrderDetail,
});

function WorkOrderDetail() {
  const { orderId } = Route.useParams();
  const [item, setItem] = useState<MarciaWorkOrder | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void (async () => {
      const { data, error: nextError } = await (supabase as any)
        .from("marcia_work_order")
        .select("*, marcia_customer(*), marcia_professional(*)")
        .eq("id", orderId)
        .single();
      if (nextError) setError(friendlyError(nextError));
      else setItem(data);
    })();
  }, [orderId]);
  if (error)
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        {error}
      </div>
    );
  if (!item) return <div className="text-sm text-muted-foreground">Abrindo ordem de serviço…</div>;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/app/ordens"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            variant="outline"
            className="rounded-xl border-violet-200 text-violet-700"
          >
            <Link to="/app/marcia">
              <Mic /> Atualizar com a MárcIA
            </Link>
          </Button>
          <Button
            onClick={() => window.print()}
            className="rounded-xl bg-violet-700 hover:bg-violet-800"
          >
            <Printer /> Imprimir / salvar PDF
          </Button>
        </div>
      </div>
      <article className="overflow-hidden rounded-[28px] border border-border bg-white text-[#1d1530] shadow-[var(--shadow-card)]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-violet-100 bg-gradient-to-br from-violet-50 to-white p-6 sm:p-8">
          <div>
            <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-violet-700 text-white">
              <ClipboardList className="size-5" />
            </div>
            <div className="text-xs font-bold uppercase tracking-[.15em] text-violet-700">
              Ordem de serviço
            </div>
            <h1 className="mt-1 font-display text-3xl font-black">
              OS #{String(item.number).padStart(4, "0")}
            </h1>
          </div>
          <StatusPill status={item.status} label={workOrderLabels[item.status]} />
        </header>
        <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <Info
            icon={UserRound}
            label="Cliente"
            value={item.marcia_customer?.name || "Cliente"}
            detail={item.marcia_customer?.phone_e164 || ""}
          />
          <Info
            icon={Wrench}
            label="Serviço"
            value={item.summary}
            detail={
              item.marcia_professional?.name ? `Responsável: ${item.marcia_professional.name}` : ""
            }
          />
          <Info
            icon={CalendarDays}
            label="Emissão"
            value={shortDate(item.created_at)}
            detail={item.scheduled_at ? `Agendado para ${shortDate(item.scheduled_at)}` : ""}
          />
          <Info icon={Download} label="Valor combinado" value={money(item.total_cents)} detail="" />
          <div className="sm:col-span-2">
            <div className="text-xs font-bold uppercase tracking-[.12em] text-violet-700">
              Descrição do serviço
            </div>
            <div className="mt-2 min-h-28 rounded-2xl border border-violet-100 bg-violet-50/50 p-4 text-sm leading-relaxed">
              {item.description || "Sem observações adicionais."}
            </div>
          </div>
        </div>
        <footer className="grid gap-8 border-t border-violet-100 p-6 text-center text-xs text-[#655575] sm:grid-cols-2 sm:p-8">
          <div className="border-t border-[#9c90aa] pt-2">Assinatura do responsável</div>
          <div className="border-t border-[#9c90aa] pt-2">Aceite do cliente</div>
        </footer>
      </article>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: any;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[.12em] text-[#776786]">
          {label}
        </div>
        <div className="mt-0.5 font-bold">{value}</div>
        {detail && <div className="mt-0.5 text-xs text-[#776786]">{detail}</div>}
      </div>
    </div>
  );
}
