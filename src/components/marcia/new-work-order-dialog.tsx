import { useEffect, useState } from "react";
import { ClipboardPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createWorkOrder, friendlyError, listCustomers, listProfessionals, type MarciaCustomer, type MarciaProfessional } from "@/lib/marcia";

const control = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

export function NewWorkOrderDialog({ companyId, onCreated, appointment }: {
  companyId: string;
  onCreated?: () => void;
  appointment?: { id: string; customerId: string; professionalId?: string; title: string; startsAt?: string; priceCents?: number };
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<MarciaCustomer[]>([]);
  const [professionals, setProfessionals] = useState<MarciaProfessional[]>([]);
  const [customerId, setCustomerId] = useState(appointment?.customerId || "");
  const [professionalId, setProfessionalId] = useState(appointment?.professionalId || "");
  const [summary, setSummary] = useState(appointment?.title || "");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState(appointment?.priceCents ? String(appointment.priceCents / 100) : "");

  useEffect(() => {
    if (!open) return;
    void Promise.all([listCustomers(companyId), listProfessionals(companyId)]).then(([nextCustomers, nextProfessionals]) => {
      setCustomers(nextCustomers);
      setProfessionals(nextProfessionals);
      setCustomerId((current) => current || nextCustomers[0]?.id || "");
    }).catch((error) => toast.error(friendlyError(error)));
  }, [open, companyId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!customerId || !summary.trim()) return toast.error("Informe o cliente e o serviço executado.");
    setLoading(true);
    try {
      await createWorkOrder({
        companyId,
        appointmentId: appointment?.id,
        customerId,
        professionalId: professionalId || null,
        summary: summary.trim(),
        description: description.trim(),
        scheduledAt: appointment?.startsAt,
        totalCents: Math.round(Number(value.replace(",", ".") || 0) * 100),
      });
      toast.success("Ordem de serviço emitida.");
      setOpen(false);
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
        {appointment ? <Button variant="outline" size="sm" className="rounded-lg"><ClipboardPlus /> Emitir OS</Button> : <Button className="h-11 rounded-xl bg-violet-700 hover:bg-violet-800"><ClipboardPlus /> Nova OS</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[24px] border-violet-200 bg-white p-6 text-[#1d1530] sm:max-w-xl">
        <DialogHeader><DialogTitle className="font-display text-xl font-extrabold">Emitir ordem de serviço</DialogTitle><DialogDescription>Registre o que será feito, para quem e o valor combinado.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-4">
          <label className="block space-y-1.5 text-sm font-bold">Cliente
            <select className={control} value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={Boolean(appointment)}><option value="">Selecione</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
            <label className="block space-y-1.5 text-sm font-bold">Serviço
              <input className={control} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Ex.: Manutenção do ar-condicionado" />
            </label>
            <label className="block space-y-1.5 text-sm font-bold">Valor
              <input className={control} value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="0,00" />
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-bold">Responsável
            <select className={control} value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}><option value="">Sem responsável</option>{professionals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <label className="block space-y-1.5 text-sm font-bold">Descrição
            <textarea className={`${control} h-24 resize-none py-3`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o serviço e as observações para execução." />
          </label>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={loading} className="rounded-xl bg-violet-700 hover:bg-violet-800">{loading ? <Loader2 className="animate-spin" /> : <ClipboardPlus />} Emitir OS</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
