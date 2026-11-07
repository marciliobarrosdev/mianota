import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Mail, RefreshCw, Send } from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEmailOverview, saveEmailSettings, sendTestEmail } from "@/lib/email/email.functions";
import { emailEventLabel } from "@/lib/email/resend-webhook-rules";

export const Route = createFileRoute("/master/emails")({
  head: brandedRouteHead("E-mails"),
  component: EmailsPage,
});

const WEBHOOK_URL = "https://mianota.lovable.app/api/public/email/resend";

function EmailsPage() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getEmailOverview);
  const saveFn = useServerFn(saveEmailSettings);
  const testFn = useServerFn(sendTestEmail);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["master-emails"],
    queryFn: () => overviewFn(),
    refetchInterval: 15000,
  });
  const [form, setForm] = useState({ from_name: "MIAnota", from_email: "", reply_to: "" });
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    if (data?.settings) setForm({ from_name: data.settings.from_name ?? "MIAnota", from_email: data.settings.from_email ?? "", reply_to: data.settings.reply_to ?? "" });
  }, [data?.settings]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => { toast.success("Remetente salvo."); qc.invalidateQueries({ queryKey: ["master-emails"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const test = useMutation({
    mutationFn: () => testFn({ data: { to: testTo } }),
    onSuccess: () => toast.success("E-mail de teste enviado. Os eventos aparecerão abaixo."),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><Mail className="h-6 w-6" /> E-mails (Resend)</h1>
          <p className="text-sm text-muted-foreground">Envio de e-mails e eventos em tempo real.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold">Conexão</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant={data?.resendConnected ? "default" : "destructive"}>{data?.resendConnected ? "Resend conectado" : "Resend não conectado"}</Badge>
            <Badge variant={data?.webhookSecretConfigured ? "default" : "secondary"}>{data?.webhookSecretConfigured ? "Webhook verificado" : "Signing Secret pendente"}</Badge>
          </div>
          <Label>Webhook do MIAnota</Label>
          <div className="flex gap-2">
            <Input readOnly value={WEBHOOK_URL} />
            <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(WEBHOOK_URL); toast.success("Copiado"); }}><Copy className="h-4 w-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">No Resend: Webhooks → Add endpoint → cole este endereço e marque todos os eventos.</p>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="font-semibold">Remetente</h2>
          <div className="space-y-1"><Label>Nome</Label><Input value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>E-mail (domínio verificado no Resend)</Label><Input placeholder="contato@seudominio.com" value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} /></div>
          <div className="space-y-1"><Label>Responder para (opcional)</Label><Input value={form.reply_to} onChange={(e) => setForm({ ...form, reply_to: e.target.value })} /></div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar remetente</Button>
          <div className="flex gap-2 pt-2">
            <Input placeholder="destinatario@exemplo.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
            <Button variant="secondary" onClick={() => test.mutate()} disabled={test.isPending || !testTo}><Send className="mr-2 h-4 w-4" />Testar</Button>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Eventos recebidos</h2>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : !data?.events.length ? (
          <p className="text-sm text-muted-foreground">Nenhum evento recebido ainda.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Evento</TableHead><TableHead>Destinatário</TableHead><TableHead>Assunto</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{new Date(e.occurred_at ?? e.received_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge variant={/bounced|complained|failed/.test(e.event_type) ? "destructive" : "secondary"}>{emailEventLabel(e.event_type)}</Badge></TableCell>
                  <TableCell>{e.recipient ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{e.subject ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
