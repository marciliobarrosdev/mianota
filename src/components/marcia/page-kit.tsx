import { useEffect, useState, type ReactNode } from "react";
import { Check, Clock3, Sparkles } from "lucide-react";
import fallbackAvatarUrl from "@/assets/marcia-avatar-640.png";
import { useBrand } from "@/contexts/brand-context";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[.16em] text-[color:var(--brand-text)]">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[clamp(1.65rem,3vw,2.35rem)] font-extrabold leading-tight tracking-[-.035em]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function MarciaAssistantCard({
  title = "Tudo sob controle",
  text,
  compact = false,
  working = false,
}: {
  title?: string;
  text: string;
  compact?: boolean;
  working?: boolean;
}) {
  const branding = useBrand();
  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border border-[color:var(--brand-soft-strong)] bg-[linear-gradient(135deg,#ffffff_0%,color-mix(in_srgb,var(--brand)_6%,white)_54%,color-mix(in_srgb,var(--brand)_12%,white)_100%)] text-[#24163d] shadow-[0_22px_55px_-34px_color-mix(in_srgb,var(--brand)_60%,transparent)] ${compact ? "min-h-[132px]" : "min-h-[176px]"}`}
    >
      <div
        aria-hidden
        className="absolute -right-8 -top-14 size-48 rounded-full bg-[color:var(--brand-soft-strong)] blur-3xl"
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-[34%] h-px w-1/2 bg-gradient-to-r from-transparent via-[color:var(--brand)]/50 to-transparent"
      />
      <div className={`relative z-10 max-w-[70%] ${compact ? "p-5" : "p-6 sm:p-7"}`}>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-soft-strong)] bg-white/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.12em] text-[color:var(--brand-text)]">
          <span className="relative size-2 rounded-full bg-emerald-500">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-50" />
          </span>
          {working ? `${branding.assistantName} pensando` : `${branding.assistantName} ativa`}
        </div>
        <h2 className="font-display text-xl font-extrabold tracking-[-.03em]">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[#655575]">{text}</p>
      </div>
      <img
        src={branding.avatarUrl || fallbackAvatarUrl}
        alt={`${branding.assistantName}, assistente virtual`}
        className={`pointer-events-none absolute -bottom-4 right-[-12px] w-[145px] object-contain object-bottom drop-shadow-[0_18px_18px_rgba(76,29,149,.18)] ${working ? "marcia-thinking" : ""} ${compact ? "max-h-[154px]" : "max-h-[205px] sm:w-[178px]"}`}
      />
    </div>
  );
}

export function MarciaAiWorking({
  active,
  messages = [
    "Lendo o que você escreveu…",
    "Organizando as informações importantes…",
    "Preparando esta explicação para o atendimento…",
  ],
}: {
  active: boolean;
  messages?: string[];
}) {
  const branding = useBrand();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!active || messages.length < 2) return;
    setMessageIndex(0);
    const timer = window.setInterval(
      () => setMessageIndex((current) => (current + 1) % messages.length),
      1300,
    );
    return () => window.clearInterval(timer);
  }, [active, messages.length]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="marcia-rise relative mt-3 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-3 shadow-[0_16px_40px_-28px_rgba(124,58,237,.75)]"
    >
      <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-violet-100">
        <span className="marcia-loading-line block h-full w-1/3 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-400 to-violet-600" />
      </div>
      <div className="flex items-center gap-3">
        <div className="relative grid size-14 shrink-0 place-items-end overflow-hidden rounded-2xl bg-[color:var(--brand-soft)] ring-1 ring-[color:var(--brand-soft-strong)]">
          <span className="absolute inset-2 animate-ping rounded-full bg-violet-300/35" />
          <img
            src={branding.avatarUrl || fallbackAvatarUrl}
            alt=""
            aria-hidden="true"
            className="marcia-thinking relative z-10 h-[60px] w-auto object-contain object-bottom"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-extrabold text-violet-950">
              {branding.assistantName} está organizando
            </p>
            <span className="inline-flex items-center gap-1" aria-hidden="true">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="marcia-thinking-dot size-1.5 rounded-full bg-violet-600"
                  style={{ animationDelay: `${dot * 160}ms` }}
                />
              ))}
            </span>
          </div>
          <p key={messageIndex} className="marcia-rise mt-0.5 text-xs text-violet-700">
            {messages[messageIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}

const statusStyles: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  completed: "bg-violet-50 text-violet-700 ring-violet-200",
  in_progress: "bg-blue-50 text-blue-700 ring-blue-200",
  checked_in: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  open: "bg-amber-50 text-amber-700 ring-amber-200",
  waiting_customer: "bg-orange-50 text-orange-700 ring-orange-200",
  pending_confirmation: "bg-amber-50 text-amber-700 ring-amber-200",
  hold: "bg-slate-50 text-slate-700 ring-slate-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  no_show: "bg-rose-50 text-rose-700 ring-rose-200",
  draft: "bg-slate-50 text-slate-700 ring-slate-200",
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  const isDone = status === "completed" || status === "confirmed";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${statusStyles[status] || statusStyles.hold}`}
    >
      {isDone ? <Check className="size-3" /> : <Clock3 className="size-3" />}
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-[290px] place-items-center rounded-[24px] border border-dashed border-violet-200 bg-white/60 px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-violet-100 text-violet-700">
          <Sparkles className="size-5" />
        </div>
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

export function LoadingBlocks({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-label="Carregando">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
      ))}
    </div>
  );
}
