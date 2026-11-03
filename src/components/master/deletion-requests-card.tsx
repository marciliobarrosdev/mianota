/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listDeletionRequests, resolveDeletionRequest } from "@/lib/finance/settings.functions";

const LABEL: Record<string, string> = { pending: "Pendente", approved: "Aprovado", rejected: "Recusado", canceled: "Cancelado" };

/** Pedidos de exclusão de conta (LGPD) enviados pelos assinantes. */
export function DeletionRequestsCard() {
  const list = useServerFn(listDeletionRequests);
  const resolve = useServerFn(resolveDeletionRequest);
  const [rows, setRows] = useState<any[]>([]);
  const load = () => void list().then(setRows).catch(() => setRows([]));
  useEffect(load, []);

  async function act(id: string, status: "approved" | "rejected") {
    try {
      await resolve({ data: { id, status } });
      toast.success(status === "approved" ? "Pedido aprovado." : "Pedido recusado.");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Erro");
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Trash2 className="size-4" /> Pedidos de exclusão de conta</h2>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido.</p> : (
        <div className="divide-y divide-border rounded-xl border border-border">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold">{r.company?.nome || "—"} · {r.email}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}{r.reason ? ` · ${r.reason}` : ""}</p>
              </div>
              {r.status === "pending" ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void act(r.id, "rejected")}>Recusar</Button>
                  <Button size="sm" variant="destructive" onClick={() => void act(r.id, "approved")}>Aprovar</Button>
                </div>
              ) : <Badge variant="secondary">{LABEL[r.status] || r.status}</Badge>}
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Aprovar registra a decisão; a remoção dos dados é feita por você em Assinantes.</p>
    </Card>
  );
}
