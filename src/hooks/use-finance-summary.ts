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
    load({ data: { companyId } })
      .then((s) => alive && setSummary(s))
      .catch(() => alive && setSummary(null));
    return () => {
      alive = false;
    };
  }, [companyId, load, version]);
  return summary;
}
