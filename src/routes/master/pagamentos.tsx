import { IntegrationSection } from "@/components/master/integration-card";
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
  Webhook,
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
} from "@/lib/integrations.functions";
import { getMasterSetupProgress } from "@/lib/master-setup.functions";

export const Route = createFileRoute("/master/pagamentos")({
  head: brandedRouteHead("Pagamentos"),
  component: PaymentsPage,
});

type Integrations = Awaited<ReturnType<typeof getIntegrationsOverview>>;
type Setup = Awaited<ReturnType<typeof getMasterSetupProgress>>;

function PaymentsPage() {
  const getIntegrations = useServerFn(getIntegrationsOverview);
  const getSetup = useServerFn(getMasterSetupProgress);
  const save = useServerFn(saveIntegration);
  const test = useServerFn(testIntegration);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | "load" | "save" | "test">("load");

  const load = useCallback(async () => {
    setBusy("load");
    try {
      const [integrationData, setupData] = await Promise.all([getIntegrations(), getSetup()]);
      setIntegrations(integrationData);
      setSetup(setupData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível conferir os pagamentos.",
      );
    } finally {
      setBusy(null);
    }
  }, [getIntegrations, getSetup]);

  useEffect(() => void load(), [load]);

  const stripe = integrations?.items.find((item) => item.provider === "stripe");
  const fieldStatus = (field: string) => stripe?.fields.find((item) => item.field === field);

  async function saveStripe() {
    if (!Object.values(values).some((value) => value.trim())) {
      return toast.error("Preencha ao menos uma credencial.");
    }
    setBusy("save");
    try {
      await save({ data: { provider: "stripe", values } });
      setValues({});
      toast.success("Credenciais salvas. Agora faça o teste.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      setBusy(null);
    }
  }

  async function testStripe() {
    setBusy("test");
    try {
      const result = await test({ data: { provider: "stripe" } });
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no teste.");
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <IntegrationSection provider="stripe" />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-violet-500">
            cobrança do seu SaaS
          </p>
          <h1 className="mt-1 font-display text-3xl font-black tracking-tight">Pagamentos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Escolha como receber, teste a conexão e confirme se cada plano consegue levar o cliente
            até o pagamento.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={busy !== null}>
          <RefreshCw className={`size-4 ${busy === "load" ? "animate-spin" : ""}`} /> Conferir tudo
        </Button>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <JourneyStep
          number="1"
          title="Escolha o caminho"
          text="Stripe integrado ou link externo por plano."
        />
        <JourneyStep
          number="2"
          title="Conecte e teste"
          text="O selo verde só aparece depois de uma resposta real."
        />
        <JourneyStep
          number="3"
          title="Vincule os planos"
          text="Cada oferta precisa de um preço ou link válido."
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-500/10 text-violet-600">
                <CreditCard className="size-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-black">Stripe integrado</h2>
                  <Badge
                    variant={
                      stripe?.testOk ? "default" : stripe?.configured ? "outline" : "secondary"
                    }
                  >
                    {stripe?.testOk
                      ? "Testado"
                      : stripe?.configured
                        ? "Salvo, falta testar"
                        : "Não configurado"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cartão dentro do fluxo, assinatura recorrente e liberação automática.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <CredentialField
              id="publishable_key"
              label="1. Chave publicável"
              placeholder="pk_live_…"
              help="Stripe → Desenvolvedores → Chaves da API."
              saved={fieldStatus("publishable_key")?.configured}
              value={values.publishable_key ?? ""}
              onChange={(value) => setValues((current) => ({ ...current, publishable_key: value }))}
            />
            <CredentialField
              id="secret_key"
              label="2. Chave secreta"
              placeholder="sk_live_…"
              help="Use a chave do mesmo ambiente da chave publicável. Ela fica criptografada."
              secret
              saved={fieldStatus("secret_key")?.configured}
              value={values.secret_key ?? ""}
              onChange={(value) => setValues((current) => ({ ...current, secret_key: value }))}
            />
            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Webhook className="size-4 text-violet-500" /> 3. Crie o webhook no Stripe
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Em Desenvolvedores → Webhooks, crie um destino HTTP e cole o endereço abaixo.
              </p>
              <div className="mt-3 flex gap-2">
                <Input
                  readOnly
                  value={integrations?.stripeWebhookUrl ?? ""}
                  className="font-mono text-xs"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(integrations?.stripeWebhookUrl ?? "");
                    toast.success("Webhook copiado");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
            <CredentialField
              id="webhook_secret"
              label="4. Segredo do webhook"
              placeholder="whsec_…"
              help="Depois de criar o destino, copie o segredo de assinatura."
              secret
              saved={fieldStatus("webhook_secret")?.configured}
              value={values.webhook_secret ?? ""}
              onChange={(value) => setValues((current) => ({ ...current, webhook_secret: value }))}
            />
          </div>

          {stripe?.lastError && stripe.testOk === false && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Último teste: {stripe.lastError}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={saveStripe} disabled={busy !== null}>
              {busy === "save" && <Loader2 className="size-4 animate-spin" />} Salvar credenciais
            </Button>
            <Button
              variant="outline"
              onClick={testStripe}
              disabled={busy !== null || !stripe?.configured}
            >
              {busy === "test" && <Loader2 className="size-4 animate-spin" />} Testar conexão
            </Button>
            <Button asChild variant="ghost" className="sm:ml-auto">
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer">
                Abrir Stripe <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
        </Card>

        <div className="space-y-5">
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
                  setup?.counts.plansWithCheckout === setup?.counts.plans ? "default" : "secondary"
                }
              >
                {setup?.counts.plansWithCheckout ?? 0}/{setup?.counts.plans ?? 0}
              </Badge>
            </div>
            <div className="mt-4 space-y-2">
              {setup?.paymentPlans.map(
                (plan: {
                  id: string;
                  name: string;
                  mode: "stripe" | "external";
                  ready: boolean;
                  detail: string;
                }) => (
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
                    <Badge variant="outline">{plan.mode === "stripe" ? "Stripe" : "Link"}</Badge>
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

          <Card className="p-5 sm:p-6">
            <div className="flex gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-600">
                <ExternalLink className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-black">Prefere link externo?</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Use Kiwify, Cakto, PerfectPay ou outro checkout. Em cada plano, escolha “Link
                  externo” e cole a URL correta.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              O cliente será enviado para fora do sistema. A liberação automática depende do webhook
              desse provedor estar integrado.
            </div>
          </Card>
        </div>
      </section>

      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <ShieldCheck className="size-5 shrink-0" /> Nenhuma chave é exibida novamente. O teste usa a
        credencial somente no servidor.
      </div>
    </div>
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
