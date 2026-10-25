import { createFileRoute, Link } from "@tanstack/react-router";
import { isValidHttpUrl } from "@/lib/masks";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Server,
  ShieldCheck,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  deleteIntegration,
  getIntegrationsOverview,
  saveIntegration,
  testIntegration,
} from "@/lib/integrations.functions";
import { brandedRouteHead } from "@/config/brand";

type Overview = Awaited<ReturnType<typeof getIntegrationsOverview>>;
type Item = Overview["items"][number];
type Provider = "evolution" | "stripe" | "google";

const META: Record<
  Provider,
  {
    title: string;
    icon: typeof MessageCircle;
    intro: string;
    steps: string[];
    fields: {
      field: string;
      label: string;
      placeholder: string;
      secret: boolean;
      help: string;
      kind?: "url";
    }[];
  }
> = {
  stripe: { title: "Stripe", icon: ShieldCheck, intro: "Credenciais de pagamento e webhook.", steps: ["Copie as chaves no Stripe.", "Salve com segurança.", "Teste a conexão."], fields: [
{field:"publishable_key",label:"Chave publicável",placeholder:"pk_…",secret:false,help:"Chave publicável Stripe"},
{field:"secret_key",label:"Chave secreta",placeholder:"sk_…",secret:true,help:"Guardada criptografada"},
{field:"webhook_secret",label:"Segredo do webhook",placeholder:"whsec_…",secret:true,help:"Webhook: /api/public/stripe-webhook"}] },
  google: { title: "Google (opcional)", icon: ShieldCheck, intro: "Conexão opcional com o Google.", steps: ["Crie um cliente OAuth no Google.", "Salve as credenciais.", "Teste a configuração."], fields: [
{field:"client_id",label:"Client ID",placeholder:"ID do cliente",secret:false,help:"Cliente OAuth Google"},
{field:"client_secret",label:"Client Secret",placeholder:"Segredo",secret:true,help:"Guardado criptografado"}] },
  evolution: {
    title: "WhatsApp",
    icon: MessageCircle,
    intro:
      "Servidor que mantém conectado o único número central da MárcIA. Os assinantes enviam mensagens para esse número; o sistema identifica cada conta com segurança.",
    steps: [
      "Abra o painel do seu servidor Evolution.",
      "Copie o endereço do servidor e a chave global (API Key).",
      "Cole aqui, salve e clique em Testar.",
    ],
    fields: [
      {
        field: "api_url",
        label: "Endereço do servidor",
        placeholder: "https://evolution.seudominio.com",
        secret: false,
        help: "O endereço que você usa para abrir a Evolution.",
        kind: "url",
      },
      {
        field: "api_key",
        label: "Chave de acesso (API Key)",
        placeholder: "Cole a chave global",
        secret: true,
        help: "Fica guardada criptografada; ninguém consegue ver depois.",
      },
    ],
  },
};

function stateOf(item: Item, extra: { connected?: boolean }) {
  if (!item.configured) return { label: "Não configurado", tone: "secondary" as const };
  if (item.testOk === true) return { label: "Testado", tone: "default" as const };
  if (extra.connected) return { label: "Conectado", tone: "default" as const };
  return { label: "Configurado", tone: "outline" as const };
}

export function IntegrationCard({
  provider,
  item,
  onChange,
}: {
  provider: Provider;
  item: Item;
  onChange: () => void;
}) {
  const meta = META[provider];
  const Icon = meta.icon;
  const save = useServerFn(saveIntegration);
  const test = useServerFn(testIntegration);
  const remove = useServerFn(deleteIntegration);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | "save" | "test" | "delete">(null);
  const state = stateOf(item, {});

  async function onSave() {
    if (!Object.values(values).some((v) => v.trim()))
      return toast.error("Preencha ao menos um campo.");
    const badUrl = meta.fields.find(
      (f) => f.kind === "url" && values[f.field]?.trim() && !isValidHttpUrl(values[f.field]),
    );
    if (badUrl)
      return toast.error(`${badUrl.label} inválido. Use o endereço completo, começando com https://`);
    setBusy("save");
    try {
      await save({ data: { provider, values } });
      setValues({});
      toast.success("Salvo com segurança");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(null);
    }
  }
  async function onTest() {
    setBusy("test");
    try {
      const r = await test({ data: { provider } });
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      onChange();
    } finally {
      setBusy(null);
    }
  }
  async function onDelete() {
    if (!confirm(`Apagar as credenciais de ${meta.title}? Esta integração deixará de funcionar.`))
      return;
    setBusy("delete");
    try {
      await remove({ data: { provider } });
      toast.success("Credenciais apagadas");
      onChange();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl grid place-items-center bg-primary/10 text-primary shrink-0">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold">{meta.title}</h2>
            <Badge variant={state.tone}>
              {state.label === "Testado" && <CheckCircle2 className="size-3 mr-1" />}
              {state.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{meta.intro}</p>
        </div>
      </div>

      <ol className="grid gap-2 text-sm sm:grid-cols-3">
        {meta.steps.map((s, i) => (
          <li key={i} className="flex gap-2 rounded-xl bg-muted/45 px-3 py-2.5">
            <span className="size-5 shrink-0 rounded-full bg-muted text-[11px] font-bold grid place-items-center">
              {i + 1}
            </span>
            <span className="text-muted-foreground">{s}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-4 sm:grid-cols-2">
        {meta.fields.map((f) => {
          const info = item.fields.find((x) => x.field === f.field);
          const saved = info?.configured
            ? info.source === "panel"
              ? f.secret
                ? `Salvo · termina em ${info.last4}`
                : `Salvo · ${info.last4}`
              : "Usando configuração antiga do servidor"
            : null;
          return (
            <div key={f.field} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`${provider}-${f.field}`} className="flex items-center gap-1.5">
                  {f.label}
                  <span title={f.help}>
                    <HelpCircle className="size-3.5 text-muted-foreground" />
                  </span>
                </Label>
                {saved && (
                  <span className="text-[11px] text-muted-foreground truncate">{saved}</span>
                )}
              </div>
              <Input
                id={`${provider}-${f.field}`}
                name={`${provider}_${f.field}`}
                type={f.secret ? "password" : f.kind === "url" ? "url" : "text"}
                inputMode={f.kind === "url" ? "url" : undefined}
                autoComplete={f.secret ? "new-password" : f.kind === "url" ? "url" : "off"}
                data-1p-ignore
                data-lpignore="true"
                spellCheck={false}
                placeholder={saved ? "Deixe em branco para manter" : f.placeholder}
                value={values[f.field] ?? ""}
                onChange={(e) => setValues({ ...values, [f.field]: e.target.value })}
              />
            </div>
          );
        })}
      </div>

      {item.lastError && item.testOk === false && (
        <p className="text-sm text-destructive">Último teste: {item.lastError}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onSave} disabled={busy !== null}>
          {busy === "save" && <Loader2 className="size-4 animate-spin" />} Salvar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onTest}
          disabled={busy !== null || !item.configured}
        >
          {busy === "test" && <Loader2 className="size-4 animate-spin" />} Testar
        </Button>
        {item.fields.some((f) => f.source === "panel") && (
          <Button
            variant="ghost"
            onClick={onDelete}
            disabled={busy !== null}
            className="ml-auto text-destructive"
          >
            <Trash2 className="size-4" /> Apagar
          </Button>
        )}
      </div>
    </Card>
  );
}


export function IntegrationSection({provider}: {provider: Provider}) {
 const load = useServerFn(getIntegrationsOverview);
 const [overview, setOverview] = useState<Overview | null>(null);
 const refresh = useCallback(() => { load().then(setOverview).catch(e => toast.error(e.message)); }, [load]);
 useEffect(() => { refresh(); }, [refresh]);
 const item = overview?.items.find(i => i.provider === provider);
 return item ? <IntegrationCard provider={provider} item={item} onChange={refresh} /> : <p className="text-sm text-muted-foreground">Carregando credenciais…</p>;
}
