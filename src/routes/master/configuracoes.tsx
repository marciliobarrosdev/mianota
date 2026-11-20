import { IntegrationSection } from "@/components/master/integration-card";
import { EMAIL_INPUT_PROPS, emailError, normalizeEmail } from "@/lib/common/masks";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  BILLING_EVENTS_PAGE,
  MASTER_AUDIT_PAGE,
  getAdminAccessDetails,
  listBillingEventsAdmin,
  listMasterAudit,
  reprocessBillingEvent,
} from "@/lib/master/master-security.functions";
import { hasMore } from "@/lib/common/pagination-rules";
import { getIntegrationsOverview } from "@/lib/common/integrations.functions";
import { getMasterSetupProgress } from "@/lib/master/master-setup.functions";
import { checkoutStatus, type CheckoutPlan } from "@/lib/billing/payment-checkout-rules";
import {
  AUDIT_ACTION_LABEL,
  REMOVAL_BLOCK_LABEL,
  adminRemovalBlock,
  auditActionLabel,
  eventStatus,
  eventsCsv,
  sameEmailList,
  type EventStatus,
} from "@/lib/master/security-rules";

type EventsPage = Awaited<ReturnType<typeof listBillingEventsAdmin>>;
type AuditPage = Awaited<ReturnType<typeof listMasterAudit>>;
const EMPTY_EVENTS: EventsPage = {
  rows: [],
  total: 0,
  summary: { today: 0, ok: 0, errors: 0, errors24h: 0 },
  lastBy: {},
};
const EMPTY_AUDIT: AuditPage = { rows: [], total: 0, all: 0 };
type AccessDetails = Awaited<ReturnType<typeof getAdminAccessDetails>>;

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
  // Avisos e registro chegam por janela ("Carregar mais"), já filtrados pelo servidor.
  const [eventsPage, setEventsPage] = useState<EventsPage>(EMPTY_EVENTS);
  const [auditPage, setAuditPage] = useState<AuditPage>(EMPTY_AUDIT);
  const [eventsLimit, setEventsLimit] = useState(BILLING_EVENTS_PAGE);
  const [auditLimit, setAuditLimit] = useState(MASTER_AUDIT_PAGE);
  const [moreBusy, setMoreBusy] = useState<"events" | "audit" | null>(null);
  const [ip, setIp] = useState<{ configured?: boolean; testOk?: boolean } | undefined>();
  const [plans, setPlans] = useState<CheckoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [fProvider, setFProvider] = useState("all");
  const [fStatus, setFStatus] = useState<EventStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [auditFilter, setAuditFilter] = useState("all");

  const fetchEvents = useCallback(
    (limit: number) =>
      getEvents({ data: { limit, provider: fProvider, status: fStatus, search: debouncedSearch } }),
    [getEvents, fProvider, fStatus, debouncedSearch],
  );
  const fetchAudit = useCallback(
    (limit: number) => getAudit({ data: { limit, action: auditFilter } }),
    [getAudit, auditFilter],
  );

  const reloadEvents = useCallback(async () => {
    const [ev, au] = await Promise.all([fetchEvents(eventsLimit), fetchAudit(auditLimit)]);
    setEventsPage(ev);
    setAuditPage(au);
  }, [fetchEvents, fetchAudit, eventsLimit, auditLimit]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  // Filtros novos voltam para a primeira janela. A primeira execução fica com a carga inicial.
  const filtersReady = useRef({ events: false, audit: false });
  useEffect(() => {
    if (!filtersReady.current.events) {
      filtersReady.current.events = true;
      return;
    }
    setEventsLimit(BILLING_EVENTS_PAGE);
    void fetchEvents(BILLING_EVENTS_PAGE)
      .then(setEventsPage)
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao filtrar."));
  }, [fetchEvents]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!filtersReady.current.audit) {
      filtersReady.current.audit = true;
      return;
    }
    setAuditLimit(MASTER_AUDIT_PAGE);
    void fetchAudit(MASTER_AUDIT_PAGE)
      .then(setAuditPage)
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao filtrar."));
  }, [fetchAudit]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMore(kind: "events" | "audit") {
    setMoreBusy(kind);
    try {
      if (kind === "events") {
        const next = eventsLimit + BILLING_EVENTS_PAGE;
        setEventsLimit(next);
        setEventsPage(await fetchEvents(next));
      } else {
        const next = auditLimit + MASTER_AUDIT_PAGE;
        setAuditLimit(next);
        setAuditPage(await fetchAudit(next));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível carregar mais.");
    } finally {
      setMoreBusy(null);
    }
  }

  useEffect(() => {
    const safe = <T,>(p: Promise<T>) => p.catch(() => null);
    void Promise.all([
      getEmails(),
      getEvents({ data: { limit: BILLING_EVENTS_PAGE } }),
      safe(getAccess()),
      safe(getAudit({ data: { limit: MASTER_AUDIT_PAGE } })),
      safe(getIntegrations()),
      safe(getSetup()),
    ])
      .then(([emailResult, eventResult, accessResult, auditResult, integ, setup]) => {
        setEmails(emailResult.emails);
        setSavedEmails(emailResult.emails);
        setEventsPage(eventResult);
        setAccess(accessResult);
        setAuditPage(auditResult ?? EMPTY_AUDIT);
        setIp(integ?.items.find((i) => i.provider === "infinitepay"));
        setPlans(setup?.paymentPlans ?? []);
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar a área."),
      )
      .finally(() => setLoading(false));
  }, [getEmails, getEvents, getAccess, getAudit, getIntegrations, getSetup]);

  const ipStatus = checkoutStatus("infinitepay", ip, plans);
  // Resumo e "último aviso" vêm contados no banco inteiro.
  const { summary, lastBy } = eventsPage;
  const shown = eventsPage.rows;
  const dirty = !sameEmailList(emails, savedEmails);
  const auditShown = auditPage.rows;
  const auditOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...Object.keys(AUDIT_ACTION_LABEL),
          ...auditPage.rows.map((a) => a.action),
          ...(auditFilter === "all" ? [] : [auditFilter]),
        ]),
      ),
    [auditPage.rows, auditFilter],
  );

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
      void fetchAudit(auditLimit).then(setAuditPage).catch(() => undefined);
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
    { icon: History, label: "Ações registradas", value: String(auditPage.all), tone: "" },
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
                  {["infinitepay"].map((p) => (
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
                                  <Link to="/master/assinantes">Abrir Assinantes</Link>
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
            {!loading && shown.length > 0 && (
              <ListMore
                shown={shown.length}
                total={eventsPage.total}
                busy={moreBusy === "events"}
                onClick={() => void loadMore("events")}
              />
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
                  {auditOptions.map((a) => (
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
                  const d = a.details;
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
            {auditShown.length > 0 && (
              <ListMore
                shown={auditShown.length}
                total={auditPage.total}
                busy={moreBusy === "audit"}
                onClick={() => void loadMore("audit")}
              />
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

/** "Mostrando X de Y" + botão "Carregar mais" quando ainda há linhas no servidor. */
function ListMore({
  shown,
  total,
  busy,
  onClick,
}: {
  shown: number;
  total: number;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
      <span>
        Mostrando {shown} de {total}
      </span>
      {hasMore(shown, total) && (
        <Button variant="outline" size="sm" disabled={busy} onClick={onClick}>
          {busy && <Loader2 className="size-4 animate-spin" />} Carregar mais
        </Button>
      )}
    </div>
  );
}
