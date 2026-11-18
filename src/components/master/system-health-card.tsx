import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, HeartPulse, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSystemHealth } from "@/lib/master/system-health.functions";
import type { HealthItem, HealthLevel } from "@/lib/master/system-health-rules";

const LEVEL: Record<HealthLevel, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: "Tudo certo", className: "text-primary", Icon: CheckCircle2 },
  warn: { label: "Atenção", className: "text-warning", Icon: AlertTriangle },
  critical: { label: "Problema", className: "text-destructive", Icon: XCircle },
};

/** Visão rápida de falhas recentes: IA, comandos da MIA, WhatsApp, pagamentos e envios. */
export function SystemHealthCard() {
  const fetchHealth = useServerFn(getSystemHealth);
  const [data, setData] = useState<{ checkedAt: string; overall: HealthLevel; items: HealthItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchHealth()
      .then((r) => {
        setData(r);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [fetchHealth]);
  useEffect(load, [load]);

  const overall = data ? LEVEL[data.overall] : null;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-black">
            <HeartPulse className="size-5" /> Saúde do sistema
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {data
              ? `Verificado às ${new Date(data.checkedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`
              : "Falhas recentes da IA, WhatsApp, pagamentos e envios."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overall && (
            <Badge variant={data!.overall === "ok" ? "secondary" : "destructive"}>{overall.label}</Badge>
          )}
          <Button size="sm" variant="outline" onClick={load} disabled={loading} aria-label="Atualizar saúde do sistema">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
        </div>
      </div>
      {failed && !data ? (
        <p className="mt-4 text-sm text-muted-foreground">Não foi possível verificar agora. Tente atualizar.</p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {(data?.items ?? []).map((item) => {
            const lvl = LEVEL[item.level];
            return (
              <li key={item.key} className="flex gap-3 rounded-xl border border-border p-3">
                <lvl.Icon className={`mt-0.5 size-4 shrink-0 ${lvl.className}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
