import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, startOfDay } from "date-fns";
import {
  CalendarCheck2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  MessageCircle,
  Play,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  LoadingBlocks,
  MarciaAssistantCard,
  PageHeader,
  StatusPill,
} from "@/components/marcia/page-kit";
import { NewAppointmentDialog } from "@/components/marcia/new-appointment-dialog";
import { AppointmentActionsDialog } from "@/components/marcia/appointment-actions-dialog";
import { NewWorkOrderDialog } from "@/components/marcia/new-work-order-dialog";
import {
  appointmentLabels,
  friendlyError,
  listAppointments,
  listWorkOrders,
  money,
  shortTime,
  updateAppointmentStatus,
  type MarciaAppointment,
  type MarciaWorkOrder,
} from "@/lib/marcia";

export const Route = createFileRoute("/app/hoje")({
  beforeLoad: () => {
    throw redirect({ to: "/app/inicio" });
  },
  head: brandedRouteHead("Hoje"),
  component: TodayPage,
});

function TodayPage() {
  const branding = useBrand();
  const ctx = Route.useRouteContext();
  const companyId = ctx.company?.id;
  const [appointments, setAppointments] = useState<MarciaAppointment[]>([]);
  const [orders, setOrders] = useState<MarciaWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      const [nextAppointments, nextOrders] = await Promise.all([
        listAppointments(companyId, startOfDay(new Date()), addDays(startOfDay(new Date()), 1)),
        listWorkOrders(companyId),
      ]);
      setAppointments(nextAppointments);
      setOrders(nextOrders);
    } catch (nextError) {
      setError(friendlyError(nextError));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      today: appointments.filter((item) => !["cancelled", "no_show"].includes(item.status)).length,
      completed: appointments.filter((item) => item.status === "completed").length,
      customers: new Set(appointments.map((item) => item.customer_id)).size,
      revenue: appointments
        .filter((item) => item.status === "completed")
        .reduce((sum, item) => sum + Number(item.price_cents || 0), 0),
      openOrders: orders.filter((item) => !["completed", "cancelled"].includes(item.status)).length,
    }),
    [appointments, orders],
  );

  async function moveStatus(item: MarciaAppointment, status: "in_progress" | "completed") {
    try {
      await updateAppointmentStatus(item.company_id, item.id, status);
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === item.id ? { ...appointment, status } : appointment,
        ),
      );
      toast.success(status === "completed" ? "Atendimento concluído." : "Atendimento iniciado.");
    } catch (nextError) {
      toast.error(friendlyError(nextError));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visão do dia"
        title={`Olá! Aqui está sua ${dayLabel()}.`}
        description="Compromissos, serviços e pendências reunidos em uma tela simples."
        action={companyId ? <NewAppointmentDialog companyId={companyId} onCreated={load} /> : null}
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <MarciaAssistantCard
          title={assistantTitle(stats.today, stats.openOrders)}
          text={assistantText(stats.today, stats.openOrders)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Metric icon={CalendarCheck2} label="Agendados hoje" value={stats.today} color="violet" />
          <Metric
            icon={ClipboardCheck}
            label="OS em aberto"
            value={stats.openOrders}
            color="amber"
          />
          <Metric icon={UsersRound} label="Clientes hoje" value={stats.customers} color="cyan" />
          <Metric
            icon={CircleDollarSign}
            label="Concluído hoje"
            value={money(stats.revenue)}
            color="emerald"
            compact
          />
        </div>
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="rounded-[24px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-extrabold">Próximos atendimentos</h2>
              <p className="text-xs text-muted-foreground">Em ordem de horário</p>
            </div>
            <Link
              to="/app/agenda"
              className="inline-flex items-center gap-1 text-xs font-bold text-violet-700"
            >
              Ver agenda <ChevronRight className="size-3.5" />
            </Link>
          </div>
          {loading ? (
            <LoadingBlocks count={3} />
          ) : error ? (
            <ErrorBox message={error} retry={load} />
          ) : appointments.length === 0 ? (
            <EmptyState
              title="Agenda livre por enquanto"
              description={`Crie um horário manualmente ou deixe ${branding.assistantName} organizar o próximo pedido do WhatsApp.`}
              action={
                companyId ? (
                  <NewAppointmentDialog companyId={companyId} onCreated={load} />
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-2.5">
              {appointments.map((item) => (
                <AppointmentRow
                  key={item.id}
                  item={item}
                  companyId={companyId!}
                  onStart={() => moveStatus(item, "in_progress")}
                  onComplete={() => moveStatus(item, "completed")}
                  onRefresh={load}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-base font-extrabold">Atalhos</h2>
            <div className="mt-3 space-y-2">
              {companyId && <NewWorkOrderDialog companyId={companyId} onCreated={load} />}
              <Link
                to="/app/conversas"
                className="flex h-11 w-full items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold hover:bg-muted"
              >
                <MessageCircle className="size-4 text-emerald-600" /> Abrir conversas{" "}
                <ChevronRight className="ml-auto size-4" />
              </Link>
              <Link
                to="/app/clientes"
                className="flex h-11 w-full items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold hover:bg-muted"
              >
                <UsersRound className="size-4 text-violet-600" /> Ver clientes{" "}
                <ChevronRight className="ml-auto size-4" />
              </Link>
            </div>
          </div>
          <div
            className="rounded-[24px] border border-[color:var(--brand-soft-strong)] p-5 text-white shadow-[var(--shadow-glow)]"
            style={{
              background: `linear-gradient(135deg, ${branding.primary}, color-mix(in srgb, ${branding.primary} 62%, black))`,
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[.15em] text-white/75">
              Dica de {branding.assistantName}
            </div>
            <h3 className="mt-2 font-display text-lg font-extrabold">Instale na tela inicial</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/80">
              Abra como um aplicativo, acesse sua operação com um toque e acompanhe os avisos dentro
              do painel.
            </p>
            <button
              onClick={() => window.dispatchEvent(new Event("marcia:request-install"))}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-extrabold text-[color:var(--brand-text)] shadow-lg"
            >
              <Download className="size-3.5" /> Instalar aplicativo
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}

function AppointmentRow({
  item,
  companyId,
  onStart,
  onComplete,
  onRefresh,
}: {
  item: MarciaAppointment;
  companyId: string;
  onStart: () => void;
  onComplete: () => void;
  onRefresh: () => void;
}) {
  const customer = item.marcia_customer?.name || "Cliente";
  const service = item.marcia_service?.name || item.title || "Atendimento";
  const professional = item.marcia_professional?.name || "Equipe";
  return (
    <article className="group grid gap-3 rounded-2xl border border-border bg-background/50 p-3.5 transition hover:border-violet-200 hover:bg-violet-50/40 sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center">
      <div className="flex items-center gap-2 sm:block">
        <div className="font-display text-xl font-black tracking-[-.04em]">
          {shortTime(item.starts_at)}
        </div>
        <div className="text-[10px] text-muted-foreground">até {shortTime(item.ends_at)}</div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-extrabold">{customer}</h3>
          <StatusPill status={item.status} label={appointmentLabels[item.status]} />
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {service} · {professional}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {["confirmed", "checked_in"].includes(item.status) && (
          <Button
            size="sm"
            onClick={onStart}
            className="rounded-lg bg-violet-700 hover:bg-violet-800"
          >
            <Play /> Iniciar
          </Button>
        )}
        {item.status === "in_progress" && (
          <Button
            size="sm"
            onClick={onComplete}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700"
          >
            <ClipboardCheck /> Concluir
          </Button>
        )}
        {!["completed", "cancelled", "no_show"].includes(item.status) && (
          <AppointmentActionsDialog
            appointment={item}
            companyId={companyId}
            onChanged={onRefresh}
            compact
          />
        )}
        {item.status === "completed" && (
          <NewWorkOrderDialog
            companyId={companyId}
            onCreated={onRefresh}
            appointment={{
              id: item.id,
              customerId: item.customer_id,
              professionalId: item.professional_id,
              title: service,
              startsAt: item.starts_at,
              priceCents: item.price_cents || 0,
            }}
          />
        )}
      </div>
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  color,
  compact,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  compact?: boolean;
}) {
  const palette: Record<string, string> = {
    violet: "bg-violet-100 text-violet-700",
    amber: "bg-amber-100 text-amber-700",
    cyan: "bg-cyan-100 text-cyan-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <div className="rounded-[22px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className={`grid size-9 place-items-center rounded-xl ${palette[color]}`}>
        <Icon className="size-[18px]" />
      </div>
      <div
        className={`mt-3 font-display font-black tracking-[-.04em] ${compact ? "text-lg" : "text-2xl"}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}

function ErrorBox({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <div className="font-bold">Ainda não consegui abrir a operação.</div>
      <p className="mt-1 text-sm opacity-80">{message}</p>
      <Button variant="outline" size="sm" onClick={retry} className="mt-3 bg-white">
        Tentar novamente
      </Button>
    </div>
  );
}

function dayLabel() {
  const hour = new Date().getHours();
  return hour < 12 ? "manhã" : hour < 18 ? "tarde" : "noite";
}
function assistantTitle(today: number, openOrders: number) {
  if (!today && !openOrders) return "Agenda tranquila";
  if (today && !openOrders) return `${today} atendimento${today === 1 ? "" : "s"} hoje`;
  return `${today} na agenda e ${openOrders} OS em aberto`;
}
function assistantText(today: number, openOrders: number) {
  if (!today && !openOrders)
    return "Quando chegar um pedido, você acompanha da conversa até a conclusão sem perder nenhuma etapa.";
  return "Eu organizei os próximos passos por horário. Comece o atendimento e emita a OS sem preencher tudo de novo.";
}
