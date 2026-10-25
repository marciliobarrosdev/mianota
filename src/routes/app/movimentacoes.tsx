/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, Plus } from "lucide-react";
import { toast } from "sonner";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { PageHeader } from "@/components/marcia/page-kit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/money-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FinanceEmpty, FinanceError, FinanceLoading } from "@/components/finance/finance-states";
import { TransactionsView } from "@/components/finance/transactions-view";
import {
  addFinanceTransaction,
  listFinanceTransactions,
  type FinanceTransactionDetail,
} from "@/lib/finance-dashboard.functions";
import {
  PAYMENT_METHOD_LABELS,
  resolveFinancePeriod,
  toIsoDate,
  type FinancePeriod,
} from "@/lib/finance-period";

export const Route = createFileRoute("/app/movimentacoes")({
  head: brandedRouteHead("Movimentações"),
  component: TransactionsPage,
});

type Payload = {
  items: FinanceTransactionDetail[];
  categories: Array<{ id: string; name: string; color: string; type: string }>;
  accounts: Array<{ id: string; name: string }>;
};

function TransactionsPage() {
  const branding = useBrand();
  const ctx = Route.useRouteContext();
  const companyId = ctx.company?.id;
  const list = useServerFn(listFinanceTransactions);
  const [period, setPeriod] = useState<FinancePeriod>(() => resolveFinancePeriod("this_month"));
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      setData(await list({ data: { companyId, from: period.from, to: period.to } }));
    } catch (e: any) {
      setError(e?.message || "Não foi possível carregar as movimentações.");
    } finally {
      setLoading(false);
    }
  }, [companyId, list, period.from, period.to]);

  useEffect(() => {
    void refresh();
    const onUpdate = () => void refresh();
    window.addEventListener("marcia:finance-updated", onUpdate);
    return () => window.removeEventListener("marcia:finance-updated", onUpdate);
  }, [refresh]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Seu extrato"
        title="Movimentações"
        description="Tudo que entrou pelo chat, WhatsApp, foto ou registro manual, com todos os detalhes."
        action={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" className="rounded-xl">
              <Link to="/app/marcia">
                <Mic /> Registrar falando
              </Link>
            </Button>
            {companyId && data && (
              <NewTransactionDialog companyId={companyId} data={data} onCreated={refresh} />
            )}
          </div>
        }
      />
      {loading && !data ? (
        <FinanceLoading />
      ) : error && !data ? (
        <FinanceError message={error} retry={refresh} />
      ) : data ? (
        <TransactionsView
          items={data.items}
          period={period}
          onPeriodChange={setPeriod}
          loading={loading}
          emptyState={
            <FinanceEmpty
              title="Nenhuma movimentação neste período"
              description={`Comece falando do seu jeito. ${branding.assistantName} organiza valor, data, categoria e forma de pagamento antes de salvar.`}
              example="Gastei 87 na farmácia hoje no Pix"
            />
          }
        />
      ) : null}
    </div>
  );
}

function NewTransactionDialog({
  companyId,
  data,
  onCreated,
}: {
  companyId: string;
  data: Payload;
  onCreated: () => void;
}) {
  const add = useServerFn(addFinanceTransaction);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<"receita" | "despesa">("despesa");
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [categoryId, setCategoryId] = useState("none");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [note, setNote] = useState("");
  const categories = data.categories.filter((c) => c.type === type || c.type === "ambos");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (amountCents == null || amountCents <= 0) {
      toast.error("Informe um valor maior que zero, por exemplo R$ 87,50.");
      return;
    }
    setSaving(true);
    try {
      await add({
        data: {
          companyId,
          type,
          description,
          amountCents,
          date,
          categoryId: categoryId === "none" ? null : categoryId,
          paymentMethod,
          merchant: merchant || null,
          note: note || null,
          status: "pago",
          source: "manual",
        } as any,
      });
      toast.success(type === "receita" ? "Entrada registrada." : "Saída registrada.");
      setOpen(false);
      setDescription("");
      setMerchant("");
      setAmountCents(null);
      setNote("");
      onCreated();
      window.dispatchEvent(new CustomEvent("marcia:finance-updated"));
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-xl bg-[color:var(--brand)]">
          <Plus /> Novo lançamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-black">Novo lançamento</DialogTitle>
          <DialogDescription>Registro manual. Pelo chat é ainda mais rápido.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(["despesa", "receita"] as const).map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => {
                  setType(value);
                  setCategoryId("none");
                }}
                className={`rounded-xl border px-4 py-2.5 text-sm font-extrabold ${type === value ? (value === "receita" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-rose-300 bg-rose-50 text-rose-800") : "border-border"}`}
              >
                {value === "receita" ? "Entrada" : "Saída"}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Mercado"
                className="mt-1 h-10 rounded-xl"
                required
              />
            </div>
            <div>
              <Label>Estabelecimento</Label>
              <Input
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Opcional"
                className="mt-1 h-10 rounded-xl"
              />
            </div>
            <div>
              <Label>Valor</Label>
              <MoneyInput
                aria-label="Valor"
                cents={amountCents}
                onChange={setAmountCents}
                required
                allowZero={false}
                className="mt-1 h-10 rounded-xl"
              />
            </div>
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-10 rounded-xl"
                required
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1 h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1 h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opcional"
              className="mt-1 min-h-[64px] rounded-xl"
            />
          </div>
          <Button disabled={saving} className="h-10 w-full rounded-xl bg-[color:var(--brand)]">
            {saving ? "Salvando…" : "Salvar lançamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
