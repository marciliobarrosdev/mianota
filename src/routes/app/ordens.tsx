import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, ClipboardList, Clock3, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { brandedRouteHead } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlocks, PageHeader, StatusPill } from "@/components/marcia/page-kit";
import { NewWorkOrderDialog } from "@/components/marcia/new-work-order-dialog";
import { CompleteWorkOrderDialog } from "@/components/marcia/complete-work-order-dialog";
import {
  friendlyError,
  listWorkOrders,
  money,
  shortDate,
  updateWorkOrderStatus,
  workOrderLabels,
  type MarciaWorkOrder,
  type WorkOrderStatus,
} from "@/lib/marcia";

export const Route = createFileRoute("/app/ordens")({
  beforeLoad: () => {
    throw redirect({ to: "/app/movimentacoes" });
  },
  head: brandedRouteHead("Ordens de serviço"),
  component: WorkOrdersPage,
});

function WorkOrdersPage() {
  const ctx = Route.useRouteContext();
  const companyId = ctx.company?.id;
  const [items, setItems] = useState<MarciaWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"open" | "completed" | "all">("open");

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      setItems(await listWorkOrders(companyId));
    } catch (nextError) {
      setError(friendlyError(nextError));
    } finally {
      setLoading(false);
    }
  }, [companyId]);
  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const byFilter =
          filter === "all" ||
          (filter === "completed"
            ? item.status === "completed"
            : !["completed", "cancelled"].includes(item.status));
        const haystack =
          `${item.number} ${item.summary} ${item.marcia_customer?.name || ""}`.toLowerCase();
        return byFilter && haystack.includes(query.toLowerCase());
      }),
    [items, query, filter],
  );

  async function advance(item: MarciaWorkOrder) {
    const next: WorkOrderStatus = "in_progress";
    try {
      await updateWorkOrderStatus(item.id, next);
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? { ...currentItem, status: next } : currentItem,
        ),
      );
      toast.success("Execução iniciada.");
    } catch (nextError) {
      toast.error(friendlyError(nextError));
    }
  }

  const openCount = items.filter(
    (item) => !["completed", "cancelled"].includes(item.status),
  ).length;
  const completedCount = items.filter((item) => item.status === "completed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Execução do serviço"
        title="Ordens de serviço"
        description="Da agenda para a execução, sem redigitar os dados do cliente."
        action={companyId ? <NewWorkOrderDialog companyId={companyId} onCreated={load} /> : null}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary icon={ClipboardList} label="Em aberto" value={openCount} color="violet" />
        <Summary
          icon={Wrench}
          label="Em execução"
          value={items.filter((item) => item.status === "in_progress").length}
          color="amber"
        />
        <Summary icon={CheckCircle2} label="Concluídas" value={completedCount} color="emerald" />
      </div>
      <section className="rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por cliente, serviço ou número"
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus:ring-4 focus:ring-violet-100"
            />
          </div>
          <div className="flex rounded-xl bg-muted p-1">
            {(["open", "completed", "all"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition sm:flex-none ${filter === value ? "bg-card text-violet-700 shadow-sm" : "text-muted-foreground"}`}
              >
                {value === "open" ? "Em aberto" : value === "completed" ? "Concluídas" : "Todas"}
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
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhuma OS por aqui"
            description="Emita uma ordem manualmente ou conclua um atendimento da agenda."
            action={
              companyId ? <NewWorkOrderDialog companyId={companyId} onCreated={load} /> : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <OrderRow
                key={item.id}
                item={item}
                companyId={companyId!}
                advance={() => advance(item)}
                onCompleted={load}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function OrderRow({
  item,
  companyId,
  advance,
  onCompleted,
}: {
  item: MarciaWorkOrder;
  companyId: string;
  advance: () => void;
  onCompleted: () => void;
}) {
  const canAdvance = ["draft", "open", "in_progress"].includes(item.status);
  return (
    <article className="grid gap-3 rounded-2xl border border-border bg-background/55 p-4 transition hover:border-violet-200 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
      <div className="grid size-11 place-items-center rounded-xl bg-violet-100 font-display text-xs font-black text-violet-700">
        #{String(item.number).padStart(3, "0")}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-extrabold">{item.summary}</h3>
          <StatusPill status={item.status} label={workOrderLabels[item.status]} />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{item.marcia_customer?.name || "Cliente"}</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3" />
            {shortDate(item.created_at)}
          </span>
          <span className="font-bold text-foreground">{money(item.total_cents)}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        {canAdvance && item.status !== "in_progress" && (
          <Button
            size="sm"
            onClick={advance}
            className="rounded-lg bg-violet-700 hover:bg-violet-800"
          >
            <Wrench /> Iniciar
          </Button>
        )}
        {item.status === "in_progress" && (
          <CompleteWorkOrderDialog companyId={companyId} order={item} onCompleted={onCompleted} />
        )}
        <Link
          to="/app/ordens/$orderId"
          params={{ orderId: item.id }}
          className="grid size-9 place-items-center rounded-lg border border-border bg-card hover:bg-muted"
          aria-label="Abrir OS"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  const palette: Record<string, string> = {
    violet: "bg-violet-100 text-violet-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className={`grid size-10 place-items-center rounded-xl ${palette[color]}`}>
        <Icon className="size-[19px]" />
      </div>
      <div>
        <div className="font-display text-xl font-black">{value}</div>
        <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
