import { useState, type ReactNode } from "react";
import { CalendarClock, Check, FileDown, Pencil, Plus, Repeat, Send, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/money-input";
import type { FinancePlannerItem } from "@/lib/finance/finance-dashboard.functions";
import type { PlannerExtras } from "@/lib/finance/finance-planner.functions";
import { reportPeriod, shiftDate, type ReportPeriodKind } from "@/lib/finance/planner-rules";
import { money } from "./finance-overview";
import { PAYMENT_METHOD_OPTION_LABELS } from "@/lib/finance/payment-method-rules";

export type PlannerActionRequest = {
  action: "pay" | "move" | "edit" | "delete";
  scope: "one" | "all";
  newDate?: string;
  title?: string;
  amountCents?: number;
  categoryId?: string | null;
};
export type PlannerActions = {
  run: (item: FinancePlannerItem, req: PlannerActionRequest) => Promise<void>;
  categories?: PlannerExtras["categories"];
};

const field = "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm";

/** Botões de ação de uma conta dentro do dia: pagar, adiar, editar e excluir. */
export function PlannerItemActions({ item, actions }: { item: FinancePlannerItem; actions: PlannerActions }) {
  const [mode, setMode] = useState<null | "move" | "edit" | "delete">(null);
  const [scope, setScope] = useState<"one" | "all">("one");
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(item.date);
  const [title, setTitle] = useState(item.title);
  const [cents, setCents] = useState<number | null>(item.amountCents);
  const [cat, setCat] = useState(item.categoryId || "");
  const paid = item.status === "pago";
  const recurringOnly = !item.entryId && Boolean(item.recurrenceId);

  const go = async (req: Omit<PlannerActionRequest, "scope">) => {
    setBusy(true);
    try {
      await actions.run(item, { ...req, scope });
      setMode(null);
    } finally {
      setBusy(false);
    }
  };

  const scopePicker = recurringOnly && (
    <div className="flex gap-1 text-[11px] font-bold">
      {(["one", "all"] as const).map((s) => (
        <button key={s} type="button" onClick={() => setScope(s)} className={`rounded-full border px-2 py-0.5 ${scope === s ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand-text)]" : "border-border text-muted-foreground"}`}>
          {s === "one" ? "Só esta" : "Esta e as próximas"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-1">
        {!paid && (
          <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-[11px]" disabled={busy} onClick={() => go({ action: "pay" })}>
            <Check className="size-3" /> {item.type === "receita" ? "Recebida" : "Paga"}
          </Button>
        )}
        {!paid && (
          <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-[11px]" disabled={busy} onClick={() => setMode(mode === "move" ? null : "move")}>
            <CalendarClock className="size-3" /> Adiar
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-[11px]" disabled={busy} onClick={() => setMode(mode === "edit" ? null : "edit")}>
          <Pencil className="size-3" /> Editar
        </Button>
        <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-[11px] text-destructive" disabled={busy} onClick={() => setMode(mode === "delete" ? null : "delete")}>
          <Trash2 className="size-3" /> Excluir
        </Button>
      </div>
      {mode === "move" && (
        <div className="space-y-2 rounded-lg bg-muted/50 p-2">
          {scopePicker}
          <div className="flex flex-wrap gap-1">
            {[1, 7].map((n) => (
              <Button key={n} size="sm" variant="secondary" className="h-7 text-[11px]" disabled={busy} onClick={() => go({ action: "move", newDate: shiftDate(item.date, n) })}>
                +{n} {n === 1 ? "dia" : "dias"}
              </Button>
            ))}
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-7 rounded-md border border-input bg-background px-1 text-[11px]" aria-label="Nova data" />
            <Button size="sm" className="h-7 text-[11px]" disabled={busy || !date || date === item.date} onClick={() => go({ action: "move", newDate: date })}>Mover</Button>
          </div>
        </div>
      )}
      {mode === "edit" && (
        <div className="space-y-2 rounded-lg bg-muted/50 p-2">
          {scopePicker}
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Descrição" />
          <div className="grid grid-cols-2 gap-2">
            <MoneyInput cents={cents} onChange={setCents} required className={field} aria-label="Valor" />
            <input type="date" className={field} value={date} disabled={paid} onChange={(e) => setDate(e.target.value)} aria-label="Data" />
          </div>
          {actions.categories && (
            <select className={field} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
              <option value="">Sem categoria</option>
              {actions.categories.filter((c) => c.type === item.type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <Button size="sm" className="h-8 w-full" disabled={busy || !title.trim() || !cents} onClick={() => go({ action: "edit", title: title.trim(), amountCents: cents || undefined, categoryId: cat || null, newDate: date })}>
            Salvar alterações
          </Button>
        </div>
      )}
      {mode === "delete" && (
        <div className="space-y-2 rounded-lg bg-rose-50 p-2 dark:bg-rose-950/30">
          {scopePicker}
          <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">Excluir “{item.title}”? Você pode desfazer logo em seguida.</p>
          <Button size="sm" variant="destructive" className="h-7 text-[11px]" disabled={busy} onClick={() => go({ action: "delete" })}>Confirmar exclusão</Button>
        </div>
      )}
    </div>
  );
}

/** Painel de orçamentos do mês e metas com prazo. */
export function BudgetsGoalsPanel({ extras, monthKey }: { extras: PlannerExtras; monthKey: string }) {
  const goals = extras.goals.filter((g) => g.deadline);
  if (!extras.budgets.length && !goals.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <h3 className="text-[10px] font-extrabold uppercase tracking-[.14em] text-muted-foreground">Orçamentos e metas</h3>
      <div className="mt-2 space-y-2">
        {extras.budgets.map((b) => (
          <div key={b.id}>
            <div className="flex justify-between text-xs font-bold">
              <span className="truncate">{b.name}</span>
              <span className={b.percentage >= 100 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground"}>{b.percentage}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${b.percentage >= 100 ? "bg-rose-500" : b.percentage >= 80 ? "bg-amber-500" : "bg-[color:var(--brand)]"}`} style={{ width: `${Math.min(100, b.percentage)}%` }} />
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{money(b.spentCents)} de {money(b.limitCents)}</p>
          </div>
        ))}
        {goals.map((g) => {
          const pct = g.targetCents ? Math.min(100, Math.round((g.savedCents / g.targetCents) * 100)) : 0;
          const inMonth = g.deadline!.startsWith(monthKey);
          return (
            <div key={g.id} className="flex items-center gap-2 text-xs">
              <Target className="size-3.5 shrink-0 text-[color:var(--brand-text)]" />
              <span className="min-w-0 flex-1 truncate font-bold">{g.name}</span>
              <span className={`text-[10px] ${inMonth ? "font-black text-[color:var(--brand-text)]" : "text-muted-foreground"}`}>
                {pct}% · até {g.deadline!.slice(8, 10)}/{g.deadline!.slice(5, 7)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Lista de contas recorrentes com pausar/retomar/encerrar. */
export function RecurrencesPanel({ extras, onToggle }: { extras: PlannerExtras; onToggle?: (id: string, active: boolean) => Promise<void> }) {
  if (!extras.recurrences.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <h3 className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[.14em] text-muted-foreground"><Repeat className="size-3" /> Recorrentes</h3>
      <div className="mt-2 space-y-1">
        {extras.recurrences.slice(0, 10).map((r) => (
          <div key={r.id} className={`flex items-center gap-2 text-xs ${r.active ? "" : "opacity-50"}`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{r.title}</span>
              <span className="text-[10px] text-muted-foreground">{r.frequency} · próx. {r.nextDate.slice(8, 10)}/{r.nextDate.slice(5, 7)}{r.endsOn ? ` · até ${r.endsOn.slice(8, 10)}/${r.endsOn.slice(5, 7)}` : ""}</span>
            </span>
            <span className="font-black tabular-nums">{money(r.amountCents)}</span>
            {onToggle && (
              <button type="button" className="text-[10px] font-bold text-[color:var(--brand-text)] underline" onClick={() => onToggle(r.id, !r.active)}>
                {r.active ? "Pausar" : "Retomar"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Formulário de nova conta (avulsa ou recorrente). */
export function NewBillDialog({ open, onClose, categories, defaultDate, onCreate }: {
  open: boolean; onClose: () => void; categories: PlannerExtras["categories"]; defaultDate: string;
  onCreate: (v: { title: string; amountCents: number; type: "receita" | "despesa"; categoryId: string | null; repeat: boolean; frequency: "semanal" | "quinzenal" | "mensal" | "anual"; startDate: string; endDate: string | null; paymentMethod: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [cents, setCents] = useState<number | null>(null);
  const [type, setType] = useState<"receita" | "despesa">("despesa");
  const [cat, setCat] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [pay, setPay] = useState("");
  const [frequency, setFrequency] = useState<"semanal" | "quinzenal" | "mensal" | "anual">("mensal");
  const [start, setStart] = useState(defaultDate);
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!title.trim() || !cents || !pay) return;
    setBusy(true);
    try {
      await onCreate({ title: title.trim(), amountCents: cents, type, categoryId: cat || null, repeat, frequency, startDate: start, endDate: repeat && end ? end : null, paymentMethod: pay });
      setTitle(""); setPay(""); setCents(null); setRepeat(false); setEnd("");
      onClose();
    } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display font-black">Nova conta</DialogTitle>
          <DialogDescription>Avulsa ou que se repete (aluguel, salário, assinaturas…).</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="flex gap-1">
            {(["despesa", "receita"] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setType(t); setCat(""); }} className={`flex-1 rounded-lg border py-1.5 text-xs font-bold ${type === t ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand-text)]" : "border-border text-muted-foreground"}`}>
                {t === "despesa" ? "A pagar" : "A receber"}
              </button>
            ))}
          </div>
          <input className={field} placeholder="Descrição (ex.: Aluguel)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <MoneyInput cents={cents} onChange={setCents} required className={field} aria-label="Valor" />
            <input type="date" className={field} value={start} onChange={(e) => setStart(e.target.value)} aria-label="Vencimento" />
          </div>
          <select className={field} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
            <option value="">Sem categoria</option>
            {categories.filter((c) => c.type === type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={field} value={pay} onChange={(e) => setPay(e.target.value)} aria-label="Forma de pagamento" required>
            <option value="" disabled>Forma de pagamento *</option>
            {Object.entries(PAYMENT_METHOD_OPTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {!pay && title.trim() && cents ? <p className="text-xs text-destructive">Informe a forma de pagamento</p> : null}
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} /> Repetir
          </label>
          {repeat && (
            <div className="grid grid-cols-2 gap-2">
              <select className={field} value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)} aria-label="Frequência">
                <option value="semanal">Toda semana</option>
                <option value="quinzenal">A cada 15 dias</option>
                <option value="mensal">Todo mês</option>
                <option value="anual">Todo ano</option>
              </select>
              <input type="date" className={field} value={end} min={start} onChange={(e) => setEnd(e.target.value)} aria-label="Termina em (opcional)" title="Termina em (opcional)" />
            </div>
          )}
          <Button className="w-full" disabled={busy || !title.trim() || !cents || !start} onClick={submit}><Plus /> Salvar conta</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const KINDS: { key: ReportPeriodKind; label: string }[] = [
  { key: "dia", label: "Dia" }, { key: "semana", label: "Semana" }, { key: "quinzena", label: "Quinzena" }, { key: "mes", label: "Mês" }, { key: "periodo", label: "Período" },
];

/** Escolha do período do PDF: dia, semana, quinzena, mês ou personalizado. */
export function ReportDialog({ open, onClose, refDate, onDownload, onSend }: {
  open: boolean; onClose: () => void; refDate: string;
  onDownload: (p: { from: string; to: string; label: string }) => Promise<void>;
  onSend?: (p: { from: string; to: string; label: string }) => Promise<void>;
}) {
  const [kind, setKind] = useState<ReportPeriodKind>("mes");
  const [ref, setRef] = useState(refDate);
  const [to, setTo] = useState(refDate);
  const [busy, setBusy] = useState(false);
  const p = reportPeriod(kind, ref, to);
  const run = async (fn: (p: { from: string; to: string; label: string }) => Promise<void>) => {
    setBusy(true);
    try { await fn(p); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display font-black">Relatório em PDF</DialogTitle>
          <DialogDescription>Entradas, saídas, categorias e lançamentos do período.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <button key={k.key} type="button" onClick={() => setKind(k.key)} className={`rounded-full border px-3 py-1 text-xs font-bold ${kind === k.key ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand-text)]" : "border-border text-muted-foreground"}`}>{k.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] font-bold text-muted-foreground">{kind === "periodo" ? "De" : "Data de referência"}
            <input type="date" className={field} value={ref} onChange={(e) => setRef(e.target.value)} />
          </label>
          {kind === "periodo" && (
            <label className="text-[11px] font-bold text-muted-foreground">Até
              <input type="date" className={field} value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          )}
        </div>
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm font-bold">{p.label}</p>
        <div className="flex gap-2">
          <Button className="flex-1" disabled={busy} onClick={() => run(onDownload)}><FileDown /> Baixar PDF</Button>
          {onSend && <Button variant="outline" className="flex-1" disabled={busy} onClick={() => run(onSend)}><Send /> WhatsApp</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ToolbarButton({ icon, children, onClick }: { icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={onClick}>{icon}{children}</Button>
  );
}
