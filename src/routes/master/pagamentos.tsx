import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brandedRouteHead } from "@/config/brand";
import {
  getIntegrationsOverview,
  saveIntegration,
  testIntegration,
} from "@/lib/common/integrations.functions";
import { getMasterSetupProgress } from "@/lib/master/master-setup.functions";
import {
  checkoutStatus,
  type CheckoutPlan,
  type CheckoutStatus,
} from "@/lib/billing/payment-checkout-rules";

export const Route = createFileRoute("/master/pagamentos")({
  head: brandedRouteHead("Pagamentos"),
  component: PaymentsPage,
});

type Integrations = Awaited<ReturnType<typeof getIntegrationsOverview>>;
type Setup = Awaited<ReturnType<typeof getMasterSetupProgress>>;

/** Pagamentos do Master: a InfinitePay é o único checkout integrado do sistema. */
function PaymentsPage() {
  const getIntegrations = useServerFn(getIntegrationsOverview);
  const getSetup = useServerFn(getMasterSetupProgress);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [integrationData, setupData] = await Promise.all([getIntegrations(), getSetup()]);
      setIntegrations(integrationData);
      setSetup(setupData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível conferir os pagamentos.",
      );
    } finally {
      setLoading(false);
    }
  }, [getIntegrations, getSetup]);

  useEffect(() => void load(), [load]);

  const paymentPlans: CheckoutPlan[] = setup?.paymentPlans ?? [];
  const ipStatus = checkoutStatus(
    "infinitepay",
    integrations?.items.find((item) => item.provider === "infinitepay"),
    paymentPlans,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-violet-500">
            cobrança do seu SaaS
          </p>
          <h1 className="mt-1 font-display text-3xl font-black tracking-tight">Pagamentos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Conecte a InfinitePay, teste a conexão e confirme se cada plano consegue levar o cliente
            até o pagamento.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Conferir tudo
        </Button>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <JourneyStep
          number="1"
          title="Conecte a InfinitePay"
          text="InfiniteTag, chave e links de checkout salvos com segurança."
        />
        <JourneyStep
          number="2"
          title="Teste a conexão"
          text="O selo verde só aparece depois de uma resposta real."
        />
        <JourneyStep
          number="3"
          title="Vincule os planos"
          text="Cada plano pago precisa do seu link da InfinitePay."
        />
      </section>

      <div
        className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${ipStatus.active ? "border-success/40 bg-success/10" : "bg-muted/40"}`}
      >
        <Check className={`size-4 ${ipStatus.active ? "text-success" : "text-muted-foreground"}`} />
        {ipStatus.active ? (
          <span>
            Recebendo pagamentos agora por: <strong>InfinitePay</strong>
          </span>
        ) : (
          <span className="text-muted-foreground">
            A InfinitePay ainda não está 100% ativa. Salve, teste e vincule a um plano ativo.
          </span>
        )}
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <InfinitePayCard integrations={integrations} onChanged={load} plans={paymentPlans} />

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.14em] text-violet-500">
                conferência por plano
              </p>
              <h2 className="mt-1 font-display text-xl font-black">Prontos para cobrar</h2>
            </div>
            <Badge
              variant={
                setup?.counts.plansWithCheckout === setup?.counts.paidPlans ? "default" : "secondary"
              }
            >
              {setup?.counts.plansWithCheckout ?? 0}/{setup?.counts.paidPlans ?? 0}
            </Badge>
          </div>
          <div className="mt-4 space-y-2">
            {(setup?.paymentPlans ?? []).map(
              (plan: { id: string; name: string; ready: boolean; detail: string }) => (
                <div key={plan.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <div
                    className={`grid size-8 shrink-0 place-items-center rounded-full ${plan.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {plan.ready ? <Check className="size-4" /> : <KeyRound className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.detail}</p>
                  </div>
                  <Badge variant="outline">Link</Badge>
                </div>
              ),
            )}
            {!setup?.paymentPlans.length && (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Crie seu primeiro plano para configurar a cobrança.
              </p>
            )}
          </div>
          <Button asChild variant="outline" className="mt-4 w-full justify-between">
            <Link to="/master/planos">
              Configurar planos <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Card>
      </section>

      <Card className="p-5 sm:p-6">
        <div className="flex gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-600">
            <ExternalLink className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-black">Prefere link externo?</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Use Kiwify, Cakto, PerfectPay ou outro checkout. Em cada plano, cole a URL correta no
              campo de link de checkout.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          O cliente será enviado para fora do sistema. A liberação automática depende do webhook
          desse provedor estar integrado.
        </div>
      </Card>

      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <ShieldCheck className="size-5 shrink-0" /> Nenhuma chave é exibida novamente. O teste usa a
        credencial somente no servidor.
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs font-bold">{label}</Label>
      <div className="mt-1.5 flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button
          size="icon"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("Copiado");
          }}
        >
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function ActiveCheckoutBadge({ status }: { status: CheckoutStatus }) {
  if (!status.active) return <Badge variant="secondary">{status.label}</Badge>;
  return (
    <Badge className="border-transparent bg-success text-success-foreground hover:bg-success">
      <Check className="mr-1 size-3" /> {status.label}
    </Badge>
  );
}

function InfinitePayCard({
  integrations,
  onChanged,
  plans,
}: {
  integrations: Integrations | null;
  onChanged: () => Promise<void>;
  plans: CheckoutPlan[];
}) {
  const save = useServerFn(saveIntegration);
  const test = useServerFn(testIntegration);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | "save" | "test">(null);
  const ip = integrations?.items.find((item) => item.provider === "infinitepay");
  const saved = (field: string) => ip?.fields.find((f) => f.field === field)?.configured;
  const set = (field: string) => (value: string) => setValues((c) => ({ ...c, [field]: value }));

  async function onSave() {
    if (!Object.values(values).some((v) => v.trim()))
      return toast.error("Preencha ao menos um campo.");
    setBusy("save");
    try {
      await save({ data: { provider: "infinitepay", values } });
      setValues({});
      toast.success("InfinitePay salva. Agora faça o teste.");
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(null);
    }
  }

  async function onTest() {
    setBusy("test");
    try {
      const r = await test({ data: { provider: "infinitepay" } });
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no teste.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <CreditCard className="size-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-black">InfinitePay</h2>
            <Badge variant={ip?.testOk ? "default" : ip?.configured ? "outline" : "secondary"}>
              {ip?.testOk ? "Testado" : ip?.configured ? "Salvo, falta testar" : "Não configurado"}
            </Badge>
            <ActiveCheckoutBadge status={checkoutStatus("infinitepay", ip, plans)} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pix e cartão pelo checkout da InfinitePay. Link 1 = Plano Basic, Link 2 = Plano Pro. Os
            links salvos em cada plano (Planos) têm prioridade.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <CredentialField
          id="ip_handle"
          label="1. InfiniteTag"
          placeholder="sua-tag (sem o $)"
          help="Sua InfiniteTag no app InfinitePay."
          saved={saved("handle")}
          value={values.handle ?? ""}
          onChange={set("handle")}
        />
        <CredentialField
          id="ip_api_key"
          label="2. API Key"
          placeholder="Chave da API InfinitePay"
          help="Fica criptografada e nunca aparece no navegador."
          secret
          saved={saved("api_key")}
          value={values.api_key ?? ""}
          onChange={set("api_key")}
        />
        <CredentialField
          id="ip_link1"
          label="3. Link 1 de Checkout (Plano Basic)"
          placeholder="https://checkout.infinitepay.io/…"
          help="Link criado na InfinitePay com o valor do Plano Basic."
          saved={saved("checkout_link")}
          value={values.checkout_link ?? ""}
          onChange={set("checkout_link")}
        />
        <CredentialField
          id="ip_link2"
          label="4. Link 2 de Checkout (Plano Pro)"
          placeholder="https://checkout.infinitepay.io/…"
          help="Link criado na InfinitePay com o valor do Plano Pro."
          saved={saved("checkout_link_2")}
          value={values.checkout_link_2 ?? ""}
          onChange={set("checkout_link_2")}
        />
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border bg-muted/30 p-4 md:grid-cols-2">
        <CopyRow
          label="Link de redirecionamento de sucesso"
          value={integrations?.infinitepaySuccessUrl ?? ""}
        />
        <CopyRow label="URL do Webhook" value={integrations?.infinitepayWebhookUrl ?? ""} />
      </div>

      {ip?.lastError && ip.testOk === false && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Último teste: {ip.lastError}
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onSave} disabled={busy !== null}>
          {busy === "save" && <Loader2 className="size-4 animate-spin" />} Salvar InfinitePay
        </Button>
        <Button variant="outline" onClick={onTest} disabled={busy !== null || !ip?.configured}>
          {busy === "test" && <Loader2 className="size-4 animate-spin" />} Testar conexão
        </Button>
        <Button asChild variant="ghost" className="sm:ml-auto">
          <a href="https://app.infinitepay.io/external-checkout" target="_blank" rel="noreferrer">
            Abrir InfinitePay <ExternalLink className="size-4" />
          </a>
        </Button>
      </div>
    </Card>
  );
}

function JourneyStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-600 text-sm font-black text-white">
        {number}
      </div>
      <div>
        <p className="font-display font-black">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
      </div>
    </Card>
  );
}

function CredentialField({
  id,
  label,
  placeholder,
  help,
  value,
  onChange,
  saved,
  secret,
}: {
  id: string;
  label: string;
  placeholder: string;
  help: string;
  value: string;
  onChange: (value: string) => void;
  saved?: boolean;
  secret?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`payment-${id}`}>{label}</Label>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="size-3.5" /> salvo
          </span>
        )}
      </div>
      <Input
        id={`payment-${id}`}
        type={secret ? "password" : "text"}
        autoComplete="off"
        placeholder={saved ? "Deixe em branco para manter" : placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">{help}</p>
    </div>
  );
}
