import type { ReactNode } from "react";
import { AlertTriangle, ArrowUpRight, Check, CircleDashed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ImplementationStatus = "complete" | "pending" | "unknown" | "loading";

export type ImplementationCheck = {
  label: string;
  detail: string;
  status: Exclude<ImplementationStatus, "loading">;
};

type ImplementationStepCardProps = {
  number: number;
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  status: ImplementationStatus;
  checks: ImplementationCheck[];
  actions: Array<{
    label: string;
    onClick: () => void;
  }>;
};

const statusMeta: Record<ImplementationStatus, { label: string; className: string; icon: ReactNode }> = {
  complete: {
    label: "Pronto",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
    icon: <Check className="size-3.5" strokeWidth={2.8} />,
  },
  pending: {
    label: "Ajustar",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
    icon: <CircleDashed className="size-3.5" />,
  },
  unknown: {
    label: "Verificar",
    className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
    icon: <AlertTriangle className="size-3.5" />,
  },
  loading: {
    label: "Lendo dados",
    className: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200",
    icon: <Loader2 className="size-3.5 animate-spin" />,
  },
};

function CheckMarker({ status }: { status: ImplementationCheck["status"] }) {
  if (status === "complete") {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }

  if (status === "unknown") {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
        <AlertTriangle className="size-3" />
      </span>
    );
  }

  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
      <span className="size-1.5 rounded-full bg-current" />
    </span>
  );
}

export function ImplementationStepCard({
  number,
  eyebrow,
  title,
  description,
  icon,
  status,
  checks,
  actions,
}: ImplementationStepCardProps) {
  const meta = statusMeta[status];

  return (
    <article className="group relative overflow-hidden rounded-[26px] border border-violet-950/10 bg-white p-4 shadow-[0_18px_55px_-42px_rgba(76,29,149,.55)] transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/25 hover:shadow-[0_24px_65px_-40px_rgba(109,40,217,.5)] sm:p-5 dark:border-white/10 dark:bg-white/[.045]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-violet-500/10 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative flex items-start gap-3.5">
        <div className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-[0_12px_30px_-12px_rgba(124,58,237,.8)]">
          {icon}
          <span className="absolute -left-1.5 -top-1.5 grid size-5 place-items-center rounded-full border-2 border-white bg-violet-950 text-[9px] font-black text-white dark:border-[#1c1529]">
            {number}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-600 dark:text-violet-300">
                {eyebrow}
              </p>
              <h2 className="mt-1 font-display text-[17px] font-extrabold tracking-tight text-slate-950 dark:text-white">
                {title}
              </h2>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${meta.className}`}>
              {meta.icon}
              {meta.label}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <div className="relative mt-4 grid gap-2 rounded-2xl border border-violet-950/[.07] bg-violet-50/60 p-3 dark:border-white/[.07] dark:bg-black/10">
        {status === "loading" ? (
          <div className="flex items-center gap-2 py-2 text-xs text-violet-700 dark:text-violet-300">
            <Loader2 className="size-4 animate-spin" /> Conferindo esta etapa…
          </div>
        ) : (
          checks.map((check) => (
            <div key={check.label} className="flex items-start gap-2.5 rounded-xl px-1.5 py-1.5">
              <CheckMarker status={check.status} />
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{check.label}</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400">{check.detail}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        {actions.map((action, index) => (
          <Button
            key={action.label}
            type="button"
            size="sm"
            variant={index === 0 ? "default" : "outline"}
            onClick={action.onClick}
            className={index === 0 ? "rounded-xl bg-violet-700 text-white hover:bg-violet-800" : "rounded-xl"}
          >
            {action.label}
            <ArrowUpRight className="ml-1.5 size-3.5" />
          </Button>
        ))}
      </div>
    </article>
  );
}
