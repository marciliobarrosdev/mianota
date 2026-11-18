/** Peças pequenas da Visão geral: indicador, item de atenção, selo de status e ação rápida. */
import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export function MetricCard({
  icon,
  label,
  value,
  helper,
  accent = false,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  helper: string;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <Card
      className={`${compact ? "p-4" : "p-5"} ${
        accent
          ? "border-violet-400/30 bg-[linear-gradient(145deg,rgba(124,58,237,.17),rgba(217,70,239,.03))]"
          : ""
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-violet-500">{icon}</span>
        {label}
      </div>
      <div className={`${compact ? "mt-2 text-2xl" : "mt-3 text-3xl"} font-display font-black`}>
        {value}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{helper}</div>
    </Card>
  );
}

export function AttentionItem({
  icon,
  value,
  title,
  description,
  tone,
}: {
  icon: ReactNode;
  value: number;
  title: string;
  description: string;
  tone: "amber" | "red" | "violet";
}) {
  const tones = {
    amber: "bg-amber-500/10 text-amber-600",
    red: "bg-red-500/10 text-red-600",
    violet: "bg-violet-500/10 text-violet-600",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
      <div className="font-display text-2xl font-black">{value}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ativo: "bg-emerald-500/10 text-emerald-600",
    trial: "bg-violet-500/10 text-violet-600",
    suspenso: "bg-red-500/10 text-red-600",
    pendente: "bg-amber-500/10 text-amber-600",
    checkout_pending: "bg-amber-500/10 text-amber-600",
  };
  const labels: Record<string, string> = {
    ativo: "Ativa",
    trial: "Trial",
    suspenso: "Suspensa",
    pendente: "Pendente",
    checkout_pending: "Checkout",
  };
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold ${styles[status] || "bg-muted"}`}
    >
      {labels[status] || status}
    </span>
  );
}

type QuickActionRoute =
  | "/master/novo-assinante"
  | "/master/planos"
  | "/master/whatsapp-qr"
  | "/master/configuracoes"
  | "/master/whatsapp-qr"
  | "/master/conversas";

export function QuickAction({
  to,
  icon,
  children,
}: {
  to: QuickActionRoute;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-white/82 transition hover:border-violet-400/40 hover:bg-white/10"
    >
      <span className="text-violet-300">{icon}</span>
      <span className="flex-1">{children}</span>
      <ArrowRight className="size-4 text-white/35" />
    </Link>
  );
}
