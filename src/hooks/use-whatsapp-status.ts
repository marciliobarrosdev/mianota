import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getFinanceWhatsappChannel,
  getFinanceWhatsappIdentity,
} from "@/lib/finance-whatsapp.functions";

export function useWhatsappStatus(companyId?: string, intervalMs = 30000) {
  const checkChannel = useServerFn(getFinanceWhatsappChannel);
  const checkIdentity = useServerFn(getFinanceWhatsappIdentity);
  const [status, setStatus] = useState<"connected" | "connecting" | "disconnected" | "unknown">(
    "unknown",
  );

  useEffect(() => {
    if (!companyId) {
      setStatus("unknown");
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    const id = companyId;
    async function run() {
      try {
        const [channel, identity] = await Promise.all([
          checkChannel({ data: { companyId: id } }),
          checkIdentity({ data: { companyId: id } }),
        ]);
        if (alive) {
          setStatus(channel.connected && identity.identity?.active ? "connected" : "disconnected");
        }
      } catch {
        // O Basic não consulta o canal Pro; nesse caso mostramos a ação de ativação.
        // Se já havia conexão confirmada, um erro transitório não derruba o status.
        if (alive) setStatus((current) => (current === "unknown" ? "disconnected" : current));
      }
    }
    void run();
    timer = setInterval(() => {
      void run();
    }, intervalMs);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [checkChannel, checkIdentity, companyId, intervalMs]);

  return status;
}
