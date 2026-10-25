import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getFinanceDashboard,
  type FinanceDashboardSnapshot,
} from "@/lib/finance-dashboard.functions";

export function useFinanceDashboard(
  companyId?: string | null,
  period?: { from: string; to: string } | null,
) {
  const getDashboard = useServerFn(getFinanceDashboard);
  const [data, setData] = useState<FinanceDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const from = period?.from ?? null;
  const to = period?.to ?? null;

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      setData(await getDashboard({ data: { companyId, from, to } }));
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Não foi possível carregar seus dados financeiros.",
      );
    } finally {
      setLoading(false);
    }
  }, [companyId, from, to, getDashboard]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdate = () => void refresh();
    window.addEventListener("marcia:finance-updated", onUpdate);
    return () => window.removeEventListener("marcia:finance-updated", onUpdate);
  }, [refresh]);

  return { data, loading, error, refresh };
}
