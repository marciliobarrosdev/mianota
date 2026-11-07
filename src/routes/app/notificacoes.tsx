/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Central de Notificações do assinante.
 * Esta página só compõe as peças: dados em `useNotificationInbox`, regras puras em
 * `notification-center-rules.ts` e componentes em `src/components/notifications/*`.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bell,
  BellRing,
  CheckCheck,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/mia/page-kit";
import { Button } from "@/components/ui/button";
import { MonthlyReportCard } from "@/components/notifications/monthly-report-card";
import { NoticeRow, NoticesSkeleton } from "@/components/notifications/notice-row";
import { PreferencesDialog } from "@/components/notifications/preferences-dialog";
import { PushCard } from "@/components/notifications/push-card";
import { brandedRouteHead } from "@/config/brand";
import { useMiaNotifications } from "@/hooks/use-mia-notifications";
import { useNotificationInbox } from "@/hooks/use-notification-inbox";
import { supabase } from "@/lib/auth/realm-supabase";
import { sendTestPush } from "@/lib/finance/push.functions";
import {
  CATEGORY_LABEL,
  NOTIFICATION_CATEGORIES,
  notificationTarget,
  notificationUrgency,
} from "@/lib/finance/notification-rules";
import {
  countNotices,
  filterNotices,
  formatNoticeMoney,
  groupNoticesByDay,
  summarizeDueThisWeek,
  todayInSaoPaulo,
  type Notice,
  type NoticeFilter,
} from "@/lib/finance/notification-center-rules";

export const Route = createFileRoute("/app/notificacoes")({
  head: brandedRouteHead("Notificações"),
  component: NotificationsPage,
});

const FILTERS: { key: NoticeFilter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "unread", label: "Não lidas" },
  ...NOTIFICATION_CATEGORIES.map((k) => ({ key: k as NoticeFilter, label: CATEGORY_LABEL[k] })),
];

function NotificationsPage() {
  const context = Route.useRouteContext();
  const companyId = context.company?.id;
  const userId = context.user.id;
  const navigate = useNavigate();
  const today = todayInSaoPaulo();
  const inbox = useNotificationInbox(companyId, userId, today);
  const items = inbox.items;
  const [filter, setFilter] = useState<NoticeFilter>("all");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [devices, setDevices] = useState(0);
  const push = useMiaNotifications({ companyId, userId });
  const testPush = useServerFn(sendTestPush);

  // Quantos aparelhos ativos recebem push nesta conta (recontado ao ativar/desativar).
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

  const counts = useMemo(() => countNotices(items), [items]);
  const visible = useMemo(() => filterNotices(items, filter), [items, filter]);
  const grouped = useMemo(() => groupNoticesByDay(visible), [visible]);
  const weekSummary = useMemo(() => summarizeDueThisWeek(items, today), [items, today]);
  const unreadIds = items.filter((i) => !i.read_at).map((i) => i.id);
  const readIds = items.filter((i) => i.read_at).map((i) => i.id);

  async function openNotice(n: Notice) {
    if (!n.read_at) await inbox.markRead([n.id]);
    const target = notificationTarget(n);
    if (target !== "/app/notificacoes") void navigate({ to: target as any });
  }

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
                onClick={() => void inbox.markRead(unreadIds, "Todas marcadas como lidas.")}
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
              {weekSummary.count} {weekSummary.count === 1 ? "conta vence" : "contas vencem"} esta
              semana
              {weekSummary.total > 0 ? ` · ${formatNoticeMoney(weekSummary.total)}` : ""}
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
                {counts.unread
                  ? `${counts.unread} não ${counts.unread === 1 ? "lida" : "lidas"}`
                  : "Tudo lido"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {readIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void inbox.archive(readIds, "Avisos lidos arquivados.")}
              >
                <Archive /> Limpar lidas
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void inbox.load()}
              disabled={inbox.loading}
              aria-label="Atualizar notificações"
            >
              <RefreshCw className={inbox.loading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        <div
          className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 sm:px-6"
          role="tablist"
        >
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
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] ${active ? "bg-primary-foreground/20" : "bg-background"}`}
                >
                  {counts[f.key] || 0}
                </span>
              </button>
            );
          })}
        </div>

        <div aria-live="polite">
          {inbox.loading ? (
            <NoticesSkeleton />
          ) : inbox.loadError ? (
            <div className="m-4 rounded-2xl border border-warning/40 bg-warning/10 p-5 text-sm sm:m-6">
              <p className="font-bold">Ainda não consegui abrir seus avisos.</p>
              <p className="mt-1 text-muted-foreground">{inbox.loadError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void inbox.load()}
                className="mt-3"
              >
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
                    <NoticeRow
                      key={n.id}
                      n={n}
                      urgency={notificationUrgency(n, today)}
                      onOpen={() => void openNotice(n)}
                      onRead={() => void inbox.markRead([n.id])}
                      onArchive={() => void inbox.archive([n.id], "Aviso arquivado.")}
                      onDelete={() => void inbox.remove(n.id)}
                      onPaid={() => void inbox.markPaid(n)}
                      onPostpone={() => void inbox.postpone(n)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
          {inbox.hasMore && !inbox.loading && (
            <div className="border-t border-border p-4 text-center">
              <Button
                variant="outline"
                onClick={() => void inbox.loadMore()}
                disabled={inbox.loadingMore}
              >
                {inbox.loadingMore && <Loader2 className="animate-spin" />} Carregar mais
              </Button>
            </div>
          )}
        </div>
      </section>

      <PreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} userId={userId} />
    </div>
  );
}
