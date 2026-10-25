import { useEffect, useState } from "react";
import { CalendarRange } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FINANCE_PERIOD_LABELS,
  formatPeriodLabel,
  resolveFinancePeriod,
  type FinancePeriod,
  type FinancePeriodPreset,
} from "@/lib/finance-period";

const PRESETS: FinancePeriodPreset[] = ["this_month", "last_month", "last_30", "custom"];

export function PeriodFilter({
  value,
  onChange,
  className = "",
}: {
  value: FinancePeriod;
  onChange: (next: FinancePeriod) => void;
  className?: string;
}) {
  const [draftFrom, setDraftFrom] = useState(value.from);
  const [draftTo, setDraftTo] = useState(value.to);
  const [customOpen, setCustomOpen] = useState(value.preset === "custom");

  useEffect(() => {
    setDraftFrom(value.from);
    setDraftTo(value.to);
  }, [value.from, value.to]);

  function pick(preset: FinancePeriodPreset) {
    if (preset === "custom") {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    onChange(resolveFinancePeriod(preset));
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="radiogroup"
          aria-label="Período"
          className="flex max-w-full overflow-x-auto rounded-xl bg-muted p-1"
        >
          {PRESETS.map((preset) => {
            const active =
              preset === "custom" ? customOpen : !customOpen && value.preset === preset;
            return (
              <button
                key={preset}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pick(preset)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${active ? "bg-card text-[color:var(--brand-text)] shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {FINANCE_PERIOD_LABELS[preset]}
              </button>
            );
          })}
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <CalendarRange className="size-3.5" /> {formatPeriodLabel(value)}
        </span>
      </div>
      {customOpen && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onChange(resolveFinancePeriod("custom", { from: draftFrom, to: draftTo }));
          }}
        >
          <label className="text-[11px] font-bold text-muted-foreground">
            Data inicial
            <Input
              type="date"
              value={draftFrom}
              onChange={(event) => setDraftFrom(event.target.value)}
              className="mt-1 h-9 w-[150px] rounded-lg"
              required
            />
          </label>
          <label className="text-[11px] font-bold text-muted-foreground">
            Data final
            <Input
              type="date"
              value={draftTo}
              onChange={(event) => setDraftTo(event.target.value)}
              className="mt-1 h-9 w-[150px] rounded-lg"
              required
            />
          </label>
          <Button type="submit" size="sm" className="h-9 rounded-lg bg-[color:var(--brand)]">
            Aplicar
          </Button>
        </form>
      )}
    </div>
  );
}
