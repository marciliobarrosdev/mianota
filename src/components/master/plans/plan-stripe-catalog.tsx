/**
 * Escolha (ou criação automática) do preço Stripe de um plano, sem copiar códigos.
 * Montado só quando o modo de pagamento é "Stripe integrado" e consulta o catálogo ao abrir.
 * As chaves ficam no servidor (`stripe-admin.functions.ts`); aqui só chegam ids e valores.
 */
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  createStripePlanPrice,
  listStripeRecurringPrices,
  type StripeCatalogPrice,
} from "@/lib/master/stripe-admin.functions";
import {
  formatPlanPrice as formatBRL,
  isValidPlanPrice,
  type PlanDraft,
} from "@/lib/billing/plan-form-rules";
import { PlanField as Field } from "@/components/master/plans/plan-field";

type Props = {
  editing: PlanDraft;
  setEditing: Dispatch<SetStateAction<PlanDraft | null>>;
};

export function PlanStripeCatalog({ editing, setEditing }: Props) {
  const fetchStripePrices = useServerFn(listStripeRecurringPrices);
  const createStripePrice = useServerFn(createStripePlanPrice);
  const [stripePrices, setStripePrices] = useState<StripeCatalogPrice[]>([]);
  const [stripeBusy, setStripeBusy] = useState<null | "list" | "create">(null);
  const [stripeError, setStripeError] = useState<string | null>(null);

  async function loadStripeCatalog() {
    setStripeBusy("list");
    setStripeError(null);
    try {
      const result = await fetchStripePrices();
      setStripePrices(result.prices);
      if (result.prices.length === 0) {
        setStripeError("Sua conta Stripe ainda não possui preços recorrentes ativos.");
      }
    } catch (error) {
      setStripeError(
        error instanceof Error ? error.message : "Não foi possível consultar o Stripe.",
      );
    } finally {
      setStripeBusy(null);
    }
  }

  useEffect(() => {
    void loadStripeCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createPriceFromPlan() {
    if (!editing.nome?.trim() || !editing.slug?.trim()) {
      return toast.error("Preencha o nome e o slug do plano primeiro.");
    }
    if (!isValidPlanPrice(editing.preco_cents) || !editing.preco_cents)
      return toast.error("Informe o preço do plano, por exemplo R$ 49,00.");
    setStripeBusy("create");
    setStripeError(null);
    try {
      const result = await createStripePrice({
        data: {
          slug: editing.slug,
          name: editing.nome,
          description: editing.descricao,
          amountCents: Number(editing.preco_cents),
          currency: editing.moeda || "BRL",
          interval: editing.intervalo === "year" ? "year" : "month",
        },
      });
      setStripePrices((current) => [
        result.price,
        ...current.filter((price) => price.id !== result.price.id),
      ]);
      setEditing((current) =>
        current
          ? {
              ...current,
              checkout_mode: "stripe",
              stripe_price_id: result.price.id,
              stripe_product_id: result.price.productId,
            }
          : current,
      );
      toast.success("Produto e preço criados no Stripe. Agora salve o plano.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar no Stripe.";
      setStripeError(message);
      toast.error(message);
    } finally {
      setStripeBusy(null);
    }
  }

  return (
    <Field label="Catálogo conectado ao Stripe" full>
      <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Escolha ou crie sem copiar códigos</div>
              <p className="text-[11px] text-muted-foreground">
                O sistema consulta produtos e preços diretamente da conta configurada.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={loadStripeCatalog}
            disabled={stripeBusy !== null}
          >
            {stripeBusy === "list" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Atualizar
          </Button>
        </div>

        {stripePrices.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-[11px]">Produto e preço recorrente</Label>
            <select
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
              value={editing.stripe_price_id ?? ""}
              onChange={(event) => {
                const selected = stripePrices.find((price) => price.id === event.target.value);
                setEditing({
                  ...editing,
                  stripe_price_id: event.target.value || null,
                  stripe_product_id: selected?.productId || null,
                });
              }}
            >
              <option value="">Selecione um preço do Stripe</option>
              {editing.stripe_price_id &&
                !stripePrices.some((price) => price.id === editing.stripe_price_id) && (
                  <option value={editing.stripe_price_id}>Preço já vinculado</option>
                )}
              {stripePrices.map((price) => (
                <option key={price.id} value={price.id}>
                  {price.productName} · {formatBRL(price.amountCents, price.currency)} /
                  {price.interval === "month" ? "mês" : "ano"} ·{" "}
                  {price.livemode ? "produção" : "teste"}
                </option>
              ))}
            </select>
          </div>
        )}

        {stripeError && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{stripeError}</span>
            </div>
            <Link
              to="/master/pagamentos"
              className="mt-1.5 inline-flex font-semibold underline underline-offset-2"
            >
              Abrir Integrações
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-sm text-[11px] text-muted-foreground">
            Cria no Stripe usando o nome,{" "}
            {formatBRL(Number(editing.preco_cents || 0), editing.moeda || "BRL")} e o intervalo
            deste plano.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={createPriceFromPlan}
            disabled={stripeBusy !== null}
          >
            {stripeBusy === "create" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Criar automaticamente no Stripe
          </Button>
        </div>

        {editing.stripe_price_id && (
          <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5" />
            Preço selecionado e pronto para salvar neste plano.
          </div>
        )}
      </div>
    </Field>
  );
}
