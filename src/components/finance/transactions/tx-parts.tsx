/* eslint-disable @typescript-eslint/no-explicit-any */
/** Peças do extrato: resumo, filtros, linha e detalhes. */
import type { TxSingleAction } from "../transactions-view";
import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Check, Copy, Paperclip, Pencil, Split, Tag, Sparkles, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FinanceTransactionDetail } from "@/lib/finance/finance-dashboard.functions";
import { PAYMENT_METHOD_LABELS, sourceLabel, statusLabel } from "@/lib/finance/finance-period";
import { txStatus } from "@/lib/finance/transactions-rules";
import { money } from "../finance-overview";
import { formatTxDate } from "@/lib/finance/transactions-rules";
import { STATUS_STYLES } from "./tx-constants";

export function SummaryCard({ icon, label, value, tone, onClick, active }: { icon: ReactNode; label: string; value: string; tone?: string; onClick?: () => void; active?: boolean }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-2xl border bg-card p-3 text-left shadow-[var(--shadow-card)] transition sm:p-4 ${active ? "border-[color:var(--brand-text)]" : "border-border"} ${onClick ? "hover:bg-muted/40" : ""}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-1 truncate text-lg font-extrabold tabular-nums sm:text-xl ${tone || ""}`}>{value}</div>
    </Tag>
  );
}

export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${active ? "border-[color:var(--brand-text)] bg-muted text-[color:var(--brand-text)]" : "border-border text-muted-foreground hover:bg-muted/50"}`}
    >
      {children}
    </button>
  );
}

export function TypeIcon({ type }: { type: "receita" | "despesa" }) {
  return (
    <span
      className={`grid size-9 shrink-0 place-items-center rounded-lg ${type === "receita" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"}`}
      aria-label={type === "receita" ? "Entrada" : "Saída"}
    >
      {type === "receita" ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
    </span>
  );
}

export function Amount({ item }: { item: FinanceTransactionDetail }) {
  return (
    <strong className={`whitespace-nowrap text-sm tabular-nums ${item.type === "receita" ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
      {item.type === "receita" ? "+" : "−"} {money(item.amountCents)}
    </strong>
  );
}

export function StatusPill({ label }: { label: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${STATUS_STYLES[label] || STATUS_STYLES.Previsto}`}>{label}</span>;
}

export function Details({
  item,
  today,
  budget,
  actions,
  busy,
}: {
  item: FinanceTransactionDetail;
  today: string;
  budget?: { limitCents: number; spentCents: number; percentage: number };
  actions?: { act: (a: TxSingleAction) => void; edit: () => void; split?: () => void };
  busy: boolean;
}) {
  const paid = item.status === "pago";
  const rows: Array<[string, string]> = [
    ["Data", formatTxDate(item.date)],
    ["Hora", item.time || "Não informada"],
    ["Tipo", item.type === "receita" ? "Entrada" : "Saída"],
    ["Estabelecimento", item.merchant || "Não informado"],
    ["Categoria", item.splits?.length ? item.splits.map((p) => `${p.category || "Sem categoria"} ${money(p.amountCents)}`).join(" + ") : item.category || "Sem categoria"],
    ["Tags", item.tags?.length ? item.tags.map((t) => `#${t}`).join(" ") : "Nenhuma"],
    ["Valor", money(item.amountCents)],
    ["Forma de pagamento", item.paymentMethod ? PAYMENT_METHOD_LABELS[item.paymentMethod] || item.paymentMethod : "Não informada"],
    ["Conta / carteira / cartão", item.card || item.account || "Não informado"],
    ["Origem", sourceLabel(item.source, item.hasAttachment)],
    ["Status", statusLabel(item.type, item.status, item.dueDate || item.date, today)],
  ];
  if (item.dueDate) rows.push(["Vencimento", formatTxDate(item.dueDate)]);
  if (item.paidAt) rows.push([item.type === "receita" ? "Recebido em" : "Pago em", formatTxDate(item.paidAt)]);
  if (item.installment) rows.push(["Parcela", item.installment]);
  const question = `Me explique este ${item.type === "receita" ? "recebimento" : "gasto"}: ${item.description} de ${money(item.amountCents)} em ${formatTxDate(item.date)} (${item.category || "sem categoria"}).`;
  const fixCategory = `Qual a melhor categoria para "${item.merchant || item.description}"? Hoje está como ${item.category || "sem categoria"}.`;
  const overdue = txStatus(item, today) === "vencido";

  return (
    <div className="space-y-2 px-3 pb-3 md:px-4">
      {actions && (
        <div className="flex flex-wrap gap-1.5">
          {!paid ? (
            <Button size="sm" className="h-8 rounded-lg" disabled={busy} onClick={() => actions.act("pay")}>
              <Check /> {item.type === "receita" ? "Marcar como recebida" : "Marcar como paga"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={busy} onClick={() => actions.act("unpay")}>
              <Undo2 /> Voltar para pendente
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={busy} onClick={actions.edit}><Pencil /> Editar</Button>
          {actions.split && <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={busy} onClick={actions.split}><Split /> {item.splits?.length ? "Ajustar divisão" : "Dividir em categorias"}</Button>}
          <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled={busy} onClick={() => actions.act("duplicate")}><Copy /> Duplicar</Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg text-rose-700 dark:text-rose-400" disabled={busy} onClick={() => actions.act("delete")}><Trash2 /> Excluir</Button>
        </div>
      )}
      {overdue && <p className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">Esta conta está vencida. Marque como paga para atualizar os avisos.</p>}
      {budget && item.type === "despesa" && (
        <div className="rounded-xl border border-border bg-card p-2.5 text-xs">
          <div className="flex justify-between font-bold">
            <span>Orçamento de {item.category}</span>
            <span className={budget.percentage >= 100 ? "text-rose-700 dark:text-rose-400" : budget.percentage >= 80 ? "text-amber-700 dark:text-amber-400" : ""}>{budget.percentage}% do limite</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${budget.percentage >= 100 ? "bg-rose-500" : budget.percentage >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, budget.percentage)}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">{money(budget.spentCents)} de {money(budget.limitCents)} no mês</div>
        </div>
      )}
      <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-border bg-card p-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 truncate font-semibold">{value}</dd>
          </div>
        ))}
        <div className="min-w-0 sm:col-span-2 lg:col-span-3">
          <dt className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Observação</dt>
          <dd className="mt-0.5 whitespace-pre-wrap font-semibold">{item.note || "Sem observação"}</dd>
        </div>
        {item.originalInput && (
          <div className="min-w-0 sm:col-span-2 lg:col-span-3">
            <dt className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Como foi registrado</dt>
            <dd className="mt-0.5 italic text-muted-foreground">“{item.originalInput}”</dd>
          </div>
        )}
        {item.hasAttachment && (
          <div className="min-w-0 sm:col-span-2 lg:col-span-3">
            <dt className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Comprovante</dt>
            <dd className="mt-1">
              {item.attachmentUrl ? (
                /\.(png|jpe?g|webp|gif)(\?|$)/i.test(item.attachmentUrl) ? (
                  <a href={item.attachmentUrl} target="_blank" rel="noreferrer"><img src={item.attachmentUrl} alt="Comprovante" className="max-h-48 rounded-lg border border-border" /></a>
                ) : (
                  <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-[color:var(--brand-text)] hover:underline"><Paperclip className="size-3" /> Abrir comprovante</a>
                )
              ) : (
                <span className="text-muted-foreground">Recebido pela MIA (o arquivo original não fica guardado).</span>
              )}
            </dd>
          </div>
        )}
      </dl>
      <div className="flex flex-wrap gap-1.5">
        <Button asChild size="sm" variant="ghost" className="h-8 rounded-lg">
          <Link to="/app/planejamento"><CalendarDays /> Ver no calendário</Link>
        </Button>
        <>
            <Button asChild size="sm" variant="ghost" className="h-8 rounded-lg">
              <Link to="/app/mia" search={{ pergunta: question }}><Sparkles /> Perguntar à MIA</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8 rounded-lg">
              <Link to="/app/mia" search={{ pergunta: fixCategory }}><Sparkles /> Corrigir categoria com a MIA</Link>
            </Button>
        </>
      </div>
    </div>
  );
}
