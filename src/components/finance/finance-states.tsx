import { Link } from "@tanstack/react-router";
import { ArrowRight, Mic, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingBlocks } from "@/components/marcia/page-kit";

export function FinanceLoading() {
  return <LoadingBlocks count={5} />;
}

export function FinanceError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="rounded-[26px] border border-rose-200 bg-rose-50 p-6 text-center dark:bg-rose-950/20">
      <p className="text-sm text-rose-800 dark:text-rose-200">{message}</p>
      <Button onClick={retry} variant="outline" className="mt-4 rounded-xl">
        <RefreshCw /> Tentar novamente
      </Button>
    </div>
  );
}

export function FinanceEmpty({
  title,
  description,
  example,
}: {
  title: string;
  description: string;
  example?: string;
}) {
  return (
    <div className="rounded-[26px] border border-dashed border-[color:var(--brand-soft-strong)] bg-[color:var(--brand-soft)] p-7 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[color:var(--brand)] text-white">
        <Sparkles className="size-5" />
      </div>
      <h2 className="mt-4 font-display text-xl font-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {example && (
        <div className="mx-auto mt-4 max-w-md rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm font-bold shadow-sm">
          “{example}”
        </div>
      )}
      <Button asChild className="mt-5 rounded-xl bg-[color:var(--brand)]">
        <Link to="/app/marcia">
          <Mic /> Falar com a MárcIA <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(cents || 0) / 100,
  );
}
