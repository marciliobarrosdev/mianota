import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sparkles, AlertTriangle } from "lucide-react";
import { getMyCredits } from "@/lib/credits.functions";

export function CreditsBadge({ companyId }: { companyId: string }) {
  const fetcher = useServerFn(getMyCredits);
  const [data, setData] = useState<{ saldo: number; origem: string } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      void fetcher({ data: { companyId } })
        .then((r) => alive && setData(r))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [companyId, fetcher]);

  if (!data) return null;
  const empty = data.saldo <= 0;
  const low = !empty && data.saldo <= 20;
  const tone = empty
    ? "bg-destructive/15 text-destructive border-destructive/30"
    : low
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
      : "bg-[color:var(--panel-2)] text-foreground border-[color:var(--hairline)]";

  return (
    <Link
      to="/app/checkout"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium ${tone}`}
      title={`${data.saldo} créditos de IA disponíveis (origem: ${data.origem})`}
    >
      {empty ? <AlertTriangle className="size-3.5" /> : <Sparkles className="size-3.5" />}
      <span className="tabular-nums">{data.saldo.toLocaleString("pt-BR")}</span>
      <span className="opacity-80">créditos</span>
      {empty && <span className="font-semibold underline underline-offset-2">Recarregar</span>}
    </Link>
  );
}
