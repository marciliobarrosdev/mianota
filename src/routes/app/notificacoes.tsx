import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarClock,
  Check,
  CheckCheck,
  ClipboardList,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/marcia/page-kit";
import { Button } from "@/components/ui/button";
import { brandedRouteHead } from "@/config/brand";
import { useMarciaNotifications } from "@/hooks/use-marcia-notifications";
import { supabase } from "@/lib/auth/realm-supabase";

type MarciaNotification = {
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
  created_at: string;
};

export const Route = createFileRoute("/app/notificacoes")({
  head: brandedRouteHead("Notificações"),
  component: NotificationsPage,
});

function NotificationsPage() {
  const context = Route.useRouteContext();
  const companyId = context.company?.id;
  const userId = context.user.id;
  const [notifications, setNotifications] = useState<MarciaNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const push = useMarciaNotifications({ companyId, userId });

  const loadNotifications = useCallback(async () => {
    if (!companyId || !userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    const { data, error } = await (supabase as any)
      .from("marcia_notification")
      .select(
        "id,company_id,recipient_user_id,type,title,body,entity_type,entity_id,data,read_at,created_at",
      )
      .eq("company_id", companyId)
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setLoadError(error.message || "Não foi possível carregar as notificações.");
    } else {
      setNotifications((data || []) as MarciaNotification[]);
    }

    setLoading(false);
  }, [companyId, userId]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!companyId || !userId) return;

    const channel = supabase
      .channel(`marcia:notifications:${companyId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marcia_notification",
          filter: `company_id=eq.${companyId}`,
        },
        (payload: any) => {
          const next = payload.new as MarciaNotification | undefined;
          const previous = payload.old as MarciaNotification | undefined;
          const row = next?.id ? next : previous;
          if (!row?.id || row.recipient_user_id !== userId) return;

          setNotifications((current) => {
            if (payload.eventType === "DELETE") {
              return current.filter((item) => item.id !== row.id);
            }

            const exists = current.some((item) => item.id === row.id);
            if (exists) {
              return current.map((item) => (item.id === row.id ? next! : item));
            }

            return [next!, ...current].slice(0, 100);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, userId]);

  const unread = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  );

  const markAsRead = useCallback(
    async (notification: MarciaNotification) => {
      if (!companyId || notification.read_at) return;

      const readAt = new Date().toISOString();
      const { error } = await (supabase as any)
        .from("marcia_notification")
        .update({ read_at: readAt })
        .eq("id", notification.id)
        .eq("company_id", companyId)
        .eq("recipient_user_id", userId);

      if (error) {
        toast.error("Não foi possível marcar a notificação como lida.");
        return;
      }

      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read_at: readAt } : item)),
      );
    },
    [companyId, userId],
  );

  const markAllAsRead = useCallback(async () => {
    if (!companyId || !unread) return;
    setMarkingAll(true);
    const readAt = new Date().toISOString();

    const { error } = await (supabase as any)
      .from("marcia_notification")
      .update({ read_at: readAt })
      .eq("company_id", companyId)
      .eq("recipient_user_id", userId)
      .is("read_at", null);

    if (error) {
      toast.error("Não foi possível marcar todas como lidas.");
    } else {
      setNotifications((current) => current.map((item) => ({ ...item, read_at: readAt })));
      toast.success("Todas as notificações foram marcadas como lidas.");
    }

    setMarkingAll(false);
  }, [companyId, unread, userId]);

  async function activatePush() {
    const result = await push.activate();
    if (result.ok) {
      toast.success(
        "Aparelho cadastrado. O push depende do serviço de envio configurado no servidor.",
      );
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Central de avisos"
        title="Notificações"
        description="Acompanhe contas a vencer, limites, metas e atualizações importantes do seu financeiro."
        action={
          unread > 0 ? (
            <Button
              variant="outline"
              onClick={markAllAsRead}
              disabled={markingAll}
              className="rounded-xl"
            >
              {markingAll ? <Loader2 className="animate-spin" /> : <CheckCheck />}
              Marcar todas como lidas
            </Button>
          ) : null
        }
      />

      <PushActivationCard push={push} onActivate={activatePush} />

      <section className="overflow-hidden rounded-[24px] border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-violet-100 text-violet-700">
              <Bell className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-extrabold">Caixa de entrada</h2>
              <p className="text-xs text-muted-foreground">
                {unread ? `${unread} não ${unread === 1 ? "lida" : "lidas"}` : "Tudo lido"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadNotifications}
            disabled={loading}
            aria-label="Atualizar notificações"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>

        <div aria-live="polite">
          {loading ? (
            <NotificationSkeleton />
          ) : loadError ? (
            <div className="m-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 sm:m-6">
              <p className="font-bold">Ainda não consegui abrir seus avisos.</p>
              <p className="mt-1 opacity-80">{loadError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadNotifications}
                className="mt-3 bg-white"
              >
                Tentar novamente
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="grid min-h-[280px] place-items-center px-6 text-center">
              <div className="max-w-sm">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                  <BellRing className="size-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-extrabold">
                  Nenhum aviso por enquanto
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Alertas de vencimento, orçamento e atualizações financeiras aparecerão aqui quando
                  forem geradas.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onRead={() => void markAsRead(notification)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PushActivationCard({
  push,
  onActivate,
}: {
  push: ReturnType<typeof useMarciaNotifications>;
  onActivate: () => void;
}) {
  const active = push.isSubscribed && push.permission === "granted";

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-violet-200/70 bg-[linear-gradient(125deg,#2e1065_0%,#6d28d9_55%,#8b5cf6_100%)] p-5 text-white shadow-[0_24px_55px_-32px_rgba(76,29,149,.9)] sm:p-6">
      <div
        aria-hidden
        className="absolute -right-16 -top-20 size-64 rounded-full bg-white/15 blur-3xl"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-2xl gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            {active ? <ShieldCheck className="size-6" /> : <Smartphone className="size-6" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-extrabold">
                {active ? "Aparelho cadastrado" : "Preparar notificações neste aparelho"}
              </h2>
              {active && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-300/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-100 ring-1 ring-emerald-200/30">
                  <Check className="size-3" /> Ativo
                </span>
              )}
            </div>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-violet-100">
              {active
                ? "A assinatura deste navegador está pronta. O recebimento depende do serviço de envio configurado no servidor."
                : "Cadastre este navegador para push. A permissão só será solicitada quando você tocar no botão, e a entrega depende do serviço de envio no servidor."}
            </p>
            {push.error && (
              <p className="mt-2 text-xs font-semibold text-amber-200">{push.error}</p>
            )}
            {!push.supported && (
              <p className="mt-2 text-xs font-semibold text-amber-200">
                Abra o sistema por HTTPS em um navegador compatível para usar esta função.
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={onActivate}
          disabled={!push.supported || push.isActivating}
          className="h-11 shrink-0 rounded-xl bg-white px-5 font-extrabold text-violet-800 shadow-lg hover:bg-violet-50"
        >
          {push.isActivating ? <Loader2 className="animate-spin" /> : <BellRing />}
          {push.isActivating ? "Ativando..." : active ? "Atualizar cadastro" : "Cadastrar aparelho"}
        </Button>
      </div>
    </section>
  );
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: MarciaNotification;
  onRead: () => void;
}) {
  const unread = !notification.read_at;
  const Icon = notificationIcon(notification.type, notification.entity_type);

  return (
    <article
      className={`relative flex gap-3 px-4 py-4 transition-colors sm:gap-4 sm:px-6 ${
        unread ? "bg-violet-50/65" : "bg-card"
      }`}
    >
      {unread && <span aria-hidden className="absolute left-0 top-0 h-full w-1 bg-violet-500" />}
      <div
        className={`grid size-10 shrink-0 place-items-center rounded-2xl ${
          unread ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h3 className={`text-sm ${unread ? "font-extrabold text-foreground" : "font-bold"}`}>
            {notification.title}
          </h3>
          <time
            className="shrink-0 text-[11px] font-semibold text-muted-foreground"
            dateTime={notification.created_at}
          >
            {relativeDate(notification.created_at)}
          </time>
        </div>
        {notification.body && (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {notification.body}
          </p>
        )}
        {unread && (
          <button
            type="button"
            onClick={onRead}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-violet-700 hover:text-violet-900"
          >
            <Check className="size-3.5" /> Marcar como lida
          </button>
        )}
      </div>
    </article>
  );
}

function NotificationSkeleton() {
  return (
    <div className="divide-y divide-border" aria-label="Carregando notificações">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex animate-pulse gap-4 px-4 py-5 sm:px-6">
          <div className="size-10 rounded-2xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/5 rounded bg-muted" />
            <div className="h-3 w-4/5 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function notificationIcon(type: string, entityType: string | null) {
  const key = `${type} ${entityType || ""}`.toLowerCase();
  if (key.includes("appointment") || key.includes("agenda")) return CalendarClock;
  if (key.includes("work_order") || key.includes("ordem") || key.includes("os"))
    return ClipboardList;
  if (key.includes("message") || key.includes("whatsapp") || key.includes("conversation"))
    return MessageCircle;
  return Bell;
}

function relativeDate(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const elapsed = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(timestamp),
  );
}
