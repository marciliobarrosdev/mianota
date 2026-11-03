import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarClock,
  CreditCard,
  Eraser,
  ListChecks,
  PanelRightOpen,
  PiggyBank,
  Bell,
  Sparkles,
} from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { MarciaChat } from "@/components/finance/marcia-chat";
import { MarciaChatShell } from "@/components/finance/marcia-chat-shell";
import { useMarciaFinanceChat } from "@/hooks/use-marcia-finance-chat";
import { useFinanceDashboard } from "@/hooks/use-finance-dashboard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCentsBRL } from "@/lib/common/money";
import { contextualSuggestions } from "@/lib/ai/marcia-chat-rules";
import type { FinanceDashboardSnapshot } from "@/lib/finance/finance-dashboard.functions";

export const Route = createFileRoute("/app/marcia")({
  head: brandedRouteHead("Falar com a MIA"),
  validateSearch: (s: Record<string, unknown>): { pergunta?: string } => ({
    pergunta: typeof s.pergunta === "string" ? s.pergunta.slice(0, 300) : undefined,
  }),
  component: MarciaChatPage,
});

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function MarciaChatPage() {
  const branding = useBrand();
  const ctx = Route.useRouteContext();
  const { pergunta } = Route.useSearch();
  const companyId = ctx.company?.id;
  const controller = useMarciaFinanceChat(companyId);
  const { data } = useFinanceDashboard(companyId);
  const [sheetOpen, setSheetOpen] = useState(false);

  const suggestions = useMemo(
    () =>
      contextualSuggestions({
        today: todayIso(),
        upcoming: data?.upcoming ?? [],
        budgets: data?.budgets ?? [],
      }),
    [data],
  );

  const summary = <MonthSummary data={data} />;

  return (
    <>
      <MarciaChatShell
        assistantName={branding.assistantName}
        aside={summary}
        actions={
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 lg:hidden"
              aria-label="Resumo do mês"
              onClick={() => setSheetOpen(true)}
            >
              <PanelRightOpen className="size-4" />
            </Button>
            {controller.messages.length > 0 && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label="Limpar conversa da tela"
                title="Limpar conversa da tela"
                onClick={() => controller.clear?.()}
              >
                <Eraser className="size-4" />
              </Button>
            )}
          </>
        }
      >
        <MarciaChat
          controller={controller}
          assistantName={branding.assistantName}
          suggestions={suggestions}
          initialText={pergunta}
          emptyState={
            <div className="mx-auto grid max-w-sm place-items-center py-10 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-[color:var(--brand-soft)] text-[color:var(--brand-text)]">
                <Sparkles className="size-5" />
              </div>
              <h2 className="mt-3 font-display text-lg font-black">Oi! Me conte o que aconteceu.</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Escreva, fale ou anexe um comprovante. Pergunto o que faltar e só registro depois da
                sua confirmação.
              </p>
            </div>
          }
        />
      </MarciaChatShell>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[320px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Resumo do mês</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{summary}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}

const SHORTCUTS = [
  { to: "/app/movimentacoes", label: "Extrato", icon: ListChecks },
  { to: "/app/planejamento", label: "Planejamento", icon: CalendarClock },
  { to: "/app/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/app/notificacoes", label: "Avisos", icon: Bell },
] as const;

function MonthSummary({ data }: { data: FinanceDashboardSnapshot | null }) {
  const hot = data ? [...data.budgets].sort((a, b) => b.percentage - a.percentage)[0] : null;
  const next = data?.upcoming.slice(0, 3) ?? [];
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-muted-foreground">
          Este mês
        </div>
        {!data ? (
          <div className="mt-3 h-16 animate-pulse rounded-xl bg-muted" />
        ) : (
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <Stat label="Saldo" value={formatCentsBRL(data.totals.balanceCents)} strong />
            <Stat label="Sobra prevista" value={formatCentsBRL(data.totals.leftoverCents)} />
            <Stat label="Recebido" value={formatCentsBRL(data.totals.receivedCents)} />
            <Stat label="Gasto" value={formatCentsBRL(data.totals.spentCents)} />
          </dl>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-muted-foreground">
          Próximas contas
        </div>
        {next.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Nada vencendo por agora.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-xs">
            {next.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {item.description}
                  <span className="ml-1 text-muted-foreground">
                    {item.dueDate.slice(8, 10)}/{item.dueDate.slice(5, 7)}
                  </span>
                </span>
                <span className="font-bold">{formatCentsBRL(item.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hot && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] text-muted-foreground">
            <PiggyBank className="size-3.5" /> Orçamento mais usado
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="font-bold">{hot.name}</span>
            <span>{Math.round(hot.percentage)}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${hot.percentage >= 100 ? "bg-destructive" : "bg-[color:var(--brand)]"}`}
              style={{ width: `${Math.min(100, hot.percentage)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatCentsBRL(hot.spentCents)} de {formatCentsBRL(hot.limitCents)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {SHORTCUTS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold hover:border-[color:var(--brand-soft-strong)]"
          >
            <Icon className="size-3.5 text-[color:var(--brand-text)]" /> {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/60 p-2">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 ${strong ? "text-sm font-black" : "font-bold"}`}>{value}</dd>
    </div>
  );
}
