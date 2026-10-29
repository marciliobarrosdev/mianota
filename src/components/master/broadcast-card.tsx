import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Megaphone, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getBroadcastOverview, sendBroadcast } from "@/lib/notification-broadcast.functions";

export function BroadcastCard() {
  const overviewFn = useServerFn(getBroadcastOverview);
  const sendFn = useServerFn(sendBroadcast);
  const [plans, setPlans] = useState<{ id: string; nome: string }[]>([]);
  const [devices, setDevices] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [planId, setPlanId] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    overviewFn()
      .then((r) => {
        setPlans(r.plans);
        setDevices(r.activeDevices);
      })
      .catch(() => undefined);
  }, [overviewFn]);

  async function send() {
    if (title.trim().length < 3 || body.trim().length < 3) {
      toast.error("Preencha o título e a mensagem.");
      return;
    }
    setSending(true);
    try {
      const r = await sendFn({ data: { title, body, planId: planId || null } });
      toast.success(r.sent ? `Aviso enviado para ${r.sent} assinante(s).` : "Nenhum assinante nesse plano.");
      setTitle("");
      setBody("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Megaphone className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-extrabold">Enviar aviso aos assinantes</h2>
            <p className="text-xs text-muted-foreground">
              Aparece na Central de avisos e no celular de quem cadastrou o aparelho.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold">
          <Smartphone className="size-3.5" /> {devices ?? "…"} aparelhos ativos
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <Input placeholder="Título (ex.: Novidade na MIA)" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
        <select
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Quem recebe"
        >
          <option value="">Todos os assinantes</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              Só plano {p.nome}
            </option>
          ))}
        </select>
        <Textarea
          className="md:col-span-2"
          placeholder="Mensagem"
          maxLength={300}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button onClick={() => void send()} disabled={sending}>
          {sending ? <Loader2 className="animate-spin" /> : <Megaphone />} Enviar aviso
        </Button>
      </div>
    </Card>
  );
}
