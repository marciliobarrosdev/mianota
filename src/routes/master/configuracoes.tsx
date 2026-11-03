import { IntegrationSection } from "@/components/master/integration-card";
import { EMAIL_INPUT_PROPS, emailError, normalizeEmail } from "@/lib/common/masks";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Crown,
  Download,
  ExternalLink,
  History,
  KeyRound,
  Loader2,
  Plus,
  RotateCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Webhook,
  CreditCard,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { brandedRouteHead } from "@/config/brand";
import { getBillingWebhookInfo } from "@/lib/billing/billing.functions";
import { getSuperAdminEmails, setSuperAdminEmails } from "@/lib/master/master.functions";
import {
  getAdminAccessDetails,
  listBillingEventsAdmin,
  listMasterAudit,
  reprocessBillingEvent,
} from "@/lib/master/master-security.functions";
import { getIntegrationsOverview } from "@/lib/common/integrations.functions";
import { getMasterSetupProgress } from "@/lib/master/master-setup.functions";
import { checkoutStatus, type CheckoutPlan } from "@/lib/billing/payment-checkout-rules";
import {
  REMOVAL_BLOCK_LABEL,
  adminRemovalBlock,
  auditActionLabel,
  eventStatus,
  eventsCsv,
  filterEvents,
  lastEventByProvider,
  sameEmailList,
  summarizeEvents,
  type EventStatus,
} from "@/lib/master/security-rules";

type Provider = "kiwify" | "cakto" | "perfectpay";
type BillingEvent = Awaited<ReturnType<typeof listBillingEventsAdmin>>[number];
type AuditRow = Awaited<ReturnType<typeof listMasterAudit>>[number];
type AccessDetails = Awaited<ReturnType<typeof getAdminAccessDetails>>;

const PROVIDERS: { id: Provider; secret: string }[] = [
  { id: "kiwify", secret: "KIWIFY_WEBHOOK_TOKEN" },
  { id: "cakto", secret: "CAKTO_WEBHOOK_TOKEN" },
  { id: "perfectpay", secret: "PERFECTPAY_WEBHOOK_TOKEN" },
];

export const Route = createFileRoute("/master/configuracoes")({
  head: brandedRouteHead("Acesso e segurança"),
  component: SecurityPage,
});

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function SecurityPage() {
  const getEmails = useServerFn(getSuperAdminEmails);
  const saveEmails = useServerFn(setSuperAdminEmails);
  const getWebhooks = useServerFn(getBillingWebhookInfo);
  const getEvents = useServerFn(listBillingEventsAdmin);
  const getAccess = useServerFn(getAdminAccessDetails);
  const getAudit = useServerFn(listMasterAudit);
  const getIntegrations = useServerFn(getIntegrationsOverview);
  const getSetup = useServerFn(getMasterSetupProgress);
  const reprocess = useServerFn(reprocessBillingEvent);

  const [emails, setEmails] = useState<string[]>([]);
  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [access, setAccess] = useState<AccessDetails | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [toRemove, setToRemove] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Record<Provider, boolean> | null>(null);
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [ip, setIp] = useState<{ configured?: boolean; testOk?: boolean } | undefined>();
  const [plans, setPlans] = useState<CheckoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [fProvider, setFProvider] = useState("all");
  const [fStatus, setFStatus] = useState<EventStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [auditFilter, setAuditFilter] = useState("all");

  const reloadEvents = useCallback(async () => {
    const [ev, au] = await Promise.all([getEvents(), getAudit()]);
    setEvents(ev);
    setAudit(au);
  }, [getEvents, getAudit]);

  useEffect(() => {
    const safe = <T,>(p: Promise<T>) => p.catch(() => null);
    void Promise.all([
      getEmails(),
      getWebhooks(),
      getEvents(),
      safe(getAccess()),
      safe(getAudit()),
      safe(getIntegrations()),
      safe(getSetup()),
    ])
      .then(([emailResult, tokenResult, eventResult, accessResult, auditResult, integ, setup]) => {
        setEmails(emailResult.emails);
        setSavedEmails(emailResult.emails);
        setTokens(tokenResult);
        setEvents(eventResult);
        setAccess(accessResult);
        setAudit(auditResult ?? []);
        setIp(integ?.items.find((i) => i.provider === "infinitepay"));
        setPlans(setup?.paymentPlans ?? []);
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar a área."),
      )
      .finally(() => setLoading(false));
  }, [getEmails, getEvents, getWebhooks, getAccess, getAudit, getIntegrations, getSetup]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const webhookUrl = (provider: Provider) =>
    tokens?.[provider] ? `${origin}/api/public/billing/webhook?provider=${provider}` : "";
  const ipStatus = checkoutStatus("infinitepay", ip, plans);
  const summary = useMemo(() => summarizeEvents(events), [events]);
  const lastBy = useMemo(() => lastEventByProvider(events), [events]);
  const shown = useMemo(
    () => filterEvents(events, { provider: fProvider, status: fStatus, search }),
    [events, fProvider, fStatus, search],
  );
  const dirty = !sameEmailList(emails, savedEmails);
  const auditShown = audit.filter((a) => auditFilter === "all" || a.action === auditFilter);

  function addEmail(event: React.FormEvent) {
    event.preventDefault();
    const clean = normalizeEmail(newEmail);
    const invalid = emailError(clean);
    if (invalid) return toast.error(invalid);
    if (emails.includes(clean)) return toast.message("Este e-mail já está autorizado.");
    setEmails((current) => [...current, clean]);
    setNewEmail("");
  }

  function askRemove(email: string) {
    const block = adminRemovalBlock(email, emails, access?.me ?? null, access?.ownerEmail ?? null);
    if (block) return toast.error(REMOVAL_BLOCK_LABEL[block]);
    setToRemove(email);
  }

  async function persistEmails() {
    setSaving(true);
    try {
      await saveEmails({ data: { emails } });
      setSavedEmails(emails);
      toast.success("Acessos administrativos atualizados.");
      void getAudit().then(setAudit).catch(() => undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function retry(id: string) {
    setRetrying(id);
    try {
      await reprocess({ data: { id } });
      toast.success("Aviso reprocessado.");
      await reloadEvents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível reprocessar.");
    } finally {
      setRetrying(null);
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

  const health = [
    { icon: Users, label: "Administradores", value: String(savedEmails.length), tone: "" },
    {
      icon: CreditCard,
      label: "Checkout",
      value: ipStatus.active ? "Ativo" : ipStatus.label,
      tone: ipStatus.active ? "text-success" : "text-destructive",
    },
    {
      icon: AlertCircle,
      label: "Avisos com erro (24h)",
      value: String(summary.errors24h),
      tone: summary.errors24h ? "text-destructive" : "text-success",
    },
    { icon: History, label: "Ações registradas", value: String(audit.length), tone: "" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <IntegrationSection provider="google" />
      <header>
        <p className="text-xs font-black uppercase tracking-[.16em] text-primary">
          Administração do SaaS
        </p>
        <h1 className="mt-1 font-display text-2xl font-black tracking-tight sm:text-3xl">
          Acesso e segurança
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Controle quem administra o sistema, acompanhe os pagamentos e o histórico de ações.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {health.map((h) => (
          <Card key={h.label} className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <h.icon className="size-4" /> {h.label}
            </div>
            <div className={`mt-1 truncate font-display text-lg font-black ${h.tone}`}>
              {loading ? "…" : h.value}
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="admins">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="admins">Administradores</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="events">
            Eventos{summary.errors ? ` (${summary.errors})` : ""}
          </TabsTrigger>
          <TabsTrigger value="audit">Registro</TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="space-y-5">
          <Card className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Super admins autorizados</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Quem estiver nesta lista entra no Master. O dono da instalação e o seu próprio
                  acesso não podem ser removidos.
                </p>
              </div>
            </div>

            <form onSubmit={addEmail} className="flex gap-2">
              <Input
                {...EMAIL_INPUT_PROPS}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@exemplo.com"
                aria-label="E-mail do novo super admin"
              />
              <Button type="submit" variant="outline" aria-label="Adicionar super admin">
                <Plus className="size-4" />
              </Button>
            </form>

            {loading ? (
              <div className="grid min-h-20 place-items-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ul className="divide-y rounded-xl border">
                {emails.map((email) => {
                  const d = access?.details[email];
                  const isOwner = access?.ownerEmail === email;
                  const isMe = access?.me === email;
                  const pending = !savedEmails.includes(email);
                  return (
                    <li key={email} className="flex items-center gap-3 p-3">
                      <KeyRound className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{email}</span>
                          {isOwner && (
                            <Badge variant="secondary" className="gap-1">
                              <Crown className="size-3" /> Dono
                            </Badge>
                          )}
                          {isMe && <Badge variant="outline">Você</Badge>}
                          {pending && <Badge variant="outline">Novo</Badge>}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {d
                            ? `Conta criada ${fmt(d.createdAt)} · Último acesso ${fmt(d.lastSignIn)}`
                            : "Ainda não criou conta"}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Remover ${email}`}
                        onClick={() => askRemove(email)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            {dirty && (
              <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-semibold">Alterações não salvas</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEmails(savedEmails)}>
                    Descartar
                  </Button>
                  <Button size="sm" onClick={persistEmails} disabled={saving}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Salvar acessos
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Identidade é feita por prompt</h2>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                    Nome, cores, logo e textos da página inicial são ajustados em "Sua marca".
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link to="/master/implantacao">
                  Abrir Sua marca <ExternalLink className="size-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold">InfinitePay</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Último aviso recebido: {fmt(lastBy.infinitepay)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    ipStatus.active
                      ? "bg-success text-success-foreground hover:bg-success"
                      : "bg-destructive/10 text-destructive hover:bg-destructive/10"
                  }
                >
                  {ipStatus.active ? <CheckCircle2 className="mr-1 size-3" /> : null}
                  {ipStatus.label}
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <Link to="/master/pagamentos">Configurar</Link>
                </Button>
              </div>
            </div>
          </Card>

          <Card className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Webhook className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Outras plataformas</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Kiwify, Cakto e PerfectPay. Os tokens ficam nos Secrets; aqui você copia a URL.
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {PROVIDERS.map((provider) => (
                <div key={provider.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-black uppercase tracking-[.12em]">
                      {provider.id}
                    </div>
                    <Badge variant={tokens?.[provider.id] ? "secondary" : "outline"}>
                      {tokens?.[provider.id] ? "Pronto" : "Falta token"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Último aviso: {fmt(lastBy[provider.id])}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Input
                      readOnly
                      value={webhookUrl(provider.id) || `Cadastre ${provider.secret}`}
                      className="font-mono text-[11px]"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label={`Copiar URL ${provider.id}`}
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
        </TabsContent>

        <TabsContent value="events">
          <Card className="space-y-4 p-5 sm:p-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Recebidos hoje", summary.today, ""],
                ["Processados", summary.ok, "text-success"],
                ["Com erro", summary.errors, summary.errors ? "text-destructive" : ""],
              ].map(([l, v, t]) => (
                <div key={String(l)} className="rounded-xl border p-3">
                  <div className="text-[11px] text-muted-foreground">{l}</div>
                  <div className={`font-display text-xl font-black ${t}`}>{v}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Buscar por e-mail do comprador"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={fProvider} onValueChange={setFProvider}>
                <SelectTrigger className="sm:w-44" aria-label="Plataforma">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas plataformas</SelectItem>
                  {["infinitepay", "stripe", "kiwify", "cakto", "perfectpay"].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fStatus} onValueChange={(v) => setFStatus(v as EventStatus | "all")}>
                <SelectTrigger className="sm:w-40" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="ok">Processado</SelectItem>
                  <SelectItem value="ignored">Ignorado</SelectItem>
                  <SelectItem value="error">Com erro</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={!shown.length}
                onClick={() => download("eventos-cobranca.csv", eventsCsv(shown))}
              >
                <Download className="size-4" /> CSV
              </Button>
            </div>

            {loading ? (
              <div className="grid min-h-28 place-items-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : shown.length === 0 ? (
              <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
                Nenhum aviso de pagamento encontrado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="border-b">
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Plataforma</th>
                      <th className="pb-2 font-medium">Evento</th>
                      <th className="pb-2 font-medium">Comprador</th>
                      <th className="pb-2 font-medium">Recebido em</th>
                      <th className="pb-2 text-right font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((event) => {
                      const s = eventStatus(event);
                      return (
                        <tr key={event.id} className="border-b last:border-0">
                          <td className="py-3">
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                              {s === "error" ? (
                                <AlertCircle className="size-4 text-destructive" />
                              ) : (
                                <CheckCircle2
                                  className={`size-4 ${s === "ok" ? "text-success" : "text-muted-foreground"}`}
                                />
                              )}
                              {s === "ok" ? "Processado" : s === "ignored" ? "Ignorado" : "Erro"}
                            </span>
                            {s === "error" && event.error && (
                              <div className="mt-0.5 max-w-48 truncate text-[10px] text-destructive">
                                {event.error}
                              </div>
                            )}
                          </td>
                          <td className="py-3 font-mono uppercase">{event.provider}</td>
                          <td className="py-3">{event.event_type || "—"}</td>
                          <td className="max-w-52 truncate py-3">{event.buyer_email || "—"}</td>
                          <td className="py-3 text-muted-foreground">{fmt(event.created_at)}</td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {event.matched_company_id && (
                                <Button asChild size="sm" variant="ghost">
                                  <Link
                                    to="/master/assinantes"
                                    search={{ q: event.buyer_email ?? "" } as never}
                                  >
                                    Abrir ficha
                                  </Link>
                                </Button>
                              )}
                              {s === "error" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={retrying === event.id}
                                  onClick={() => retry(event.id)}
                                >
                                  {retrying === event.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <RotateCw className="size-3" />
                                  )}
                                  Reprocessar
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Registro de segurança</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ações sensíveis feitas no Master: administradores, chaves e suspensões.
                </p>
              </div>
              <Select value={auditFilter} onValueChange={setAuditFilter}>
                <SelectTrigger className="sm:w-60" aria-label="Tipo de ação">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {Array.from(new Set(audit.map((a) => a.action))).map((a) => (
                    <SelectItem key={a} value={a}>
                      {auditActionLabel(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {auditShown.length === 0 ? (
              <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
                Nenhuma ação registrada ainda. As próximas alterações aparecerão aqui.
              </p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {auditShown.map((a) => {
                  const d = a.details as { added?: string[]; removed?: string[] };
                  const extra = [
                    d?.added?.length ? `+ ${d.added.join(", ")}` : "",
                    d?.removed?.length ? `− ${d.removed.join(", ")}` : "",
                    a.target ?? "",
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={a.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{auditActionLabel(a.action)}</div>
                        {extra && (
                          <div className="truncate text-[11px] text-muted-foreground">{extra}</div>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground sm:text-right">
                        {a.actor_email ?? "—"}
                        <br />
                        {fmt(a.created_at)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover acesso de administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              {toRemove} perde o acesso ao Master assim que você salvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEmails((c) => c.filter((e) => e !== toRemove));
                setToRemove(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
