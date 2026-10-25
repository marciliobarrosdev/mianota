import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Circle, Loader2, Palette, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { brandedRouteHead } from "@/config/brand";
import { getMasterSetupProgress, type MasterSetupCheck } from "@/lib/master-setup.functions";

export const Route = createFileRoute("/master/checklist")({
  head: brandedRouteHead("Comece aqui"),
  component: MasterChecklistPage,
});

type Setup = Awaited<ReturnType<typeof getMasterSetupProgress>>;

function MasterChecklistPage() {
  const getProgress = useServerFn(getMasterSetupProgress);
  const [data, setData] = useState<Setup | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getProgress());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível conferir a instalação.",
      );
    } finally {
      setLoading(false);
    }
  }, [getProgress]);

  useEffect(() => void load(), [load]);

  const next = useMemo(() => data?.checks.find((check) => !check.ready) ?? null, [data]);

  if (!data && loading) {
    return (
      <div className="grid min-h-[55vh] place-items-center text-center">
        <div>
          <Loader2 className="mx-auto size-7 animate-spin text-violet-500" />
          <p className="mt-3 text-sm text-muted-foreground">Conferindo seu SaaS…</p>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-2xl border bg-[#170c25] p-4 text-white shadow-[0_18px_45px_rgba(40,13,65,.16)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
                Comece aqui
              </h1>
              <Badge className="border-white/15 bg-white/10 text-violet-100 hover:bg-white/10">
                implantação do proprietário
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-white/65">
              Complete os itens na ordem. O primeiro pendente é sempre a sua próxima ação.
            </p>
            {next ? (
              <Button asChild size="sm" className="mt-4 bg-white text-[#170c25] hover:bg-white/90">
                <Link to={next.to as never}>
                  Próxima ação: {next.action} <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-400/15 px-3 py-2 text-sm font-bold text-emerald-200">
                <ShieldCheck className="size-5" /> Configuração essencial concluída
              </div>
            )}
          </div>
          <div className="w-full rounded-xl border border-white/10 bg-white/[.07] p-4 backdrop-blur lg:w-[280px]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-violet-200">
                  prontidão
                </p>
                <p className="mt-1 font-display text-3xl font-black">{data.percent}%</p>
              </div>
              <p className="pb-1 text-sm text-white/60">
                {data.completed} de {data.total} itens
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-fuchsia-400 transition-all duration-700"
                style={{ width: `${data.percent}%` }}
              />
            </div>
            <Button
              variant="ghost"
              className="mt-2 h-8 w-full justify-between text-white hover:bg-white/10 hover:text-white"
              onClick={() => void load()}
              disabled={loading}
            >
              Conferir novamente
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-xs font-black uppercase tracking-[.16em] text-violet-500">
            checklist automático
          </p>
          <h2 className="mt-1 font-display text-xl font-black">Configuração essencial</h2>
        </div>
        <div className="grid gap-2">
          {data.checks.map((check, index) => (
            <SetupItem key={check.id} check={check} index={index + 1} />
          ))}
        </div>
      </section>

      <section>
        <Card className="p-4">
          <div className="flex gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-500/10 text-violet-500">
              <Palette className="size-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[.14em] text-violet-500">
                feito por prompt
              </p>
              <h3 className="mt-1 font-display text-lg font-black">Marca e landing page</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Nome, logo, cores, copy e dados legais são personalizados na Lovable com o prompt
                preparado pelo agente da Academy — não neste painel.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/master/implantacao">
                  Ver orientação <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

function SetupItem({ check, index }: { check: MasterSetupCheck; index: number }) {
  return (
    <Card
      className={`flex flex-col gap-3 p-3 sm:flex-row sm:items-center ${
        check.ready ? "border-emerald-300/60 bg-emerald-500/[.035]" : "border-violet-200/70"
      }`}
    >
      <div
        className={`grid size-8 shrink-0 place-items-center rounded-full font-display text-xs font-black ${
          check.ready
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            : "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
        }`}
      >
        {check.ready ? <Check className="size-5" /> : index}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-sm font-black">{check.title}</h3>
          <Badge variant={check.ready ? "default" : "secondary"}>
            {check.ready ? "Pronto" : "Pendente"}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{check.description}</p>
        <p
          className={`mt-1 text-xs font-semibold ${check.ready ? "text-emerald-700 dark:text-emerald-300" : "text-violet-600"}`}
        >
          {check.ready ? (
            <Check className="mr-1 inline size-3.5" />
          ) : (
            <Circle className="mr-1 inline size-3.5" />
          )}
          {check.detail}
        </p>
      </div>
      <Button asChild variant={check.ready ? "ghost" : "outline"} size="sm" className="shrink-0">
        <Link to={check.to as never}>
          {check.action} <ArrowRight className="size-4" />
        </Link>
      </Button>
    </Card>
  );
}
