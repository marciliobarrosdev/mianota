/** Um aviso da Central: ícone por categoria, selo de urgência e ações rápidas (pagar, adiar, perguntar à MIA). */
import { Link } from "@tanstack/react-router";
import {
  Archive,
  Bell,
  CalendarClock,
  Check,
  CircleDollarSign,
  Clock,
  MoreHorizontal,
  PiggyBank,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  notificationCategory,
  type NotificationCategory,
  type Urgency,
} from "@/lib/finance/notification-rules";
import { relativeNoticeDate, type Notice } from "@/lib/finance/notification-center-rules";

const URGENCY_STYLE: Record<Urgency, { icon: string; label?: string; chip?: string }> = {
  overdue: {
    icon: "bg-destructive text-destructive-foreground",
    label: "Atrasada",
    chip: "bg-destructive/10 text-destructive",
  },
  today: {
    icon: "bg-warning text-warning-foreground",
    label: "Vence hoje",
    chip: "bg-warning/15 text-warning",
  },
  soon: {
    icon: "bg-primary text-primary-foreground",
    label: "Em breve",
    chip: "bg-primary/10 text-primary",
  },
  info: { icon: "bg-primary text-primary-foreground" },
};

export function NoticeRow({
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
  const Icon = noticeIcon(notificationCategory(n));
  const style =
    URGENCY_STYLE[n.type === "finance.due" ? urgency : n.priority === "high" ? "overdue" : "info"];
  const isBill = n.type === "finance.due" && n.entity_type === "fin_lancamento" && !!n.entity_id;

  return (
    <article
      className={`group relative flex gap-3 px-4 py-4 sm:gap-4 sm:px-6 ${unread ? "bg-primary/5" : ""}`}
    >
      {unread && <span aria-hidden className="absolute left-0 top-0 h-full w-1 bg-primary" />}
      <div
        className={`grid size-10 shrink-0 place-items-center rounded-2xl ${unread ? style.icon : "bg-muted text-muted-foreground"}`}
      >
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h4
              className={`text-sm ${unread ? "font-extrabold" : "font-bold text-muted-foreground"}`}
            >
              {n.title}
              {style.label && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 align-middle text-[10px] font-black uppercase ${style.chip}`}
                >
                  {style.label}
                </span>
              )}
            </h4>
            <time
              className="shrink-0 text-[11px] font-semibold text-muted-foreground"
              dateTime={n.created_at}
            >
              {relativeNoticeDate(n.created_at)}
            </time>
          </div>
          {n.body && (
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{n.body}</p>
          )}
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
              to="/app/mia"
              search={{ pergunta: `Sobre o aviso "${n.title}": o que devo fazer?` }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-extrabold text-primary hover:bg-primary/5"
            >
              <Sparkles className="size-3.5" /> Perguntar à MIA
            </Link>
          )}
          {unread && !isBill && (
            <button
              type="button"
              onClick={onRead}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary"
            >
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

function noticeIcon(c: NotificationCategory) {
  if (c === "finance") return CircleDollarSign;
  if (c === "budget") return PiggyBank;
  if (c === "agenda") return CalendarClock;
  return Bell;
}

export function NoticesSkeleton() {
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
