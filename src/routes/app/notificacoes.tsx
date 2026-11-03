/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Sparkles,
  Bell,
  BellRing,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Loader2,
  MoreHorizontal,
  PiggyBank,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Smartphone,
  Trash2,
  FileText,
  Download,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/mia/page-kit";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { brandedRouteHead } from "@/config/brand";
import { useMarciaNotifications } from "@/hooks/use-mia-notifications";
import { supabase } from "@/lib/auth/realm-supabase";
import { sendTestPush } from "@/lib/finance/push.functions";
import { downloadMonthlyReport, sendMonthlyReportWhatsapp } from "@/lib/finance/monthly-report.functions";
import { monthLabel, previousMonth } from "@/lib/finance/monthly-report-rules";
import {
  CATEGORY_LABEL,
  DEFAULT_PREFERENCE,
  NOTIFICATION_CATEGORIES,
  dayGroup,
  notificationCategory,
  notificationTarget,
  notificationUrgency,
  type DayGroup,
  type NotificationCategory,
  type NotificationPreference,
  type Urgency,
} from "@/lib/finance/notification-rules";

type Notice = {
  id: string;
  company_id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  archived_at: string | null;
  priority: string | null;
  created_at: string;
};

const PAGE = 50;
const COLUMNS =
  "id,company_id,recipient_user_id,type,title,body,entity_type,entity_id,data,read_at,archived_at,priority,created_at";
type Filter = "all" | "unread" | NotificationCategory;
const GROUPS: DayGroup[] = ["Hoje", "Ontem", "Esta semana", "Mais antigas"];

export const Route = createFileRoute("/app/notificacoes")({
  head: brandedRouteHead("Notificações"),
  component: NotificationsPage,
});

const todaySP = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

function NotificationsPage() {
  const context = Route.useRouteContext();
  const companyId = context.company?.id;
  const userId = context.user.id;
  const navigate = useNavigate();
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [devices, setDevices] = useState(0);
  const push = useMarciaNotifications({ companyId, userId });
  const testPush = useServerFn(sendTestPush);
  const today = todaySP();

  const query = useCallback(
    () =>
      (supabase as any)
        .from("marcia_notification")
        .select(COLUMNS)
        .eq("company_id", companyId)
        .eq("recipient_user_id", userId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
    [companyId, userId],
  );

  const load = useCallback(async () => {
    if (!companyId || !userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    const { data, error } = await query().limit(PAGE);
    if (error) setLoadError(error.message || "Não foi possível carregar as notificações.");
    else {
      setItems((data || []) as Notice[]);
      setHasMore((data || []).length === PAGE);
    }
    setLoading(false);
  }, [companyId, userId, query]);

  const loadMore = useCallback(async () => {
    const last = items[items.length - 1];
    if (!last) return;
    setLoadingMore(true);
    const { data, error } = await query().lt("created_at", last.created_at).limit(PAGE);
    if (error) toast.error("Não foi possível carregar mais avisos.");
    else {
      setItems((cur) => [...cur, ...((data || []) as Notice[])]);
      setHasMore((data || []).length === PAGE);
    }
    setLoadingMore(false);
  }, [items, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!companyId || !userId) return;
    void (supabase as any)
      .from("marcia_push_subscription")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("active", true)
      .then((r: any) => setDevices(r.count || 0));
  }, [companyId, userId, push.isSubscribed]);

  useEffect(() => {
    if (!companyId || !userId) return;
    const channel = supabase
      .channel(`mia:notifications:${companyId}:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marcia_notification", filter: `company_id=eq.${companyId}` },
        (payload: any) => {
          const next = payload.new as Notice | undefined;
          const prev = payload.old as Notice | undefined;
          const row = next?.id ? next : prev;
          if (!row?.id) return;
          if (next?.id && next.recipient_user_id !== userId) return;
          setItems((cur) => {
            if (payload.eventType === "DELETE" || next?.archived_at)
              return cur.filter((i) => i.id !== row.id);
            if (cur.some((i) => i.id === row.id)) return cur.map((i) => (i.id === row.id ? next! : i));
            return [next!, ...cur];
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, userId]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, unread: 0 };
    for (const k of NOTIFICATION_CATEGORIES) c[k] = 0;
    for (const n of items) {
      if (!n.read_at) c.unread++;
      c[notificationCategory(n)]++;
    }
    return c;
  }, [items]);

  const visible = useMemo(
    () =>
      items.filter((n) =>
        filter === "all" ? true : filter === "unread" ? !n.read_at : notificationCategory(n) === filter,
      ),
    [items, filter],
  );

  const grouped = useMemo(() => {
    const map = new Map<DayGroup, Notice[]>();
    for (const n of visible) {
      const g = dayGroup(n.created_at);
      map.set(g, [...(map.get(g) || []), n]);
    }
    return GROUPS.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const);
  }, [visible]);

  const weekSummary = useMemo(() => {
    const until = new Date(`${today}T12:00:00Z`);
    until.setUTCDate(until.getUTCDate() + 7);
    const limit = until.toISOString().slice(0, 10);
    const seen = new Set<string>();
    let total = 0;
    let overdue = 0;
    for (const n of items) {
      if (n.type !== "finance.due") continue;
      const due = String(n.data?.dueDate || "");
      const key = `${n.entity_id}:${due}`;
      if (!due || seen.has(key) || due > limit) continue;
      seen.add(key);
      total += Number(n.data?.amountCents || 0);
      if (due < today) overdue++;
    }
    return { count: seen.size, total, overdue };
  }, [items, today]);

  const patch = useCallback(
    async (ids: string[], values: Partial<Notice>, okMsg?: string) => {
      if (!companyId || !ids.length) return false;
      const { error } = await (supabase as any)
        .from("marcia_notification")
        .update(values)
        .in("id", ids)
        .eq("company_id", companyId)
        .eq("recipient_user_id", userId);
      if (error) {
        toast.error("Não foi possível atualizar o aviso.");
        return false;
      }
      setItems((cur) =>
        values.archived_at
          ? cur.filter((i) => !ids.includes(i.id))
          : cur.map((i) => (ids.includes(i.id) ? { ...i, ...values } : i)),
      );
      if (okMsg) toast.success(okMsg);
      return true;
    },
    [companyId, userId],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any)
        .from("marcia_notification")
        .delete()
        .eq("id", id)
        .eq("recipient_user_id", userId);
      if (error) toast.error("Não foi possível excluir o aviso.");
      else setItems((cur) => cur.filter((i) => i.id !== id));
    },
    [userId],
  );

  const now = () => new Date().toISOString();
  const unreadIds = items.filter((i) => !i.read_at).map((i) => i.id);
  const readIds = items.filter((i) => i.read_at).map((i) => i.id);

  async function openNotice(n: Notice) {
    if (!n.read_at) await patch([n.id], { read_at: now() });
    const target = notificationTarget(n);
    if (target !== "/app/notificacoes") void navigate({ to: target as any });
  }

  async function markPaid(n: Notice) {
    if (n.entity_type !== "fin_lancamento" || !n.entity_id) return;
    const { error } = await (supabase as any)
      .from("fin_lancamento")
      .update({ status: "pago", pago_em: today })
      .eq("id", n.entity_id)
      .eq("company_id", companyId);
    if (error) return toast.error("Não foi possível marcar a conta como paga.");
    await patch([n.id], { archived_at: now(), read_at: n.read_at || now() }, "Conta marcada como paga.");
  }

  async function postpone(n: Notice) {
    const due = String(n.data?.dueDate || "");
    if (n.entity_type !== "fin_lancamento" || !n.entity_id || !due) return;
    const d = new Date(`${(due < today ? today : due)}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    const next = d.toISOString().slice(0, 10);
    const { error } = await (supabase as any)
      .from("fin_lancamento")
      .update({ vencimento: next, status: "pendente" })
      .eq("id", n.entity_id)
      .eq("company_id", companyId);
    if (error) return toast.error("Não foi possível adiar a conta.");
    await patch(
      [n.id],
      { archived_at: now(), read_at: n.read_at || now() },
      `Vencimento adiado para ${new Date(`${next}T12:00:00`).toLocaleDateString("pt-BR")}.`,
    );
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "unread", label: "Não lidas" },
    ...NOTIFICATION_CATEGORIES.map((k) => ({ key: k as Filter, label: CATEGORY_LABEL[k] })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Central de avisos"
        title="Notificações"
        description="Contas a vencer, orçamento, agenda e novidades do seu MIAnota em um só lugar."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setPrefsOpen(true)}>
              <Settings2 /> Preferências
            </Button>
            {unreadIds.length > 0 && (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => void patch(unreadIds, { read_at: now() }, "Todas marcadas como lidas.")}
              >
                <CheckCheck /> Marcar todas como lidas
              </Button>
            )}
          </div>
        }
      />

      {weekSummary.count > 0 && (
        <button
          type="button"
          onClick={() => void navigate({ to: "/app/planejamento" })}
          className="flex w-full items-center gap-4 rounded-[20px] border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition hover:border-primary/40"
        >
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <CircleDollarSign className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-extrabold">
              {weekSummary.count} {weekSummary.count === 1 ? "conta vence" : "contas vencem"} esta semana
              {weekSummary.total > 0 ? ` · ${money(weekSummary.total)}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {weekSummary.overdue
                ? `${weekSummary.overdue} já ${weekSummary.overdue === 1 ? "está atrasada" : "estão atrasadas"}. `
                : ""}
              Toque para ver no Planejamento.
            </p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </button>
      )}

      <PushCard
        push={push}
        devices={devices}
        onActivate={async () => {
          const r = await push.activate();
          if (r.ok) toast.success("Aparelho cadastrado! Você vai receber os avisos aqui.");
          else toast.error(r.error);
        }}
        onTest={async () => {
          if (!companyId) return;
          const r = await testPush({ data: { companyId } });
          if (r.ok) toast.success("Notificação de teste enviada.");
          else toast.error(r.error);
        }}
        onDeactivate={async () => {
          const r = await push.deactivate();
          if (r.ok) toast.success("Notificações desativadas neste aparelho.");
          else toast.error(r.error);
        }}
      />

      {companyId && <MonthlyReportCard companyId={companyId} />}

      <section className="overflow-hidden rounded-[24px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-extrabold">Caixa de entrada</h2>
              <p className="text-xs text-muted-foreground">
                {counts.unread ? `${counts.unread} não ${counts.unread === 1 ? "lida" : "lidas"}` : "Tudo lido"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {readIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void patch(readIds, { archived_at: now() }, "Avisos lidos arquivados.")}
              >
                <Archive /> Limpar lidas
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => void load()} disabled={loading} aria-label="Atualizar notificações">
              <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 sm:px-6" role="tablist">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-primary-foreground/20" : "bg-background"}`}>
                  {counts[f.key] || 0}
                </span>
              </button>
            );
          })}
        </div>

        <div aria-live="polite">
          {loading ? (
            <Skeleton />
          ) : loadError ? (
            <div className="m-4 rounded-2xl border border-warning/40 bg-warning/10 p-5 text-sm sm:m-6">
              <p className="font-bold">Ainda não consegui abrir seus avisos.</p>
              <p className="mt-1 text-muted-foreground">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => void load()} className="mt-3">
                Tentar novamente
              </Button>
            </div>
          ) : visible.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center px-6 text-center">
              <div className="max-w-sm">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <BellRing className="size-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-extrabold">
                  {filter === "all" ? "Nenhum aviso por enquanto" : "Nada neste filtro"}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Alertas de vencimento, orçamento e novidades aparecerão aqui.
                </p>
              </div>
            </div>
          ) : (
            grouped.map(([group, list]) => (
              <div key={group}>
                <h3 className="bg-muted/50 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground sm:px-6">
                  {group}
                </h3>
                <div className="divide-y divide-border">
                  {list.map((n) => (
                    <Row
                      key={n.id}
                      n={n}
                      urgency={notificationUrgency(n, today)}
                      onOpen={() => void openNotice(n)}
                      onRead={() => void patch([n.id], { read_at: now() })}
                      onArchive={() => void patch([n.id], { archived_at: now() }, "Aviso arquivado.")}
                      onDelete={() => void remove(n.id)}
                      onPaid={() => void markPaid(n)}
                      onPostpone={() => void postpone(n)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
          {hasMore && !loading && (
            <div className="border-t border-border p-4 text-center">
              <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore && <Loader2 className="animate-spin" />} Carregar mais
              </Button>
            </div>
          )}
        </div>
      </section>

      <PreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} userId={userId} />
    </div>
  );
}

const URGENCY_STYLE: Record<Urgency, { icon: string; label?: string; chip?: string }> = {
  overdue: { icon: "bg-destructive text-destructive-foreground", label: "Atrasada", chip: "bg-destructive/10 text-destructive" },
  today: { icon: "bg-warning text-warning-foreground", label: "Vence hoje", chip: "bg-warning/15 text-warning" },
  soon: { icon: "bg-primary text-primary-foreground", label: "Em breve", chip: "bg-primary/10 text-primary" },
  info: { icon: "bg-primary text-primary-foreground" },
};

function Row({
  n,
  urgency,
  onOpen,
  onRead,
  onArchive,
  onDelete,
  onPaid,
  onPostpone,
}: {
  n: Notice;
  urgency: Urgency;
  onOpen: () => void;
  onRead: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onPaid: () => void;
  onPostpone: () => void;
}) {
  const unread = !n.read_at;
  const Icon = iconFor(notificationCategory(n));
  const style = URGENCY_STYLE[n.type === "finance.due" ? urgency : n.priority === "high" ? "overdue" : "info"];
  const isBill = n.type === "finance.due" && n.entity_type === "fin_lancamento" && !!n.entity_id;

  return (
    <article className={`group relative flex gap-3 px-4 py-4 sm:gap-4 sm:px-6 ${unread ? "bg-primary/5" : ""}`}>
      {unread && <span aria-hidden className="absolute left-0 top-0 h-full w-1 bg-primary" />}
      <div className={`grid size-10 shrink-0 place-items-center rounded-2xl ${unread ? style.icon : "bg-muted text-muted-foreground"}`}>
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h4 className={`text-sm ${unread ? "font-extrabold" : "font-bold text-muted-foreground"}`}>
              {n.title}
              {style.label && (
                <span className={`ml-2 rounded-full px-2 py-0.5 align-middle text-[10px] font-black uppercase ${style.chip}`}>
                  {style.label}
                </span>
              )}
            </h4>
            <time className="shrink-0 text-[11px] font-semibold text-muted-foreground" dateTime={n.created_at}>
              {relativeDate(n.created_at)}
            </time>
          </div>
          {n.body && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{n.body}</p>}
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {isBill && (
            <>
              <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={onPaid}>
                <Check /> Marcar como paga
              </Button>
              <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={onPostpone}>
                <Clock /> Adiar 1 dia
              </Button>
            </>
          )}
          {(isBill || n.type.startsWith("finance.") || n.type.startsWith("budget")) && (
            <Link
              to="/app/marcia"
              search={{ pergunta: `Sobre o aviso "${n.title}": o que devo fazer?` }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-extrabold text-primary hover:bg-primary/5"
            >
              <Sparkles className="size-3.5" /> Perguntar à MIA
            </Link>
          )}
          {unread && !isBill && (
            <button type="button" onClick={onRead} className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary">
              <Check className="size-3.5" /> Marcar como lida
            </button>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Mais opções">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {unread && (
            <DropdownMenuItem onClick={onRead}>
              <Check /> Marcar como lida
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onArchive}>
            <Archive /> Arquivar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  );
}

function PushCard({
  push,
  devices,
  onActivate,
  onTest,
  onDeactivate,
}: {
  push: ReturnType<typeof useMarciaNotifications>;
  devices: number;
  onActivate: () => Promise<void>;
  onTest: () => Promise<void>;
  onDeactivate: () => Promise<void>;
}) {
  const active = push.isSubscribed && push.permission === "granted";

  if (active) {
    return (
      <section className="flex flex-wrap items-center gap-3 rounded-[20px] border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)] sm:px-5">
        <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">Este aparelho recebe os avisos da MIA</p>
          <p className="text-xs text-muted-foreground">
            {devices} {devices === 1 ? "aparelho cadastrado" : "aparelhos cadastrados"} na sua conta
          </p>
        </div>
        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void onTest()}>
          <Bell /> Enviar teste
        </Button>
        <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => void onDeactivate()}>
          Desativar
        </Button>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(125deg,var(--brand-master)_0%,var(--brand-strong)_55%,var(--brand)_100%)] p-5 text-primary-foreground shadow-[var(--shadow-card)] sm:p-6">
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-2xl gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15">
            <Smartphone className="size-6" />
          </div>
          <div>
            <h2 className="font-display text-lg font-extrabold">Receba os avisos no celular</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed opacity-85">
              Toque em Cadastrar aparelho e permita as notificações. No iPhone, instale o app na tela inicial antes.
            </p>
            {push.error && <p className="mt-2 text-xs font-semibold">{push.error}</p>}
            {!push.supported && (
              <p className="mt-2 text-xs font-semibold">Abra o sistema por HTTPS em um navegador compatível.</p>
            )}
          </div>
        </div>
        <Button
          onClick={() => void onActivate()}
          disabled={!push.supported || push.isActivating}
          variant="secondary"
          className="h-11 shrink-0 rounded-xl px-5 font-extrabold"
        >
          {push.isActivating ? <Loader2 className="animate-spin" /> : <BellRing />}
          {push.isActivating ? "Ativando..." : "Cadastrar aparelho"}
        </Button>
      </div>
    </section>
  );
}

function PreferencesDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}) {
  const [pref, setPref] = useState<NotificationPreference>(DEFAULT_PREFERENCE);
  const [quiet, setQuiet] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (supabase as any)
      .from("notification_preference")
      .select("push_categories,quiet_start,quiet_end,reminder_lead_days,daily_summary,whatsapp_enabled,whatsapp_categories,monthly_report")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }: any) => {
        const p = { ...DEFAULT_PREFERENCE, ...(data || {}) };
        setPref(p);
        setQuiet(p.quiet_start != null && p.quiet_end != null);
      });
  }, [open, userId]);

  function toggleCat(c: NotificationCategory, on: boolean) {
    setPref((p) => ({
      ...p,
      push_categories: on ? [...new Set([...p.push_categories, c])] : p.push_categories.filter((x) => x !== c),
    }));
  }

  async function save() {
    setSaving(true);
    const row = {
      user_id: userId,
      push_categories: pref.push_categories,
      quiet_start: quiet ? (pref.quiet_start ?? 22) : null,
      quiet_end: quiet ? (pref.quiet_end ?? 7) : null,
      reminder_lead_days: pref.reminder_lead_days,
      daily_summary: pref.daily_summary,
      whatsapp_enabled: pref.whatsapp_enabled ?? true,
      whatsapp_categories: pref.whatsapp_categories ?? [],
      monthly_report: pref.monthly_report ?? true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await (supabase as any).from("notification_preference").upsert(row, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar as preferências.");
    toast.success("Preferências salvas.");
    onOpenChange(false);
  }

  const hours = Array.from({ length: 24 }, (_, h) => h);
  const selectCls = "h-9 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferências de notificação</DialogTitle>
          <DialogDescription>Todos os avisos ficam na Central. Escolha quais também chegam no celular e no WhatsApp.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">No celular</p>
            {NOTIFICATION_CATEGORIES.map((c) => (
              <label key={c} className="flex items-center justify-between gap-3 text-sm font-semibold">
                {CATEGORY_LABEL[c]}
                <Switch checked={pref.push_categories.includes(c)} onCheckedChange={(v) => toggleCat(c, v)} />
              </label>
            ))}
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
              No WhatsApp
              <Switch checked={pref.whatsapp_enabled ?? true} onCheckedChange={(v) => setPref({ ...pref, whatsapp_enabled: v })} />
            </label>
            {(pref.whatsapp_enabled ?? true) &&
              NOTIFICATION_CATEGORIES.map((c) => (
                <label key={c} className="flex items-center justify-between gap-3 text-sm font-semibold">
                  {CATEGORY_LABEL[c]}
                  <Switch
                    checked={(pref.whatsapp_categories ?? []).includes(c)}
                    onCheckedChange={(v) =>
                      setPref((p) => {
                        const cur = p.whatsapp_categories ?? [];
                        return { ...p, whatsapp_categories: v ? [...new Set([...cur, c])] : cur.filter((x) => x !== c) };
                      })
                    }
                  />
                </label>
              ))}
            <p className="text-xs text-muted-foreground">Chega no número que você vinculou à MIA. O horário de silêncio também vale aqui.</p>
          </div>
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-3 text-sm font-semibold">
              Horário de silêncio
              <Switch checked={quiet} onCheckedChange={setQuiet} />
            </label>
            {quiet && (
              <div className="flex items-center gap-2 text-sm">
                das
                <select className={selectCls} value={pref.quiet_start ?? 22} onChange={(e) => setPref({ ...pref, quiet_start: Number(e.target.value) })}>
                  {hours.map((h) => <option key={h} value={h}>{`${h}h`}</option>)}
                </select>
                às
                <select className={selectCls} value={pref.quiet_end ?? 7} onChange={(e) => setPref({ ...pref, quiet_end: Number(e.target.value) })}>
                  {hours.map((h) => <option key={h} value={h}>{`${h}h`}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Avisar sobre contas</p>
            <select
              className={`${selectCls} w-full`}
              value={pref.reminder_lead_days}
              onChange={(e) => setPref({ ...pref, reminder_lead_days: Number(e.target.value) })}
            >
              <option value={0}>Só no dia do vencimento</option>
              <option value={1}>1 dia antes</option>
              <option value={3}>3 dias antes</option>
            </select>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>
              Resumo diário da MIA
              <span className="block text-xs font-normal text-muted-foreground">Gastos do dia e próximas contas, às 20h.</span>
            </span>
            <Switch checked={pref.daily_summary} onCheckedChange={(v) => setPref({ ...pref, daily_summary: v })} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>
              Relatório mensal em PDF
              <span className="block text-xs font-normal text-muted-foreground">Todo dia 1, com o resumo do mês anterior.</span>
            </span>
            <Switch checked={pref.monthly_report ?? true} onCheckedChange={(v) => setPref({ ...pref, monthly_report: v })} />
          </label>
        </div>
        <DialogFooter>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Skeleton() {
  return (
    <div className="divide-y divide-border" aria-label="Carregando notificações">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-4 px-4 py-5 sm:px-6">
          <div className="size-10 rounded-2xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-muted" />
            <div className="h-3 w-2/3 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function iconFor(c: NotificationCategory) {
  if (c === "finance") return CircleDollarSign;
  if (c === "budget") return PiggyBank;
  if (c === "agenda") return CalendarClock;
  return Bell;
}

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

function relativeDate(value: string) {
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - t) / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(t));
}

function MonthlyReportCard({ companyId }: { companyId: string }) {
  const today = todaySP();
  const months = Array.from({ length: 12 }, (_, i) => {
    let m = today.slice(0, 7);
    for (let k = 0; k < i; k++) m = previousMonth(`${m}-15`);
    return m;
  });
  const [month, setMonth] = useState(months[1]);
  const [busy, setBusy] = useState<"" | "pdf" | "wa">("");
  const download = useServerFn(downloadMonthlyReport);
  const sendWa = useServerFn(sendMonthlyReportWhatsapp);

  async function onDownload() {
    setBusy("pdf");
    try {
      const r = await download({ data: { companyId, month } });
      const bin = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bin], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = r.fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error("Não foi possível gerar o relatório.");
    }
    setBusy("");
  }

  async function onWhatsapp() {
    setBusy("wa");
    try {
      const r = await sendWa({ data: { companyId, month } });
      if (r.ok) toast.success(r.mode === "pdf" ? "Relatório enviado no seu WhatsApp." : "Resumo enviado no WhatsApp.");
      else toast.error(r.error);
    } catch {
      toast.error("Não foi possível enviar agora.");
    }
    setBusy("");
  }

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-[20px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
        <FileText className="size-5" />
      </div>
      <div className="min-w-[180px] flex-1">
        <p className="font-display text-base font-extrabold">Relatório mensal</p>
        <p className="text-xs text-muted-foreground">Receitas, despesas, gastos por categoria e todos os lançamentos em PDF.</p>
      </div>
      <select
        aria-label="Mês do relatório"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm capitalize"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
      >
        {months.map((m) => (
          <option key={m} value={m}>{monthLabel(m)}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <Button variant="outline" className="rounded-xl" onClick={() => void onWhatsapp()} disabled={!!busy}>
          {busy === "wa" ? <Loader2 className="animate-spin" /> : <MessageCircle />} WhatsApp
        </Button>
        <Button className="rounded-xl" onClick={() => void onDownload()} disabled={!!busy}>
          {busy === "pdf" ? <Loader2 className="animate-spin" /> : <Download />} Baixar PDF
        </Button>
      </div>
    </section>
  );
}
