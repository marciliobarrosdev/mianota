import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarPlus, Loader2, Plus, UserRoundPlus } from "lucide-react";
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
  createCustomer,
  friendlyError,
  listCustomers,
  listProfessionals,
  listServices,
  reserveAppointment,
  type MarciaCustomer,
  type MarciaProfessional,
  type MarciaService,
} from "@/lib/marcia";
import {
  PHONE_INPUT_PROPS,
  brazilianPhoneError,
  formatBrazilianPhone,
  maskBrazilianPhoneInput,
  normalizeValidBrazilianPhone,
} from "@/lib/phone";
import { syncMarciaAppointmentToGoogle } from "@/lib/google.functions";
import { operationLocalInputToIso, isoToOperationLocalInput } from "@/lib/timezone";

const control =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

export function NewAppointmentDialog({
  companyId,
  onCreated,
}: {
  companyId: string;
  onCreated?: () => void;
}) {
  const syncGoogle = useServerFn(syncMarciaAppointmentToGoogle);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<MarciaCustomer[]>([]);
  const [professionals, setProfessionals] = useState<MarciaProfessional[]>([]);
  const [services, setServices] = useState<MarciaService[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [startsAt, setStartsAt] = useState(defaultDateTime());
  const [notes, setNotes] = useState("");
  const [newCustomer, setNewCustomer] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    if (!open) return;
    void Promise.all([
      listCustomers(companyId),
      listProfessionals(companyId),
      listServices(companyId),
    ])
      .then(([nextCustomers, nextProfessionals, nextServices]) => {
        setCustomers(nextCustomers);
        setProfessionals(nextProfessionals);
        setServices(nextServices);
        setCustomerId((current) => current || nextCustomers[0]?.id || "");
        setProfessionalId((current) => current || nextProfessionals[0]?.id || "");
        setServiceId((current) => current || nextServices[0]?.id || "");
      })
      .catch((error) => toast.error(friendlyError(error)));
  }, [open, companyId]);

  const selectedService = useMemo(
    () => services.find((item) => item.id === serviceId),
    [services, serviceId],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!professionalId || !serviceId || !startsAt)
      return toast.error("Escolha serviço, profissional e horário.");
    const normalizedCustomerPhone = newCustomer
      ? normalizeValidBrazilianPhone(customerPhone)
      : null;
    if (newCustomer && !customerName.trim()) return toast.error("Informe o nome do cliente.");
    if (newCustomer) {
      const phoneProblem = brazilianPhoneError(customerPhone);
      if (phoneProblem) return toast.error(phoneProblem);
    }
    if (!newCustomer && !customerId) return toast.error("Escolha um cliente.");

    setLoading(true);
    try {
      let finalCustomerId = customerId;
      if (newCustomer) {
        const customer = await createCustomer({
          company_id: companyId,
          name: customerName.trim(),
          phone_e164: normalizedCustomerPhone,
          email: null,
          notes: null,
          tags: [],
        });
        finalCustomerId = customer.id;
      }
      const startsAtIso = operationLocalInputToIso(startsAt);
      if (!startsAtIso) throw new Error("Escolha uma data e um horário válidos.");
      const appointment = await reserveAppointment({
        companyId,
        professionalId,
        customerId: finalCustomerId,
        serviceId,
        startsAt: startsAtIso,
        status: "confirmed",
        title: selectedService?.name || "Atendimento",
        notes,
      });
      let googleSynced = false;
      let googleFailed = false;
      try {
        const sync = await syncGoogle({ data: { companyId, appointmentId: appointment.id } });
        googleSynced = !sync.skipped;
      } catch {
        googleFailed = true;
        toast.warning("Agendamento salvo. O Google Agenda não sincronizou agora.");
      }
      if (!googleFailed) {
        toast.success(
          googleSynced
            ? "Agendamento confirmado e espelhado no Google."
            : "Agendamento confirmado na agenda interna.",
        );
      }
      setOpen(false);
      setNotes("");
      setStartsAt(defaultDateTime());
      onCreated?.();
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-xl bg-gradient-to-r from-violet-700 to-purple-500 px-4 shadow-[0_12px_24px_-12px_rgba(109,40,217,.8)] hover:from-violet-800 hover:to-purple-600">
          <CalendarPlus /> Novo agendamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[24px] border-violet-200 bg-white p-0 text-[#1d1530] sm:max-w-xl">
        <div className="border-b border-violet-100 bg-gradient-to-br from-violet-50 to-white p-6">
          <DialogHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-xl bg-violet-700 text-white">
              <CalendarPlus className="size-5" />
            </div>
            <DialogTitle className="font-display text-xl font-extrabold">
              Novo agendamento
            </DialogTitle>
            <DialogDescription>
              Escolha o cliente, o serviço e um horário disponível.
            </DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-bold">Cliente</label>
            <button
              type="button"
              onClick={() => setNewCustomer((value) => !value)}
              className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:text-violet-900"
            >
              {newCustomer ? (
                "Escolher existente"
              ) : (
                <>
                  <UserRoundPlus className="size-3.5" /> Novo cliente
                </>
              )}
            </button>
          </div>
          {newCustomer ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className={control}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome do cliente"
              />
              <input
                {...PHONE_INPUT_PROPS}
                className={control}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(maskBrazilianPhoneInput(e.target.value))}
              />
            </div>
          ) : (
            <select
              className={control}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Selecione um cliente</option>
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {formatBrazilianPhone(item.phone_e164)}
                </option>
              ))}
            </select>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-bold">
              Serviço
              <select
                className={control}
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">Selecione</option>
                {services.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.duration_minutes} min
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-bold">
              Profissional
              <select
                className={control}
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
              >
                <option value="">Selecione</option>
                {professionals.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1.5 text-sm font-bold">
            Data e horário
            <input
              className={control}
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm font-bold">
            Observação <span className="font-medium text-muted-foreground">(opcional)</span>
            <textarea
              className={`${control} h-20 resize-none py-3`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Algo importante para o atendimento?"
            />
          </label>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-violet-700 hover:bg-violet-800"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Plus />} Confirmar agendamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaultDateTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return isoToOperationLocalInput(date);
}
