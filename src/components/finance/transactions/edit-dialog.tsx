/* eslint-disable @typescript-eslint/no-explicit-any */
/** Diálogo de edição de uma movimentação. */
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinanceTransactionDetail } from "@/lib/finance/finance-dashboard.functions";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance/finance-period";
import { TagInput } from "../transactions-extras";
import type { TxEditPatch } from "../transactions-view";

export function EditDialog({
  item,
  categories,
  tagSuggestions,
  onClose,
  onSave,
  busy,
}: {
  item: FinanceTransactionDetail;
  categories: { id: string; name: string; type: string }[];
  tagSuggestions: string[];
  onClose: () => void;
  onSave: (patch: TxEditPatch) => void;
  busy: boolean;
}) {
  const [description, setDescription] = useState(item.description);
  const [merchant, setMerchant] = useState(item.merchant || "");
  const [amountCents, setAmountCents] = useState<number | null>(item.amountCents);
  const [date, setDate] = useState(item.date);
  const [categoryId, setCategoryId] = useState(item.categoryId || "none");
  const [paymentMethod, setPaymentMethod] = useState(item.paymentMethod || "none");
  const [payError, setPayError] = useState(false);
  const [note, setNote] = useState(item.note || "");
  const [learn, setLearn] = useState(true);
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const split = Boolean(item.splits?.length);
  const options = categories.filter((c) => c.type === item.type || !c.type);
  const categoryChanged = (categoryId === "none" ? null : categoryId) !== (item.categoryId || null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!amountCents || !description.trim()) return;
    if (paymentMethod === "none") { setPayError(true); return; }
    onSave({
      description: description.trim(),
      merchant: merchant.trim() || null,
      amountCents,
      date,
      categoryId: categoryId === "none" ? null : categoryId,
      paymentMethod: paymentMethod === "none" ? null : paymentMethod,
      note: note.trim() || null,
      tags,
      learn: learn && categoryChanged,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar movimentação</DialogTitle>
          <DialogDescription>As mudanças aparecem também no calendário e nos avisos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={240} />
            </div>
            <div className="space-y-1">
              <Label>Estabelecimento</Label>
              <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Opcional" maxLength={160} />
            </div>
            <div className="space-y-1">
              <Label>Valor</Label>
              <MoneyInput aria-label="Valor" cents={amountCents} onChange={setAmountCents} required allowZero={false} disabled={split} />
              {split && <p className="text-[10px] text-muted-foreground">Dividido: ajuste a divisão para mudar o valor.</p>}
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Forma de pagamento *</Label>
              <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); setPayError(false); }}>
                <SelectTrigger aria-invalid={payError}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {paymentMethod === "none" && <SelectItem value="none" disabled>Selecione</SelectItem>}
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              {payError && <p className="text-xs text-destructive">Informe a forma de pagamento</p>}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {options.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {categoryChanged && categoryId !== "none" && (
                <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={learn} onCheckedChange={(v) => setLearn(Boolean(v))} />
                  Ensinar a MIA a usar esta categoria para “{merchant || description}”
                </label>
              )}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Tags</Label>
              <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Observação</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Opcional" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={busy || !amountCents}>Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
