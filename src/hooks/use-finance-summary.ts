import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getFinanceSummaryCards } from "@/lib/finance/finance-summary.functions";
import type { FinanceSummaryCards } from "@/lib/finance/summary-cards-rules";

/** Reloads the summary cards whenever `version` changes (pass the page's loaded data). */
export function useFinanceSummary(companyId: string | undefined, version: unknown) {
  const load = useServerFn(getFinanceSummaryCards);
  const [summary, setSummary] = useState<FinanceSummaryCards | null>(null);
  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    // One delayed retry covers a brief server restart (e.g. while the preview reloads);
    // a failure never breaks the page — the cards simply stay empty.
    const run = (attempt: number) =>
      load({ data: { companyId } })
        .then((s) => alive && setSummary(s))
        .catch(() => {
          if (!alive) return;
          if (attempt === 0) retry = setTimeout(() => run(1), 1500);
          else setSummary(null);
        });
    run(0);
    return () => {
      alive = false;
      if (retry) clearTimeout(retry);
    };
  }, [companyId, load, version]);
  return summary;
}
