/** Cabeçalho da Visão geral: título, atalhos de período, datas e atualizar. */
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRESETS, localDate, presetLabel } from "@/lib/master/overview-rules";

export function OverviewHeader({
  from,
  to,
  activePreset,
  loading,
  onPreset,
  onFromChange,
  onToChange,
  onRefresh,
}: {
  from: string;
  to: string;
  activePreset: number;
  loading: boolean;
  onPreset: (days: number) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onRefresh: () => void;
}) {
  return (
  <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
    <div>
      <p className="text-xs font-black uppercase tracking-[.16em] text-violet-500">
        Central do proprietário
      </p>
      <h1 className="mt-1 font-display text-2xl font-black tracking-tight sm:text-3xl">
        Visão geral do seu SaaS
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cadastros, receita, uso e pontos que pedem sua atenção.
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-xl border bg-card p-1">
        {PRESETS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => onPreset(days)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activePreset === days
                ? "bg-violet-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {presetLabel(days)}
          </button>
        ))}
      </div>
      <Input
        type="date"
        value={from}
        max={to}
        onChange={(event) => {
          onFromChange(event.target.value);
        }}
        className="h-10 w-[145px] bg-card text-xs"
        aria-label="Data inicial"
      />
      <Input
        type="date"
        value={to}
        min={from}
        max={localDate()}
        onChange={(event) => {
          onToChange(event.target.value);
        }}
        className="h-10 w-[145px] bg-card text-xs"
        aria-label="Data final"
      />
      <Button size="icon" variant="outline" onClick={onRefresh} disabled={loading}>
        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  </header>
  );
}
