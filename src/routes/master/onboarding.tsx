import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  FlaskConical,
  LayoutDashboard,
  Link2,
  Loader2,
  MessageCircleMore,
  Phone,
  RefreshCw,
  Send,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import {
  PHONE_INPUT_PROPS,
  brazilianPhoneError,
  isValidBrazilianPhone,
  maskBrazilianPhoneInput,
} from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  cancelOnboarding,
  getCentralChannelState,
  getOnboardingEvents,
  listPurchaseOnboardings,
  processOnboardingQueue,
  retryOnboarding,
  simulatePurchaseMessage,
  updateOnboardingPhone,
} from "@/lib/master-onboarding.functions";

export const Route = createFileRoute("/master/onboarding")({
  head: brandedRouteHead("Ativação pós-compra"),
  component: OnboardingQueuePage,
});

type Data = Awaited<ReturnType<typeof listPurchaseOnboardings>>;
type Row = Data["rows"][number];
type Channel = Awaited<ReturnType<typeof getCentralChannelState>>;

const STATUS: Record<
  string,
  { label: string; tone: "default" | "secondary" | "destructive" | "outline" }
> = {
  awaiting_account: { label: "Aguardando conta", tone: "secondary" },
  awaiting_phone: { label: "Aguardando telefone", tone: "secondary" },
  awaiting_channel: { label: "Aguardando canal", tone: "secondary" },
  awaiting_template: { label: "Aguardando template", tone: "secondary" },
  queued: { label: "Na fila", tone: "outline" },
  sending: { label: "Enviando", tone: "outline" },
  sent: { label: "Enviado", tone: "default" },
  delivered: { label: "Entregue", tone: "default" },
  read: { label: "Lido", tone: "default" },
  failed: { label: "Falhou", tone: "destructive" },
  paired: { label: "Vinculado", tone: "default" },
  conflict: { label: "Conflito de telefone", tone: "destructive" },
  cancelled: { label: "Cancelado", tone: "outline" },
};

const FILTERS = [
  null,
  "awaiting_phone",
  "awaiting_channel",
  "awaiting_template",
  "failed",
  "conflict",
  "sent",
  "paired",
] as const;

function OnboardingQueuePage() {
  const list = useServerFn(listPurchaseOnboardings);
  const loadChannel = useServerFn(getCentralChannelState);
  const processQueue = useServerFn(processOnboardingQueue);
  const [filter, setFilter] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [rows, currentChannel] = await Promise.all([
        list({ data: { status: filter } }),
        loadChannel(),
      ]);
      setData(rows);
      setChannel(currentChannel);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar a fila.");
    }
  }, [list, loadChannel, filter]);
  useEffect(() => void refresh(), [refresh]);

  async function runQueue() {
    setBusy(true);
    try {
      const result = await processQueue();
      toast.success(`${result.processed} item(ns) processado(s).`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao processar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4">
      <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">
              O que esta tela faz
            </p>
            <h1 className="mt-1 text-2xl font-bold">Ativação automática pós-compra</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Aqui você acompanha cada comprador desde o pagamento aprovado até o WhatsApp ficar
              vinculado à conta e ao dashboard dele. As mensagens são configuradas dentro de cada
              canal.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={runQueue} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}{" "}
            Reprocessar pendências
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          {[
            [ShoppingBag, "1. Compra aprovada", "O pagamento cria o assinante e entra na fila."],
            [MessageCircleMore, "2. Boas-vindas", "O canal ativo envia a mensagem configurada."],
            [Link2, "3. Confirmação", "A pessoa responde Começar + código de uso único."],
            [
              LayoutDashboard,
              "4. Conta vinculada",
              "WhatsApp e dashboard passam a usar a mesma conta.",
            ],
          ].map(([Icon, title, description]) => {
            const FlowIcon = Icon as typeof ShoppingBag;
            return (
              <div key={String(title)} className="rounded-xl border bg-muted/25 p-3">
                <FlowIcon className="size-4 text-primary" />
                <p className="mt-2 text-sm font-semibold">{String(title)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{String(description)}</p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className={`size-4 ${channel?.activeProvider ? "text-emerald-600" : "text-amber-600"}`}
            />
            <span>
              Canal ativo:{" "}
              <strong>
                {channel?.activeProvider === "meta"
                  ? "API oficial Meta"
                  : channel?.activeProvider === "evolution"
                    ? "WhatsApp QR Code"
                    : "nenhum"}
              </strong>
              {channel?.activeProvider === "meta" &&
                ` · template ${templateStatusLabel(channel.template.status)}`}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/master/whatsapp-qr">Editar mensagem QR</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/master/whatsapp-meta">Configurar template Meta</Link>
            </Button>
          </div>
        </div>
      </section>

      <div>
        <h2 className="font-display text-lg font-bold">Compras e ativações</h2>
        <p className="text-sm text-muted-foreground">
          Filtre para encontrar quem precisa de telefone, canal, template ou reenvio.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item ?? "all"}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full border px-3 py-1 text-xs ${filter === item ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            {item ? STATUS[item].label : "Todos"}
            {item && data?.counts[item] ? ` · ${data.counts[item]}` : ""}
          </button>
        ))}
      </div>

      <SimulationCard />

      {!data ? (
        <Loader2 className="size-6 animate-spin text-primary" />
      ) : data.rows.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Nenhuma compra neste filtro. Quando uma compra for aprovada na Stripe, Kiwify, Cakto ou
          PerfectPay, ela aparece aqui.
        </Card>
      ) : (
        <div className="space-y-2">
          {data.rows.map((row: Row) => (
            <OnboardingRow key={row.id} row={row} onChanged={refresh} />
          ))}
        </div>
      )}

      <Card className="p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">
          Se uma compra parar em “Aguardando telefone”
        </p>
        <p>
          Stripe: o checkout criado pelo app pede telefone. Kiwify, Cakto e PerfectPay: o telefone
          só chega se o checkout da plataforma exigir esse campo — confira lá. Sem telefone, a
          compra é ativada normalmente e fica aqui como “Aguardando telefone”.
        </p>
      </Card>
    </main>
  );
}

function OnboardingRow({ row, onChanged }: { row: Row; onChanged: () => void }) {
  const retry = useServerFn(retryOnboarding);
  const cancel = useServerFn(cancelOnboarding);
  const setPhone = useServerFn(updateOnboardingPhone);
  const loadEvents = useServerFn(getOnboardingEvents);
  const [phone, setPhoneValue] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof getOnboardingEvents>> | null>(
    null,
  );
  const [preview, setPreview] = useState<unknown>(null);
  const status = STATUS[row.status] ?? { label: row.status, tone: "outline" as const };
  const locked = ["paired", "cancelled", "sending"].includes(row.status);

  async function act(kind: string, fn: () => Promise<unknown>) {
    setBusy(kind);
    try {
      const result: any = await fn();
      if (kind === "dry") {
        setPreview(result?.preview ?? result?.detail ?? result?.error ?? result);
        toast.success("Simulação feita; nada foi enviado.");
      } else toast.success("Pronto.");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na ação.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold truncate">
            {row.company_name || row.buyer_name || row.buyer_email || "Compra sem identificação"}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.source} · {row.kind === "renewal" ? "renovação" : "compra"} ·{" "}
            {new Date(row.created_at).toLocaleString("pt-BR")} ·{" "}
            {row.buyer_phone_masked || "sem telefone"}
            {row.channel_provider &&
              ` · via ${row.channel_provider === "meta" ? "Meta" : "QR Code"}`}
          </p>
        </div>
        <Badge variant={status.tone}>{status.label}</Badge>
      </div>
      {row.status_detail && <p className="text-sm text-muted-foreground">{row.status_detail}</p>}
      {row.last_error && row.status === "failed" && (
        <p className="text-xs text-destructive">Último erro: {row.last_error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Tentativas: {row.attempts}
        {row.sent_at && ` · enviado ${new Date(row.sent_at).toLocaleString("pt-BR")}`}
        {row.delivered_at && ` · entregue ${new Date(row.delivered_at).toLocaleString("pt-BR")}`}
        {row.read_at && ` · lido ${new Date(row.read_at).toLocaleString("pt-BR")}`}
        {row.paired_at && ` · vinculado ${new Date(row.paired_at).toLocaleString("pt-BR")}`}
        {row.activation_pending && " · código ativo aguardando resposta"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {!locked && (
          <>
            <Input
              className="h-8 w-44"
              {...PHONE_INPUT_PROPS}
              aria-label="WhatsApp do comprador"
              value={phone}
              onChange={(e) => setPhoneValue(maskBrazilianPhoneInput(e.target.value))}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null || !isValidBrazilianPhone(phone)}
              onClick={() => {
                const invalid = brazilianPhoneError(phone);
                if (invalid) return toast.error(invalid);
                void act("phone", () => setPhone({ data: { id: row.id, phone } }));
              }}
            >
              <Phone className="size-4" /> Salvar telefone e enviar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => act("retry", () => retry({ data: { id: row.id } }))}
            >
              <Send className="size-4" /> Reenviar (novo código)
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          disabled={busy !== null}
          onClick={() => act("dry", () => retry({ data: { id: row.id, dryRun: true } }))}
        >
          <FlaskConical className="size-4" /> Simular (sem enviar)
        </Button>
        {!locked && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy !== null}
            onClick={() => act("cancel", () => cancel({ data: { id: row.id } }))}
          >
            <XCircle className="size-4" /> Cancelar
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={async () =>
            setEvents(events ? null : await loadEvents({ data: { id: row.id } }))
          }
        >
          {events ? "Ocultar histórico" : "Histórico"}
        </Button>
      </div>
      {preview != null && (
        <pre className="whitespace-pre-wrap rounded-lg bg-muted p-2 text-xs">
          {typeof preview === "string" ? preview : JSON.stringify(preview, null, 2)}
        </pre>
      )}
      {events && (
        <ul className="space-y-1 border-l pl-3 text-xs text-muted-foreground">
          {events.map((event: any) => (
            <li key={event.id}>
              {new Date(event.created_at).toLocaleString("pt-BR")} ·{" "}
              {STATUS[event.to_status]?.label ?? event.to_status} — {event.detail}
            </li>
          ))}
        </ul>
      )}
      {row.status === "conflict" && (
        <p className="text-xs text-muted-foreground">
          Este telefone já está ativo em outra assinatura. Confirme com o comprador qual número usar
          e informe outro telefone, ou desvincule o número na outra conta antes de reenviar.
        </p>
      )}
    </Card>
  );
}

function SimulationCard() {
  const simulate = useServerFn(simulatePurchaseMessage);
  const [name, setName] = useState("Ana Souza");
  const [phone, setPhone] = useState("11 98765-4321");
  const [result, setResult] = useState<Awaited<ReturnType<typeof simulatePurchaseMessage>> | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-4 space-y-2">
      <p className="font-display font-bold">Teste antes de vender</p>
      <p className="text-xs text-muted-foreground">
        Informe um nome e telefone fictícios para conferir o caminho e a mensagem atuais. A
        simulação não cria conta, não grava dados e não envia WhatsApp.
      </p>
      <div className="flex flex-wrap gap-2">
        <Input className="h-8 w-48" value={name} onChange={(e) => setName(e.target.value)} />
        <Input className="h-8 w-44" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              setResult(await simulate({ data: { name, phone } }));
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Falha na simulação.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Simular
        </Button>
      </div>
      {result && (
        <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
          <p>
            Nome: {result.normalized.name || "—"} · Telefone:{" "}
            {result.normalized.phone || "inválido"}
          </p>
          <p>
            Decisão:{" "}
            {result.decision.action === "wait"
              ? `${STATUS[result.decision.status]?.label} — ${result.decision.detail}`
              : result.decision.action === "send"
                ? `enviar por ${result.decision.provider === "meta" ? "template Meta" : "texto no QR Code"}`
                : result.decision.action}
          </p>
          {result.preview && <pre className="whitespace-pre-wrap">{result.preview}</pre>}
        </div>
      )}
    </Card>
  );
}

function templateStatusLabel(status: string | null) {
  const value = String(status || "").toUpperCase();
  if (value === "APPROVED") return "aprovado";
  if (value === "PENDING") return "em análise";
  if (value === "REJECTED") return "rejeitado";
  if (value === "INVALID") return "incompatível";
  return "ainda não aprovado";
}
