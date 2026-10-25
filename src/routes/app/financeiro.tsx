/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Mic,
  Search,
  WalletCards,
} from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlocks, PageHeader } from "@/components/marcia/page-kit";
import { supabase } from "@/lib/auth/realm-supabase";
import { friendlyError, money } from "@/lib/marcia";

export const Route = createFileRoute("/app/financeiro")({
  beforeLoad: () => {
    throw redirect({ to: "/app/movimentacoes" });
  },
  head: brandedRouteHead("Financeiro"),
  component: FinancePage,
});

type Entry = {
  id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor_cents: number;
  status: "pendente" | "pago" | "atrasado" | "cancelado";
  forma_pagamento: string | null;
  vencimento: string;
  pago_em: string | null;
  competencia: string;
  work_order_id?: string | null;
  created_at: string;
};

function FinancePage() {
  const ctx = Route.useRouteContext();
  const company = ctx.company!;
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "receita" | "despesa" | "pendente">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: nextError } = await (supabase as any)
      .from("fin_lancamento")
      .select(
        "id,tipo,descricao,valor_cents,status,forma_pagamento,vencimento,pago_em,competencia,work_order_id,created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(250);
    if (nextError) setError(friendlyError(nextError));
    else setItems((data || []) as Entry[]);
    setLoading(false);
  }, [company.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () =>
      items.filter((item) => {
        const byFilter =
          filter === "all" ||
          item.tipo === filter ||
          (filter === "pendente" && ["pendente", "atrasado"].includes(item.status));
        return byFilter && item.descricao.toLowerCase().includes(query.toLowerCase());
      }),
    [filter, items, query],
  );
  const received = items
    .filter((item) => item.tipo === "receita" && item.status === "pago")
    .reduce((sum, item) => sum + Number(item.valor_cents || 0), 0);
  const expenses = items
    .filter((item) => item.tipo === "despesa" && item.status === "pago")
    .reduce((sum, item) => sum + Number(item.valor_cents || 0), 0);
  const pending = items
    .filter((item) => item.tipo === "receita" && ["pendente", "atrasado"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.valor_cents || 0), 0);

  if (!company.financeiro_ativo) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Financeiro operacional"
          title="Valores que nascem do trabalho"
          description="Conclua uma OS por voz e a MárcIA registra recebimentos e despesas automaticamente."
        />
        <div className="grid min-h-[480px] place-items-center rounded-[28px] border border-violet-200 bg-gradient-to-br from-white to-violet-50 p-6 text-center shadow-[var(--shadow-card)]">
          <div className="max-w-md">
            <div className="mx-auto grid size-16 place-items-center rounded-[22px] bg-violet-700 text-white shadow-xl shadow-violet-200">
              <WalletCards className="size-7" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-black">
              Financeiro ainda não está ativo
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Esse recurso pertence aos planos com financeiro. Quando ativo, as OS alimentam
              entradas, despesas e valores pendentes sem redigitação.
            </p>
            <Button asChild className="mt-5 rounded-xl bg-violet-700 hover:bg-violet-800">
              <Link to="/app/checkout">
                Ver planos <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro operacional"
        title="Dinheiro ligado à execução"
        description="Entradas, despesas e valores a receber registrados pela MárcIA ou pela sua equipe."
        action={
          <Button asChild className="rounded-xl bg-violet-700 hover:bg-violet-800">
            <Link to="/app/marcia">
              <Mic /> Registrar falando
            </Link>
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={ArrowDownRight} label="Recebido" value={money(received)} tone="emerald" />
        <Metric icon={ArrowUpRight} label="Despesas" value={money(expenses)} tone="rose" />
        <Metric icon={Clock3} label="A receber" value={money(pending)} tone="amber" />
      </div>
      <section className="rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar lançamento"
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus:ring-4 focus:ring-violet-100"
            />
          </div>
          <div className="flex overflow-x-auto rounded-xl bg-muted p-1">
            {(["all", "receita", "despesa", "pendente"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${filter === value ? "bg-card text-violet-700 shadow-sm" : "text-muted-foreground"}`}
              >
                {value === "all"
                  ? "Todos"
                  : value === "receita"
                    ? "Entradas"
                    : value === "despesa"
                      ? "Despesas"
                      : "A receber"}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <LoadingBlocks count={4} />
        ) : error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
            {error}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title="Nenhum lançamento ainda"
            description="Diga à MárcIA o que entrou ou saiu, ou conclua uma ordem de serviço."
            action={
              <Button asChild className="rounded-xl bg-violet-700 hover:bg-violet-800">
                <Link to="/app/marcia">
                  <Mic /> Falar com a MárcIA
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {visible.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
              >
                <div
                  className={`grid size-10 place-items-center rounded-xl ${item.tipo === "receita" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                >
                  {item.tipo === "receita" ? (
                    <ArrowDownRight className="size-4" />
                  ) : (
                    <ArrowUpRight className="size-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold">{item.descricao}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(item.competencia)} · {paymentLabel(item.forma_pagamento)} ·{" "}
                    {statusLabel(item.status)}
                  </p>
                </div>
                <div
                  className={`font-display text-base font-black ${item.tipo === "receita" ? "text-emerald-700" : "text-rose-700"}`}
                >
                  {item.tipo === "receita" ? "+" : "−"} {money(item.valor_cents)}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone: "emerald" | "rose" | "amber";
}) {
  const palette = {
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className={`grid size-10 place-items-center rounded-xl ${palette[tone]}`}>
        <Icon className="size-[19px]" />
      </div>
      <div className="min-w-0">
        <div className="truncate font-display text-xl font-black">{value}</div>
        <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function paymentLabel(value: string | null) {
  return (
    (
      {
        pix: "Pix",
        cartao: "Cartão",
        dinheiro: "Dinheiro",
        transferencia: "Transferência",
        boleto: "Boleto",
        outro: "Outro",
      } as Record<string, string>
    )[value || ""] || "Forma não informada"
  );
}

function statusLabel(value: Entry["status"]) {
  return (
    { pago: "Pago", pendente: "Pendente", atrasado: "Atrasado", cancelado: "Cancelado" } as const
  )[value];
}
