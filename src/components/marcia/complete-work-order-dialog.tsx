import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, WalletCards } from "lucide-react";
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
import { completeWorkOrder } from "@/lib/work-order.functions";
import { friendlyError, type MarciaWorkOrder } from "@/lib/marcia";

const control = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

export function CompleteWorkOrderDialog({
  companyId,
  order,
  onCompleted,
}: {
  companyId: string;
  order: MarciaWorkOrder;
  onCompleted?: () => void;
}) {
  const complete = useServerFn(completeWorkOrder);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(String(Number(order.total_cents || 0) / 100).replace(".", ","));
  const [cost, setCost] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [notes, setNotes] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await complete({
        data: {
          companyId,
          workOrderId: order.id,
          amountCents: Math.round(Number(amount.replace(",", ".") || 0) * 100),
          costCents: Math.round(Number(cost.replace(",", ".") || 0) * 100),
          paymentStatus,
          paymentMethod: paymentStatus === "paid" ? paymentMethod : null,
          finalNotes: notes,
        },
      });
      toast.success(result.financeRecorded ? "OS concluída e financeiro atualizado." : "OS concluída com sucesso.");
      setOpen(false);
      onCompleted?.();
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-lg bg-emerald-600 hover:bg-emerald-700">
          <CheckCircle2 /> Concluir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[24px] border-violet-200 bg-white p-6 text-[#1d1530] sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><WalletCards /></div>
          <DialogTitle className="font-display text-xl font-black">Fechar OS #{String(order.number).padStart(3, "0")}</DialogTitle>
          <DialogDescription>Confirme o resultado do serviço e o pagamento. A MárcIA organiza o financeiro.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-2 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-bold">Valor final
              <input className={control} value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0,00" />
            </label>
            <label className="space-y-1.5 text-sm font-bold">Custo <span className="font-medium text-muted-foreground">(opcional)</span>
              <input className={control} value={cost} onChange={(event) => setCost(event.target.value)} inputMode="decimal" placeholder="0,00" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-violet-50 p-1.5">
            <button type="button" onClick={() => setPaymentStatus("paid")} className={`rounded-xl px-3 py-2.5 text-sm font-bold ${paymentStatus === "paid" ? "bg-white text-violet-800 shadow-sm" : "text-muted-foreground"}`}>Recebido</button>
            <button type="button" onClick={() => setPaymentStatus("pending")} className={`rounded-xl px-3 py-2.5 text-sm font-bold ${paymentStatus === "pending" ? "bg-white text-amber-700 shadow-sm" : "text-muted-foreground"}`}>Ficou pendente</button>
          </div>
          {paymentStatus === "paid" && (
            <label className="space-y-1.5 text-sm font-bold">Como o cliente pagou?
              <select className={control} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="pix">Pix</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option><option value="transferencia">Transferência</option><option value="boleto">Boleto</option><option value="outro">Outro</option>
              </select>
            </label>
          )}
          <label className="block space-y-1.5 text-sm font-bold">Como o serviço terminou? <span className="font-medium text-muted-foreground">(opcional)</span>
            <textarea className={`${control} h-24 resize-none py-3`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: serviço concluído, cliente aprovou, retorno em 30 dias." />
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Voltar</Button>
            <Button type="submit" disabled={loading} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">{loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Confirmar fechamento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
