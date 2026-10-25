import { useState } from "react";
import { Loader2, UserRoundPlus } from "lucide-react";
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
import { createCustomer, friendlyError } from "@/lib/marcia";
import { EMAIL_INPUT_PROPS, emailError, normalizeEmail } from "@/lib/masks";
import {
  PHONE_INPUT_PROPS,
  brazilianPhoneError,
  maskBrazilianPhoneInput,
  normalizeValidBrazilianPhone,
} from "@/lib/phone";

const control =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

export function NewCustomerDialog({
  companyId,
  onCreated,
}: {
  companyId: string;
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return toast.error("Informe o nome do cliente.");
    const phoneProblem = brazilianPhoneError(phone);
    if (phoneProblem) return toast.error(phoneProblem);
    const emailProblem = emailError(email, { required: false });
    if (emailProblem) return toast.error(emailProblem);
    const normalizedPhone = normalizeValidBrazilianPhone(phone)!;
    setLoading(true);
    try {
      await createCustomer({
        company_id: companyId,
        name: name.trim(),
        phone_e164: normalizedPhone,
        email: normalizeEmail(email) || null,
        notes: notes.trim() || null,
        tags: [],
      });
      toast.success("Cliente adicionado.");
      setOpen(false);
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");
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
        <Button className="h-11 rounded-xl bg-violet-700 hover:bg-violet-800">
          <UserRoundPlus /> Novo cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[24px] border-violet-200 bg-white p-6 text-[#1d1530] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold">Novo cliente</DialogTitle>
          <DialogDescription>
            Cadastre só o essencial para usar o cliente nos próximos agendamentos e ordens de
            serviço.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-4">
          <label className="block space-y-1.5 text-sm font-bold">
            Nome
            <input
              className={control}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do cliente"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-bold">
              WhatsApp
              <input
                {...PHONE_INPUT_PROPS}
                className={control}
                value={phone}
                onChange={(e) => setPhone(maskBrazilianPhoneInput(e.target.value))}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-bold">
              E-mail <span className="font-normal text-muted-foreground">(opcional)</span>
              <input
                {...EMAIL_INPUT_PROPS}
                className={control}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmail(normalizeEmail(email))}
                autoComplete="email"
                placeholder="cliente@email.com"
              />
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-bold">
            Observações
            <textarea
              className={`${control} h-20 resize-none py-3`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-violet-700 hover:bg-violet-800"
            >
              {loading ? <Loader2 className="animate-spin" /> : <UserRoundPlus />} Salvar cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
