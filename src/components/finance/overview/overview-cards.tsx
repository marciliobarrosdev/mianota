/* eslint-disable @typescript-eslint/no-explicit-any */
/** Peças pequenas do painel: indicador, atalho, ação rápida e primeiro passo. */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FinanceLinks } from "../finance-links";

export const TONES: Record<string, string> = {
  brand: "bg-[color:var(--brand-soft)] text-[color:var(--brand-text)]",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

export function Metric({
  icon: Icon,
  label,
  value,
  helper,
  tone,
  delta,
  inverse,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  helper: string;
  tone: keyof typeof TONES;
  delta?: number | null;
  inverse?: boolean;
  highlight?: boolean;
}) {
  const good = delta == null ? null : inverse ? delta <= 0 : delta >= 0;
  return (
    <div
      className={`rounded-2xl border bg-card p-3.5 shadow-[var(--shadow-card)] ${highlight ? "border-[color:var(--brand-soft-strong)] ring-1 ring-[color:var(--brand-soft-strong)]" : "border-border"}`}
    >
      <div className="flex items-center gap-2">
        <span className={`grid size-7 place-items-center rounded-lg ${TONES[tone]}`}>
          <Icon className="size-3.5" />
        </span>
        <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 truncate font-display text-lg font-black tracking-[-.03em] sm:text-xl">
        {value}
      </div>
      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{helper}</div>
      {delta != null && (
        <div
          className={`mt-1 text-[10px] font-extrabold ${good ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}
        >
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "="} {Math.abs(delta)}% vs. período anterior
        </div>
      )}
    </div>
  );
}

export function QuickLink({ to, icon: Icon, label, search }: { to: string; icon: any; label: string; search?: Record<string, string> }) {
  return (
    <Link
      to={to as any}
      search={search as any}
      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold shadow-[var(--shadow-card)] hover:bg-muted"
    >
      <Icon className="size-3.5 text-[color:var(--brand-text)]" /> {label}
    </Link>
  );
}

export function ActionChip({ icon: Icon, label, run }: { icon: any; label: string; run: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await run();
        } finally {
          setBusy(false);
        }
      }}
      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold shadow-[var(--shadow-card)] hover:bg-muted disabled:opacity-60"
    >
      <Icon className="size-3.5 text-[color:var(--brand-text)]" /> {busy ? "Aguarde…" : label}
    </button>
  );
}

export function FirstMove({ links, assistantName }: { links: FinanceLinks; assistantName: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-lg font-black">Comece contando o que aconteceu.</h2>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        {assistantName} entende uma frase simples, pergunta só o que faltar e registra depois da sua
        confirmação.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          "Gastei 87 na farmácia no Pix",
          "Recebi 1.200 do projeto",
          "Academia de 99 todo dia 10",
        ].map((text) => (
          <span
            key={text}
            className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold"
          >
            “{text}”
          </span>
        ))}
      </div>
      <Button asChild size="sm" className="mt-4 rounded-xl bg-[color:var(--brand)]">
        <Link to={links.chat}>
          <Mic /> Falar com {assistantName}
        </Link>
      </Button>
    </section>
  );
}

