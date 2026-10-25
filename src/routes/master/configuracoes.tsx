import { IntegrationSection } from "@/components/master/integration-card";
import { EMAIL_INPUT_PROPS, emailError, normalizeEmail } from "@/lib/masks";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Webhook,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { brandedRouteHead } from "@/config/brand";
import { getBillingWebhookInfo, listRecentBillingEvents } from "@/lib/billing.functions";
import { getSuperAdminEmails, setSuperAdminEmails } from "@/lib/master.functions";

type Provider = "kiwify" | "cakto" | "perfectpay";
type BillingEvent = {
  id: string;
  provider: string;
  event_type: string | null;
  buyer_email: string | null;
  processed: boolean;
  error: string | null;
  created_at: string;
};

const PROVIDERS: { id: Provider; secret: string }[] = [
  { id: "kiwify", secret: "KIWIFY_WEBHOOK_TOKEN" },
  { id: "cakto", secret: "CAKTO_WEBHOOK_TOKEN" },
  { id: "perfectpay", secret: "PERFECTPAY_WEBHOOK_TOKEN" },
];

export const Route = createFileRoute("/master/configuracoes")({
  head: brandedRouteHead("Acesso e segurança"),
  component: SecurityPage,
});

function SecurityPage() {
  const getEmails = useServerFn(getSuperAdminEmails);
  const saveEmails = useServerFn(setSuperAdminEmails);
  const getWebhooks = useServerFn(getBillingWebhookInfo);
  const getEvents = useServerFn(listRecentBillingEvents);
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [tokens, setTokens] = useState<Record<Provider, boolean> | null>(null);
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([getEmails(), getWebhooks(), getEvents()])
      .then(([emailResult, tokenResult, eventResult]) => {
        setEmails(emailResult.emails);
        setTokens(tokenResult);
        setEvents(eventResult);
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar a área."),
      )
      .finally(() => setLoading(false));
  }, [getEmails, getEvents, getWebhooks]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const webhookUrl = (provider: Provider) =>
    tokens?.[provider] ? `${origin}/api/public/billing/webhook?provider=${provider}` : "";

  function addEmail(event: React.FormEvent) {
    event.preventDefault();
    const clean = normalizeEmail(newEmail);
    const invalid = emailError(clean);
    if (invalid) return toast.error(invalid);
    if (emails.includes(clean)) return toast.message("Este e-mail já está autorizado.");
    setEmails((current) => [...current, clean]);
    setNewEmail("");
  }

  async function persistEmails() {
    setSaving(true);
    try {
      await saveEmails({ data: { emails } });
      toast.success("Acessos administrativos atualizados.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("URL copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <IntegrationSection provider="google" />
      <header>
        <p className="text-xs font-black uppercase tracking-[.16em] text-violet-500">
          Administração do SaaS
        </p>
        <h1 className="mt-1 font-display text-2xl font-black tracking-tight sm:text-3xl">
          Acesso e segurança
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Controle quem administra o clone e acompanhe as automações de cobrança.
        </p>
      </header>

      <Card className="overflow-hidden border-violet-300/30 bg-[linear-gradient(120deg,rgba(124,58,237,.12),rgba(217,70,239,.04))] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-black">Identidade é feita por prompt</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Nome, cores, logo, copy, personagem e dados legais da landing page não são editados
                no superadmin. Gere a marca com o agente da Academy e aplique no projeto da Lovable.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to="/master/implantacao">
              Ver orientação <ExternalLink className="size-4" />
            </Link>
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-500">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Super admins autorizados</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Estes e-mails entram somente por <b>/superadmin</b>. Remover um e-mail revoga o
                acesso administrativo.
              </p>
            </div>
          </div>

          <form onSubmit={addEmail} className="flex gap-2">
            <Input
              {...EMAIL_INPUT_PROPS}
              autoComplete="email"
              aria-label="E-mail do novo super admin"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="proprietario@assinante.com"
            />
            <Button type="submit" variant="outline" aria-label="Adicionar super admin">
              <Plus className="size-4" />
            </Button>
          </form>

          {loading ? (
            <div className="grid min-h-28 place-items-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {emails.length === 0 && (
                <p className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
                  Nenhum e-mail adicional cadastrado.
                </p>
              )}
              {emails.map((email) => (
                <div key={email} className="flex items-center gap-3 rounded-xl border px-3 py-2.5">
                  <KeyRound className="size-4 shrink-0 text-violet-500" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{email}</span>
                  <button
                    type="button"
                    onClick={() => setEmails((current) => current.filter((item) => item !== email))}
                    className="text-muted-foreground transition hover:text-destructive"
                    aria-label={`Remover ${email}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button onClick={persistEmails} disabled={loading || saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar acessos
          </Button>
        </Card>

        <Card className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
              <Webhook className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Liberação por pagamento</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Os tokens ficam nos Secrets da Lovable. Aqui você copia a URL e confere se a
                integração está pronta.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {PROVIDERS.map((provider) => (
              <div key={provider.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[.12em]">
                      {provider.id}
                    </div>
                    <code className="text-[10px] text-muted-foreground">{provider.secret}</code>
                  </div>
                  <Badge variant={tokens?.[provider.id] ? "secondary" : "destructive"}>
                    {tokens?.[provider.id] ? "Pronto" : "Falta token"}
                  </Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Input
                    readOnly
                    value={webhookUrl(provider.id) || "Cadastre o token nos Secrets"}
                    className="font-mono text-[11px]"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={!webhookUrl(provider.id)}
                    onClick={() => copy(webhookUrl(provider.id))}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <p className="rounded-xl bg-muted/50 p-3 text-[11px] leading-5 text-muted-foreground">
            O comprador é localizado pelo e-mail. Venda aprovada ou renovada libera; cancelamento,
            reembolso e chargeback suspendem. Também é possível liberar manualmente em Assinantes.
          </p>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Últimos eventos de cobrança</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirmação real de que o checkout conversou com o sistema.
            </p>
          </div>
          <Badge variant="outline">{events.length} eventos</Badge>
        </div>

        {loading ? (
          <div className="grid min-h-28 place-items-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
            Nenhum webhook recebido ainda.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Provedor</th>
                  <th className="pb-2 font-medium">Evento</th>
                  <th className="pb-2 font-medium">Comprador</th>
                  <th className="pb-2 text-right font-medium">Recebido em</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const ok = event.processed && !event.error;
                  return (
                    <tr key={event.id} className="border-b last:border-0">
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          {ok ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="size-4 text-amber-500" />
                          )}
                          {ok ? "Processado" : "Revisar"}
                        </span>
                      </td>
                      <td className="py-3 font-mono uppercase">{event.provider}</td>
                      <td className="py-3">{event.event_type || "—"}</td>
                      <td className="max-w-52 truncate py-3">{event.buyer_email || "—"}</td>
                      <td className="py-3 text-right text-muted-foreground">
                        {new Date(event.created_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
