import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Loader2, Settings2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  cancelAppointment,
  friendlyError,
  rescheduleAppointment,
  type MarciaAppointment,
} from "@/lib/marcia";
import { syncMarciaAppointmentToGoogle } from "@/lib/google.functions";
import { operationLocalInputToIso, isoToOperationLocalInput } from "@/lib/timezone";

const control = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

export function AppointmentActionsDialog({
  appointment,
  companyId,
  onChanged,
  compact = false,
}: {
  appointment: MarciaAppointment;
  companyId: string;
  onChanged?: () => void;
  compact?: boolean;
}) {
  const syncGoogle = useServerFn(syncMarciaAppointmentToGoogle);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"reschedule" | "cancel" | null>(null);
  const [startsAt, setStartsAt] = useState(toLocalInput(appointment.starts_at));
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setStartsAt(toLocalInput(appointment.starts_at));
  }, [open, appointment.starts_at]);

  async function syncAfterLocalChange(successMessage: string) {
    try {
      const sync = await syncGoogle({ data: { companyId, appointmentId: appointment.id } });
      toast.success(sync.skipped ? successMessage : `${successMessage} Google Agenda atualizado.`);
    } catch {
      toast.warning(`${successMessage} O Google Agenda não sincronizou agora.`);
    }
    setOpen(false);
    onChanged?.();
  }

  async function reschedule() {
    if (!startsAt) return toast.error("Escolha a nova data e horário.");
    setLoading("reschedule");
    try {
      const startsAtIso = operationLocalInputToIso(startsAt);
      if (!startsAtIso) throw new Error("Escolha uma data e um horário válidos.");
      await rescheduleAppointment(companyId, appointment.id, startsAtIso);
      await syncAfterLocalChange("Agendamento remarcado.");
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setLoading(null);
    }
  }

  async function cancel() {
    setLoading("cancel");
    try {
      await cancelAppointment(companyId, appointment.id, reason);
      await syncAfterLocalChange("Agendamento cancelado.");
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setLoading(null);
    }
  }

  const closed = ["completed", "cancelled", "no_show"].includes(appointment.status);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size={compact ? "icon" : "sm"} variant="outline" className="rounded-lg" disabled={closed} title={closed ? "Agendamento encerrado" : "Remarcar ou cancelar"}>
          <Settings2 className="size-4" />{!compact && " Gerenciar"}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[24px] sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><CalendarClock className="size-5" /></div>
          <DialogTitle>Gerenciar agendamento</DialogTitle>
          <DialogDescription>{appointment.marcia_customer?.name || "Cliente"} · {appointment.marcia_service?.name || appointment.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
            <label className="text-sm font-bold">Nova data e horário</label>
            <input className={control} type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            <Button type="button" onClick={reschedule} disabled={!!loading} className="w-full rounded-xl bg-violet-700 hover:bg-violet-800">
              {loading === "reschedule" ? <Loader2 className="animate-spin" /> : <CalendarClock />} Remarcar
            </Button>
          </div>

          <div className="space-y-2 rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
            <label className="text-sm font-bold text-rose-900">Cancelar horário</label>
            <input className={control} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo opcional" />
            <Button type="button" variant="outline" onClick={cancel} disabled={!!loading} className="w-full rounded-xl border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-800">
              {loading === "cancel" ? <Loader2 className="animate-spin" /> : <XCircle />} Cancelar agendamento
            </Button>
          </div>
        </div>

        <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={!!loading}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toLocalInput(value: string) {
  return isoToOperationLocalInput(value);
}
