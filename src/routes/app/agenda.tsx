import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addWeeks, format, isSameDay, startOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, UserRound } from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { NewAppointmentDialog } from "@/components/marcia/new-appointment-dialog";
import { AppointmentActionsDialog } from "@/components/marcia/appointment-actions-dialog";
import { EmptyState, LoadingBlocks, PageHeader, StatusPill } from "@/components/marcia/page-kit";
import {
  appointmentLabels,
  friendlyError,
  listAppointments,
  shortTime,
  type MarciaAppointment,
} from "@/lib/marcia";

export const Route = createFileRoute("/app/agenda")({
  beforeLoad: () => {
    throw redirect({ to: "/app/inicio" });
  },
  head: brandedRouteHead("Agenda"),
  component: AgendaPage,
});

function AgendaPage() {
  const ctx = Route.useRouteContext();
  const companyId = ctx.company?.id;
  const [week, setWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [appointments, setAppointments] = useState<MarciaAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(week, index)), [week]);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      setAppointments(await listAppointments(companyId, week, addDays(week, 7)));
    } catch (nextError) {
      setError(friendlyError(nextError));
    } finally {
      setLoading(false);
    }
  }, [companyId, week]);

  useEffect(() => {
    void load();
  }, [load]);

  function changeWeek(next: Date) {
    setWeek(next);
    setSelectedDay(next);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda interna"
        title="Agenda"
        description="A fonte oficial dos horários. Quando conectado, o Google Agenda recebe uma cópia dos agendamentos confirmados."
        action={companyId ? <NewAppointmentDialog companyId={companyId} onCreated={load} /> : null}
      />

      <section className="overflow-hidden rounded-[26px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => changeWeek(subWeeks(week, 1))}
              aria-label="Semana anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changeWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => changeWeek(addWeeks(week, 1))}
              aria-label="Próxima semana"
            >
              <ChevronRight />
            </Button>
          </div>
          <div className="font-display text-sm font-extrabold capitalize sm:text-base">
            {format(week, "dd 'de' MMMM", { locale: ptBR })} —{" "}
            {format(addDays(week, 6), "dd 'de' MMMM", { locale: ptBR })}
          </div>
          <div className="ml-auto hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
            <span className="size-2 rounded-full bg-violet-500" /> Horário ocupado
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-border p-3 md:hidden">
          {days.map((day) => {
            const active = isSameDay(day, selectedDay);
            const count = appointments.filter((item) =>
              isSameDay(new Date(item.starts_at), day),
            ).length;
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={`min-w-[64px] rounded-2xl px-3 py-2 text-center ${active ? "bg-violet-700 text-white" : "bg-muted"}`}
              >
                <div className="text-[10px] font-bold uppercase">
                  {format(day, "EEE", { locale: ptBR })}
                </div>
                <div className="font-display text-lg font-black">{format(day, "dd")}</div>
                {count > 0 && (
                  <div
                    className={`mx-auto mt-1 size-1.5 rounded-full ${active ? "bg-white" : "bg-violet-500"}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="p-5">
            <LoadingBlocks count={4} />
          </div>
        ) : error ? (
          <div className="m-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
            {error}
          </div>
        ) : (
          <>
            <div className="hidden min-h-[570px] grid-cols-7 divide-x divide-border md:grid">
              {days.map((day) => (
                <DayColumn
                  key={day.toISOString()}
                  day={day}
                  items={appointments.filter((item) => isSameDay(new Date(item.starts_at), day))}
                  companyId={companyId!}
                  reload={load}
                />
              ))}
            </div>
            <div className="p-3 md:hidden">
              <MobileDay
                day={selectedDay}
                items={appointments.filter((item) =>
                  isSameDay(new Date(item.starts_at), selectedDay),
                )}
                companyId={companyId!}
                reload={load}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function DayColumn({
  day,
  items,
  companyId,
  reload,
}: {
  day: Date;
  items: MarciaAppointment[];
  companyId: string;
  reload: () => void;
}) {
  const today = isSameDay(day, new Date());
  return (
    <div className="min-w-0 bg-background/20">
      <div
        className={`border-b border-border px-2 py-3 text-center ${today ? "bg-violet-50" : ""}`}
      >
        <div className="text-[10px] font-bold uppercase text-muted-foreground">
          {format(day, "EEE", { locale: ptBR })}
        </div>
        <div
          className={`mx-auto mt-1 grid size-8 place-items-center rounded-full font-display text-sm font-black ${today ? "bg-violet-700 text-white" : ""}`}
        >
          {format(day, "dd")}
        </div>
      </div>
      <div className="space-y-2 p-2">
        {items.length === 0 ? (
          <div className="py-12 text-center text-[10px] text-muted-foreground">Livre</div>
        ) : (
          items.map((item) => (
            <CompactEvent key={item.id} item={item} companyId={companyId} reload={reload} />
          ))
        )}
      </div>
    </div>
  );
}

function CompactEvent({
  item,
  companyId,
  reload,
}: {
  item: MarciaAppointment;
  companyId: string;
  reload: () => void;
}) {
  return (
    <article className="rounded-xl border border-violet-200 bg-gradient-to-br from-white to-violet-50 p-2.5 shadow-sm">
      <div className="flex items-center gap-1 text-[10px] font-extrabold text-violet-700">
        <Clock3 className="size-3" /> {shortTime(item.starts_at)}
      </div>
      <h3 className="mt-1 truncate text-[11px] font-extrabold">
        {item.marcia_customer?.name || "Cliente"}
      </h3>
      <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
        {item.marcia_service?.name || item.title}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1 flex-1 rounded-full bg-violet-200">
          <div className="h-full w-2/3 rounded-full bg-violet-500" />
        </div>
        <AppointmentActionsDialog
          appointment={item}
          companyId={companyId}
          onChanged={reload}
          compact
        />
      </div>
    </article>
  );
}

function MobileDay({
  day,
  items,
  companyId,
  reload,
}: {
  day: Date;
  items: MarciaAppointment[];
  companyId: string;
  reload: () => void;
}) {
  if (!items.length)
    return (
      <EmptyState
        title="Nenhum horário neste dia"
        description="O dia está livre para receber novos agendamentos."
        action={<NewAppointmentDialog companyId={companyId} onCreated={reload} />}
      />
    );
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-border bg-background/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-violet-700">
                <Clock3 className="size-3.5" />
                {shortTime(item.starts_at)} — {shortTime(item.ends_at)}
              </div>
              <h3 className="mt-2 font-extrabold">{item.marcia_customer?.name || "Cliente"}</h3>
              <p className="text-xs text-muted-foreground">
                {item.marcia_service?.name || item.title}
              </p>
            </div>
            <StatusPill status={item.status} label={appointmentLabels[item.status]} />
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <UserRound className="size-3.5" />
            {item.marcia_professional?.name || "Equipe"}
            <div className="ml-auto">
              <AppointmentActionsDialog
                appointment={item}
                companyId={companyId}
                onChanged={reload}
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
