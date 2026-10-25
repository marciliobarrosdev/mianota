import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/auth/realm-supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { brandedRouteHead } from "@/config/brand";
import { toast } from "sonner";
import {
  Edit3,
  Star,
  Loader2,
  Package,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Sparkles,
} from "lucide-react";
import {
  createStripePlanPrice,
  listStripeRecurringPrices,
  type StripeCatalogPrice,
} from "@/lib/stripe-admin.functions";
import { listPlansBasic } from "@/lib/master.functions";
import { MoneyInput } from "@/components/money-input";
import { DEFAULT_MAX_CENTS } from "@/lib/money";
import { isValidHttpUrl } from "@/lib/masks";

function isValidPlanPrice(cents: unknown): cents is number {
  return (
    typeof cents === "number" &&
    Number.isSafeInteger(cents) &&
    cents >= 0 &&
    cents <= DEFAULT_MAX_CENTS
  );
}

export const Route = createFileRoute("/master/planos")({
  head: brandedRouteHead("Planos"),
  component: PlanosPage,
});

type Plan = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  preco_cents: number;
  moeda: string;
  intervalo: "month" | "year";
  trial_days: number;
  creditos_mensais: number;
  creditos_trial: number;
  limite_mensagens: number;
  limite_instancias: number;
  limite_usuarios: number;
  limite_contatos: number;
  features: string[];
  destaque: boolean;
  ativo: boolean;
  ordem: number;
  paddle_product_id: string | null;
  paddle_price_id: string | null;
  checkout_url: string | null;
  checkout_mode: "external" | "stripe";
  stripe_price_id: string | null;
  stripe_product_id: string | null;
};

function PlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Plan> | null>(null);
  const [saving, setSaving] = useState(false);
  const [featuresText, setFeaturesText] = useState("");
  const fetchStripePrices = useServerFn(listStripeRecurringPrices);
  const createStripePrice = useServerFn(createStripePlanPrice);
  const ensureCanonicalPlans = useServerFn(listPlansBasic);
  const [stripePrices, setStripePrices] = useState<StripeCatalogPrice[]>([]);
  const [stripeBusy, setStripeBusy] = useState<null | "list" | "create">(null);
  const [stripeError, setStripeError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      // Fresh Lovable remixes can inherit the historical bootstrap function.
      // Normalize the offer before the owner can see or sell stale prices.
      await ensureCanonicalPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível conferir os planos.");
    }
    const { data, error } = await supabase
      .from("plan")
      .select("*")
      .neq("slug", "business")
      .order("ordem", { ascending: true });
    if (error) toast.error(error.message);
    setPlans((data ?? []) as any);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function openEdit(p: Plan) {
    setEditing({ ...p });
    setFeaturesText((p.features || []).join("\n"));
    resetStripeCatalog();
    if (p.checkout_mode === "stripe") void loadStripeCatalog();
  }

  function resetStripeCatalog() {
    setStripePrices([]);
    setStripeError(null);
    setStripeBusy(null);
  }

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

  async function createPriceFromPlan() {
    if (!editing?.nome?.trim() || !editing.slug?.trim()) {
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

  async function save() {
    if (!editing) return;
    if (!editing.nome?.trim() || !editing.slug?.trim())
      return toast.error("Nome e slug são obrigatórios");
    if (!isValidPlanPrice(editing.preco_cents))
      return toast.error("Informe um preço válido, por exemplo R$ 49,00.");
    const checkoutUrl = (editing.checkout_url ?? "").trim();
    if (editing.checkout_mode !== "stripe" && checkoutUrl && !isValidHttpUrl(checkoutUrl))
      return toast.error(
        "Link de checkout inválido. Use o endereço completo, começando com https://",
      );
    setSaving(true);
    const payload: any = {
      slug: editing.slug!.toLowerCase().trim(),
      nome: editing.nome!.trim(),
      descricao: editing.descricao ?? null,
      // A tela edita reais; aqui o valor já é centavos inteiros validados.
      preco_cents: editing.preco_cents as number,
      moeda: editing.moeda ?? "BRL",
      intervalo: editing.intervalo ?? "month",
      trial_days: Number(editing.trial_days ?? 0),
      creditos_mensais: Math.max(0, Number(editing.creditos_mensais ?? 0)),
      creditos_trial:
        Number(editing.trial_days ?? 0) > 0 ? Math.max(0, Number(editing.creditos_trial ?? 0)) : 0,
      limite_mensagens: Number(editing.limite_mensagens ?? 0),
      limite_instancias: Math.max(1, Number(editing.limite_instancias ?? 1)),
      limite_usuarios: Number(editing.limite_usuarios ?? 0),
      limite_contatos: Number(editing.limite_contatos ?? 0),
      features: featuresText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      destaque: !!editing.destaque,
      ativo: !!editing.ativo,
      ordem: Number(editing.ordem ?? 0),
      paddle_product_id: editing.paddle_product_id ?? null,
      paddle_price_id: editing.paddle_price_id ?? null,
      checkout_url: checkoutUrl || null,
      checkout_mode: editing.checkout_mode === "stripe" ? "stripe" : "external",
      stripe_price_id: (editing.stripe_price_id ?? "").trim() || null,
      stripe_product_id: (editing.stripe_product_id ?? "").trim() || null,
    };
    if (payload.checkout_mode === "stripe" && !payload.stripe_price_id?.startsWith("price_")) {
      setSaving(false);
      return toast.error("Informe o Stripe Price ID (começa com price_) ou escolha link externo.");
    }
    const op = (editing as any).id
      ? supabase
          .from("plan")
          .update(payload)
          .eq("id", (editing as any).id)
      : supabase.from("plan").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Plano salvo");
    setEditing(null);
    load();
  }

  async function toggleAtivo(p: Plan) {
    const { error } = await supabase.from("plan").update({ ativo: !p.ativo }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sua oferta tem dois planos. Edite preço, trial, limites e pagamento sem criar opções
            extras.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhum plano cadastrado.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <Card
              key={p.id}
              className={`p-5 flex flex-col gap-3 relative ${!p.ativo ? "opacity-60" : ""}`}
            >
              {p.destaque && (
                <div className="absolute -top-2 right-4 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="size-3" /> Destaque
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {p.slug}
                  </div>
                  <div className="text-lg font-bold truncate">{p.nome}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatBRL(p.preco_cents, p.moeda)}
                    <span className="text-xs text-muted-foreground font-normal">
                      /{p.intervalo === "month" ? "mês" : "ano"}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.trial_days > 0
                      ? `${p.trial_days}d trial · ${p.creditos_trial.toLocaleString("pt-BR")} créditos`
                      : "Sem trial"}
                  </div>
                </div>
              </div>
              {p.descricao && (
                <p className="text-xs text-muted-foreground line-clamp-2">{p.descricao}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-[11px] mt-1">
                <Limit label="Msgs" v={p.limite_mensagens} />
                <Limit label="WhatsApp" v={1} />
                <Limit label="Usuários" v={p.limite_usuarios} />
                <Limit label="Contatos" v={p.limite_contatos} />
                <Limit label="Créditos IA/mês" v={p.creditos_mensais} />
              </div>
              <div className="flex items-center justify-between pt-2 mt-auto border-t">
                <div className="flex items-center gap-2">
                  <Switch checked={p.ativo} onCheckedChange={() => toggleAtivo(p)} />
                  <span className="text-xs text-muted-foreground">
                    {p.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Editar plano ${p.nome}`}
                    onClick={() => openEdit(p)}
                  >
                    <Edit3 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <CheckoutStatus plan={p} />
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar plano</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome">
                <Input
                  value={editing.nome ?? ""}
                  onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                />
              </Field>
              <Field label="Slug">
                <Input
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="starter"
                />
              </Field>
              <Field label="Descrição" full>
                <Textarea
                  rows={2}
                  value={editing.descricao ?? ""}
                  onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
                />
              </Field>
              <Field label="Preço">
                <MoneyInput
                  aria-label="Preço"
                  required
                  cents={editing.preco_cents ?? null}
                  onChange={(cents) =>
                    setEditing((current) =>
                      current ? { ...current, preco_cents: cents ?? undefined } : current,
                    )
                  }
                />
              </Field>
              <Field label="Intervalo">
                <select
                  className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                  value={editing.intervalo ?? "month"}
                  onChange={(e) => setEditing({ ...editing, intervalo: e.target.value as any })}
                >
                  <option value="month">Mensal</option>
                  <option value="year">Anual</option>
                </select>
              </Field>
              <Field label="Ordem">
                <Input
                  type="number"
                  value={editing.ordem ?? 0}
                  onChange={(e) => setEditing({ ...editing, ordem: Number(e.target.value) })}
                />
              </Field>
              <Field label="Créditos de IA por mês">
                <Input
                  type="number"
                  min={0}
                  value={editing.creditos_mensais ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, creditos_mensais: Number(e.target.value) })
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Cada resposta enviada pela IA consome 1 crédito.
                </p>
              </Field>
              <Field label="Período de teste" full>
                <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                  <label className="flex items-start justify-between gap-4">
                    <span>
                      <span className="block text-sm font-semibold">
                        Oferecer trial neste plano
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        O cliente testa por alguns dias com uma quantidade controlada de respostas
                        da IA.
                      </span>
                    </span>
                    <Switch
                      checked={Number(editing.trial_days ?? 0) > 0}
                      onCheckedChange={(checked) =>
                        setEditing({
                          ...editing,
                          trial_days: checked ? Math.max(1, Number(editing.trial_days || 3)) : 0,
                          creditos_trial: checked
                            ? Math.max(1, Number(editing.creditos_trial || 100))
                            : 0,
                        })
                      }
                    />
                  </label>
                  {Number(editing.trial_days ?? 0) > 0 && (
                    <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Dias liberados</Label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={editing.trial_days ?? 3}
                          onChange={(e) =>
                            setEditing({ ...editing, trial_days: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Créditos liberados no trial</Label>
                        <Input
                          type="number"
                          min={1}
                          value={editing.creditos_trial ?? 100}
                          onChange={(e) =>
                            setEditing({ ...editing, creditos_trial: Number(e.target.value) })
                          }
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground sm:col-span-2">
                        1 crédito = 1 resposta enviada pela IA no WhatsApp. Se o envio falhar, o
                        crédito é devolvido automaticamente.
                      </p>
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Créditos de IA/mês">
                <Input
                  type="number"
                  value={editing.limite_mensagens ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, limite_mensagens: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Números de WhatsApp">
                <Input
                  type="number"
                  min={1}
                  value={editing.limite_instancias ?? 1}
                  onChange={(e) =>
                    setEditing({ ...editing, limite_instancias: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Limite usuários">
                <Input
                  type="number"
                  value={editing.limite_usuarios ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, limite_usuarios: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Limite contatos">
                <Input
                  type="number"
                  value={editing.limite_contatos ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, limite_contatos: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Features (uma por linha)" full>
                <Textarea
                  rows={5}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="Comandos por voz e texto&#10;Foto de comprovantes&#10;Dashboard financeiro&#10;1 número de WhatsApp"
                />
              </Field>
              <Field label="Como o cliente paga este plano?" full>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      [
                        "stripe",
                        "Stripe integrado",
                        "Cartão direto no sistema, liberação automática.",
                      ],
                      ["external", "Link externo", "Kiwify, Cakto, Perfectpay ou outro link."],
                    ] as const
                  ).map(([value, title, hint]) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => {
                        setEditing({ ...editing, checkout_mode: value });
                        if (value === "stripe" && stripePrices.length === 0 && !stripeBusy) {
                          void loadStripeCatalog();
                        }
                      }}
                      className={`rounded-xl border p-3 text-left text-sm transition ${
                        (editing.checkout_mode ?? "external") === value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="font-semibold">{title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
                    </button>
                  ))}
                </div>
              </Field>
              {editing.checkout_mode === "stripe" && (
                <Field label="Catálogo conectado ao Stripe" full>
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <CreditCard className="size-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">
                            Escolha ou crie sem copiar códigos
                          </div>
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
                            const selected = stripePrices.find(
                              (price) => price.id === event.target.value,
                            );
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
                        {formatBRL(Number(editing.preco_cents || 0), editing.moeda || "BRL")} e o
                        intervalo deste plano.
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
              )}
              {editing.checkout_mode !== "stripe" && (
                <Field label="URL de checkout externo" full>
                  <Input
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    value={editing.checkout_url ?? ""}
                    onChange={(e) => setEditing({ ...editing, checkout_url: e.target.value })}
                    placeholder="https://pay.kiwify.com.br/abc123"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Link para onde o cliente é enviado ao clicar em "Assinar". O sistema adiciona o
                    e-mail dele automaticamente (<code>?email=</code>) para identificar a
                    assinatura.
                  </p>
                </Field>
              )}
              <div className="col-span-2 flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={!!editing.destaque}
                    onCheckedChange={(v) => setEditing({ ...editing, destaque: v })}
                  />{" "}
                  Destaque (mais popular)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={!!editing.ativo}
                    onCheckedChange={(v) => setEditing({ ...editing, ativo: v })}
                  />{" "}
                  Ativo
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
function Limit({ label, v }: { label: string; v: number }) {
  return (
    <div className="bg-muted/50 rounded-md px-2 py-1.5 flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{v.toLocaleString("pt-BR")}</span>
    </div>
  );
}
// Resumo do checkout no card do plano: o estado depende do modo escolhido.
function CheckoutStatus({ plan }: { plan: Plan }) {
  const priceId = (plan.stripe_price_id ?? "").trim();
  const url = (plan.checkout_url ?? "").trim();

  if (plan.checkout_mode === "stripe") {
    if (priceId) {
      return (
        <div className="flex items-center gap-1.5 -mt-1 min-w-0">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-3" /> Stripe integrado
          </span>
          <span className="truncate font-mono text-[10px] text-muted-foreground" title={priceId}>
            {priceId}
          </span>
        </div>
      );
    }
    return (
      <div className="-mt-1 flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
        <AlertTriangle className="mt-0.5 size-3 shrink-0" />
        <span>Falta o Price ID do Stripe — clientes não conseguem assinar</span>
      </div>
    );
  }

  if (url) {
    return (
      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 -mt-1 truncate">
        <Package className="size-3 shrink-0" />
        <a href={url} target="_blank" rel="noreferrer" className="truncate hover:underline">
          {url}
        </a>
      </div>
    );
  }

  return (
    <div className="-mt-1 flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
      <span>Sem URL de checkout — clientes não conseguem assinar</span>
    </div>
  );
}
function formatBRL(cents: number, moeda = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(cents / 100);
}
