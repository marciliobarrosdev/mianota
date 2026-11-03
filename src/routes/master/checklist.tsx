import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Check,
  Circle,
  CreditCard,
  Loader2,
  MessagesSquare,
  Palette,
  PartyPopper,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { getMasterSetupProgress, type MasterSetupCheck } from "@/lib/master/master-setup.functions";
import { groupSetupChecks, timeAgo, type SetupGroup } from "@/lib/master/master-setup-rules";

export const Route = createFileRoute("/master/checklist")({
  head: brandedRouteHead("Comece aqui", "Checklist automático para colocar o MIAnota para vender, atender e avisar."),
  component: MasterChecklistPage,
});

type Setup = Awaited<ReturnType<typeof getMasterSetupProgress>>;

const GROUP_ICON: Record<SetupGroup, typeof CreditCard> = {
  vender: CreditCard,
  atender: MessagesSquare,
  avisar: BellRing,
  operar: Settings2,
};

function MasterChecklistPage() {
  const brand = useBrand();
  const getProgress = useServerFn(getMasterSetupProgress);
  const [data, setData] = useState<Setup | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getProgress());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível conferir a instalação.");
    } finally {
      setLoading(false);
    }
  }, [getProgress]);

  useEffect(() => void load(), [load]);

  const next = useMemo(
    () => data?.checks.find((c) => c.status === "missing") ?? null,
    [data],
  );
  const groups = useMemo(() => (data ? groupSetupChecks(data.checks) : []), [data]);

  if (!data && loading) {
    return (
      <div className="grid min-h-[55vh] place-items-center text-center">
        <div>
          <Loader2 className="mx-auto size-7 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Conferindo seu {brand.name}…</p>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Comece aqui</h1>
              <Badge variant="secondary">{brand.name}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{brand.tagline}</p>
            <p className="mt-3 text-sm">
              Conferimos sua instalação automaticamente. Itens <strong>obrigatórios</strong> contam no
              progresso; os opcionais aparecem como <strong>atenção</strong>.
            </p>
            {next ? (
              <Button asChild size="sm" className="mt-4">
                <Link to={next.to as never}>
                  Próxima ação: {next.action} <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : null}
          </div>
          <div className="w-full rounded-xl border bg-muted/40 p-4 lg:w-72">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">prontidão</p>
                <p className="mt-1 font-display text-3xl font-black">{data.percent}%</p>
              </div>
              <p className="pb-1 text-sm text-muted-foreground">
                {data.completed} de {data.total} obrigatórios
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${data.percent}%` }} />
            </div>
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-between" onClick={() => void load()} disabled={loading}>
              Conferir novamente · {timeAgo(data.checkedAt)}
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </Card>

      {data.readyToLaunch ? (
        <Card className="flex items-center gap-4 border-success/40 bg-success/5 p-5">
          <PartyPopper className="size-8 shrink-0 text-success" />
          <div>
            <h2 className="font-display text-lg font-black">Tudo pronto para vender!</h2>
            <p className="text-sm text-muted-foreground">
              Todos os itens obrigatórios estão concluídos. Publique o site e acompanhe pelo painel.
            </p>
          </div>
          <Button asChild variant="outline" className="ml-auto hidden sm:inline-flex">
            <Link to="/master/painel">Ir para o painel</Link>
          </Button>
        </Card>
      ) : null}

      {groups.map((group) => {
        const Icon = GROUP_ICON[group.id];
        return (
          <section key={group.id}>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-black">{group.title}</h2>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
              </div>
              <Badge variant={group.readyToLaunch ? "default" : "secondary"}>
                {group.total ? `${group.completed}/${group.total}` : "opcional"}
              </Badge>
            </div>
            <div className="grid gap-2">
              {group.items.map((check) => (
                <SetupItem key={check.id} check={check} />
              ))}
            </div>
          </section>
        );
      })}

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Palette className="size-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-black">Sua marca</h3>
          <p className="text-sm text-muted-foreground">
            Veja como o {brand.name} aparece e gere o prompt para alterar nome, cores e textos na Lovable.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/master/implantacao">
            Abrir <ArrowRight className="size-4" />
          </Link>
        </Button>
      </Card>
    </div>
  );
}

const STATUS = {
  ready: { label: "Pronto", card: "border-success/40 bg-success/5", dot: "bg-success text-success-foreground", text: "text-success" },
  missing: { label: "Falta", card: "border-primary/30", dot: "bg-primary/10 text-primary", text: "text-primary" },
  attention: { label: "Atenção", card: "border-warning/40", dot: "bg-warning/15 text-warning", text: "text-warning" },
} as const;

function SetupItem({ check }: { check: MasterSetupCheck }) {
  const s = STATUS[check.status];
  return (
    <Card className={`flex flex-col gap-3 p-3 sm:flex-row sm:items-center ${s.card}`}>
      <div className={`grid size-8 shrink-0 place-items-center rounded-full ${s.dot}`}>
        {check.status === "ready" ? (
          <Check className="size-4" />
        ) : check.status === "attention" ? (
          <AlertTriangle className="size-4" />
        ) : (
          <Circle className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-sm font-black">{check.title}</h3>
          <Badge variant={check.status === "ready" ? "default" : "secondary"}>{s.label}</Badge>
          {check.optional ? <span className="text-[11px] text-muted-foreground">opcional</span> : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{check.description}</p>
        <p className={`mt-1 text-xs font-semibold ${s.text}`}>{check.detail}</p>
      </div>
      <Button asChild variant={check.status === "ready" ? "ghost" : "outline"} size="sm" className="shrink-0">
        <Link to={check.to as never}>
          {check.action} <ArrowRight className="size-4" />
        </Link>
      </Button>
    </Card>
  );
}
