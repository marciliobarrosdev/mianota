import { IntegrationCard } from "@/components/master/integration-card";
import { CentralChannelCard } from "@/components/master/central-channel-card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Cloud,
  ExternalLink,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Unplug,
} from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  checkSupportWhatsapp,
  disconnectSupportWhatsapp,
  getMasterWhatsappOverview,
  saveMetaSupportWhatsapp,
  startSupportQr,
} from "@/lib/master-whatsapp.functions";

type Overview = Awaited<ReturnType<typeof getMasterWhatsappOverview>>;
type Mode = "evolution" | "meta";

export function MasterWhatsappPage({ initialMode }: { initialMode: Mode }) {
  const load = useServerFn(getMasterWhatsappOverview);
  const startQr = useServerFn(startSupportQr);
  const check = useServerFn(checkSupportWhatsapp);
  const disconnect = useServerFn(disconnectSupportWhatsapp);
  const saveMeta = useServerFn(saveMetaSupportWhatsapp);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState<null | "qr" | "check" | "disconnect" | "meta">(null);
  const [qr, setQr] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    wabaId: "",
    phoneNumberId: "",
    accessToken: "",
    appSecret: "",
    apiVersion: "v24.0",
  });

  const refresh = useCallback(async () => {
    try {
      const result = await load();
      setOverview(result);

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar o canal.");
    }
  }, [load]);

  useEffect(() => void refresh(), [refresh]);
  useEffect(() => {
    if (overview?.channel.status !== "connecting" || mode !== "evolution") return;
    const timer = window.setInterval(() => void runCheck(false), 5000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview?.channel.status, mode]);

  async function runQr() {
    setBusy("qr");
    try {
      const result = await startQr();
      setQr(result.qrBase64);
      setPairingCode(result.pairingCode);
      if (result.connected) toast.success("WhatsApp conectado");
      else toast.success("QR Code pronto para leitura");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar o QR Code.");
    } finally {
      setBusy(null);
    }
  }

  async function runCheck(showToast = true) {
    if (busy) return;
    setBusy("check");
    try {
      const result = await check();
      setQr(result.qrBase64);
      setPairingCode(result.pairingCode);
      if (showToast) {
        if (result.connected) toast.success("Conexão confirmada");
        else toast.info("Ainda aguardando a conexão");
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function runDisconnect() {
    if (
      !confirm(
        "Desconectar o número central da MárcIA? Os assinantes ficarão sem o canal até a reconexão.",
      )
    )
      return;
    setBusy("disconnect");
    try {
      await disconnect();
      setQr(null);
      setPairingCode(null);
      toast.success("Número desconectado");
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function runMetaSave() {
    if (!overview) return;
    const configured = (field: string) =>
      overview.meta.fields.some((item) => item.field === field && item.configured);
    if (
      (!meta.wabaId && !configured("waba_id")) ||
      (!meta.phoneNumberId && !configured("phone_number_id")) ||
      (!meta.accessToken && !configured("access_token")) ||
      (!meta.appSecret && !configured("app_secret"))
    ) {
      return toast.error("Preencha os quatro dados obrigatórios.");
    }
    setBusy("meta");
    try {
      const result = await saveMeta({ data: meta });
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      if (result.ok) setMeta((current) => ({ ...current, accessToken: "", appSecret: "" }));
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!overview) {
    return (
      <div className="min-h-[65vh] grid place-items-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  const connected = overview.channel.status === "connected";
  const evolutionReady = overview.evolution.configured && overview.evolution.testOk === true;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">
          {mode === "meta" ? "API oficial Meta" : "WhatsApp QR Code"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "meta"
            ? "Configure o canal oficial, personalize o template de compra aprovada, envie para análise da Meta e só então ative o atendimento."
            : "Configure um único número central, personalize a mensagem de compra aprovada, leia o QR Code e ative o atendimento."}
        </p>
      </div>
      <CentralChannelCard key={mode} mode={mode} onChanged={() => void refresh()} />
      <Card className="p-4 space-y-2">
        <p className="text-sm">{mode === "meta" ? "1 Credenciais · 2 Testar · 3 Webhook · 4 Conectado" : "1 Servidor · 2 Testar · 3 Instância/QR · 4 Conectado"}</p>
        <p className="text-sm font-semibold">Estado: {overview.channel.provider === mode ? overview.channel.status : "não ativo neste canal"}</p>
        <p className="text-sm text-muted-foreground">Próxima ação: {connected && overview.channel.provider === mode ? "acompanhar as conversas" : mode === "meta" ? "salvar e testar os dados e configurar o webhook" : !evolutionReady ? "salvar e testar o servidor abaixo" : "gerar o QR e ler com o celular"}.</p>
        <Button variant="outline" size="sm" onClick={runDisconnect} disabled={busy !== null}>Limpar instância / desconectar</Button>
        <Button variant="outline" size="sm" onClick={() => runCheck(true)} disabled={busy !== null}>Conferir conexão</Button>
      </Card>
      <details className="rounded-xl border p-4 text-sm"><summary className="cursor-pointer font-semibold">Diagnóstico do canal</summary><p>Provedor: {overview.channel.provider} · Última sincronização: {overview.channel.lastSyncAt || "ainda não realizada"}</p><p>{overview.channel.lastError || "Nenhum erro de conexão registrado."}</p></details>
      {mode === "evolution" && <IntegrationCard provider="evolution" item={overview.evolution} onChange={() => void refresh()} />}
      {mode === "evolution" ? (
        <QrSetup
          overview={overview}
          ready={evolutionReady}
          qr={qr}
          pairingCode={pairingCode}
          busy={busy}
          onStart={runQr}
          onCheck={() => runCheck(true)}
        />
      ) : (
        <MetaSetup
          overview={overview}
          values={meta}
          setValues={setMeta}
          busy={busy === "meta"}
          onSave={runMetaSave}
        />
      )}

      <section className="grid gap-3 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Um canal, contas sempre separadas</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Todos falam com este número oficial. O celular vinculado identifica a assinatura
                antes de qualquer consulta ou lançamento financeiro.
              </p>
            </div>
          </div>
        </Card>
        <Card className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="font-display font-bold">Quer acompanhar o uso?</p>
            <p className="text-sm text-muted-foreground">Veja as conversas sincronizadas.</p>
          </div>
          <Button asChild>
            <Link to="/master/conversas">
              Ver conversas <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Card>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/8 px-3 py-2">
      <strong className="block text-lg">{value}</strong>
      <span className="text-[11px] text-white/55">{label}</span>
    </div>
  );
}

function ProviderChoice({
  active,
  icon: Icon,
  title,
  badge,
  description,
  onClick,
}: {
  active: boolean;
  icon: typeof QrCode;
  title: string;
  badge: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-all ${active ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border bg-card hover:border-primary/40"}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid size-9 place-items-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          <Icon className="size-5" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <strong className="font-display">{title}</strong>
            <Badge variant={active ? "default" : "secondary"}>{badge}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

function QrSetup({
  overview,
  ready,
  qr,
  pairingCode,
  busy,
  onStart,
  onCheck,
}: {
  overview: Overview;
  ready: boolean;
  qr: string | null;
  pairingCode: string | null;
  busy: string | null;
  onStart: () => void;
  onCheck: () => void;
}) {
  const connected =
    overview.channel.provider === "evolution" && overview.channel.status === "connected";
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/25 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="secondary">Implantação guiada · QR Code</Badge>
            <h2 className="mt-1 font-display text-lg font-bold">2. Gere e leia o QR Code</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Esta configuração é feita uma vez pelo dono do clone. O assinante nunca vê este QR.
            </p>
          </div>
          {connected && (
            <Badge className="bg-emerald-600">
              <CheckCircle2 className="size-3.5 mr-1" /> Conectado
            </Badge>
          )}
        </div>
      </div>
      <div className="grid lg:grid-cols-[1fr_330px]">
        <div className="space-y-3 p-4">
          <GuideStep number="1" title="Prepare o servidor uma única vez" done={ready}>
            <p>
              Abra{" "}
              <Link
                to="/master/whatsapp-qr"
                className="text-primary font-semibold underline underline-offset-4"
              >
                Servidor nesta página
              </Link>
              , salve a URL e a API Key da Evolution e clique em Testar.
            </p>
          </GuideStep>
          <GuideStep number="2" title="Gere o QR Code" done={Boolean(qr) || connected}>
            <p>
              Clique no botão ao lado. O sistema cria a instância central da MárcIA e configura a
              sincronização das mensagens.
            </p>
          </GuideStep>
          <GuideStep number="3" title="Leia com o celular" done={connected}>
            <p>
              No celular:{" "}
              <strong>
                WhatsApp → Configurações → Aparelhos conectados → Conectar um aparelho
              </strong>
              . Aponte a câmera para o QR.
            </p>
          </GuideStep>
          {!ready && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Antes do QR, configure e teste a Evolution nesta página.
            </div>
          )}
        </div>
        <div className="grid min-h-[300px] place-items-center bg-[#160923] p-4 text-white">
          <div className="w-full text-center">
            {connected ? (
              <div className="space-y-4">
                <div className="mx-auto size-24 rounded-full bg-emerald-400/15 grid place-items-center">
                  <CheckCircle2 className="size-12 text-emerald-400" />
                </div>
                <div>
                  <strong className="text-xl block">Tudo conectado</strong>
                  <span className="text-sm text-white/60">
                    {overview.channel.phone
                      ? `+${overview.channel.phone.replace(/^\+/, "")}`
                      : "O webhook já está sincronizando."}
                  </span>
                </div>
              </div>
            ) : qr ? (
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-2xl inline-block">
                  <img
                    src={qr}
                    alt="QR Code para conectar o número central da MárcIA"
                    className="size-52"
                  />
                </div>
                <p className="text-xs text-white/55">O QR é temporário. Se expirar, gere outro.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto size-24 rounded-3xl bg-white/8 border border-white/10 grid place-items-center">
                  <QrCode className="size-12 text-fuchsia-300" />
                </div>
                <div>
                  <strong className="text-xl block">Seu QR aparece aqui</strong>
                  <span className="text-sm text-white/55">Nada é conectado sem sua ação.</span>
                </div>
              </div>
            )}
            {pairingCode && !connected && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="text-xs text-white/50 block">Código de pareamento</span>
                <strong className="font-mono tracking-[.2em]">{pairingCode}</strong>
              </div>
            )}
            <div className="mt-5 flex flex-col gap-2">
              <Button
                onClick={onStart}
                disabled={!ready || busy !== null}
                className="bg-white text-[#160923] hover:bg-white/90"
              >
                {busy === "qr" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Smartphone className="size-4" />
                )}
                {qr ? "Gerar novo QR" : "Gerar QR Code"}
              </Button>
              <Button
                variant="ghost"
                onClick={onCheck}
                disabled={busy !== null}
                className="text-white hover:bg-white/10 hover:text-white"
              >
                {busy === "check" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}{" "}
                Conferir conexão
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MetaSetup({
  overview,
  values,
  setValues,
  busy,
  onSave,
}: {
  overview: Overview;
  values: {
    wabaId: string;
    phoneNumberId: string;
    accessToken: string;
    appSecret: string;
    apiVersion: string;
  };
  setValues: React.Dispatch<React.SetStateAction<typeof values>>;
  busy: boolean;
  onSave: () => void;
}) {
  const metaConnected =
    overview.channel.provider === "meta" && overview.channel.status === "connected";
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/25 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge variant="secondary">Implantação guiada · Meta Cloud API</Badge>
            <h2 className="mt-1 font-display text-lg font-bold">
              2. Da conta Meta à primeira mensagem
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Siga na ordem. O sistema valida antes de liberar o canal.
            </p>
          </div>
          {metaConnected && (
            <Badge className="bg-emerald-600">
              <CheckCircle2 className="size-3.5 mr-1" /> Oficial conectada
            </Badge>
          )}
        </div>
      </div>
      <div className="grid lg:grid-cols-[.92fr_1.08fr]">
        <div className="space-y-3 border-b p-4 lg:border-b-0 lg:border-r">
          <GuideStep number="1" title="Crie a estrutura na Meta">
            <p>
              Entre no{" "}
              <a
                href="https://business.facebook.com/"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-semibold"
              >
                Meta Business <ExternalLink className="inline size-3.5" />
              </a>
              , crie ou escolha seu portfólio empresarial. Depois, no{" "}
              <a
                href="https://developers.facebook.com/apps/"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-semibold"
              >
                Meta for Developers <ExternalLink className="inline size-3.5" />
              </a>
              , crie um app do tipo <strong>Assinante</strong> e adicione o produto WhatsApp.
            </p>
          </GuideStep>
          <GuideStep number="2" title="Cadastre o telefone">
            <p>
              Em <strong>WhatsApp → Configuração da API</strong>, adicione e valide o número. Copie
              o <strong>ID da conta do WhatsApp Business (WABA)</strong> e o{" "}
              <strong>ID do número de telefone</strong>. Ao registrar o número definitivo, guarde o
              PIN de seis dígitos da verificação em duas etapas.
            </p>
          </GuideStep>
          <GuideStep number="3" title="Crie um token permanente">
            <p>
              No Business Manager: <strong>Configurações → Usuários → Usuários do sistema</strong>.
              Crie um administrador, atribua o app e gere o token com{" "}
              <code>whatsapp_business_management</code> e <code>whatsapp_business_messaging</code>.
            </p>
          </GuideStep>
          <GuideStep number="4" title="Copie o App Secret">
            <p>
              No app da Meta, abra <strong>Configurações → Básico</strong> e revele o{" "}
              <strong>App Secret</strong>. Ele permite comprovar que cada webhook veio realmente da
              Meta.
            </p>
          </GuideStep>
          <GuideStep number="5" title="Configure o webhook">
            <p>
              No app da Meta, abra <strong>WhatsApp → Configuração → Webhook</strong>. Cole a URL e
              o token mostrados ao lado. Assine pelo menos o campo <strong>messages</strong>.
            </p>
          </GuideStep>
          <GuideStep number="6" title="Cole os dados e teste">
            <p>
              Preencha os campos. Ao salvar, o sistema confere o telefone na Graph API e assina o
              app na sua WABA.
            </p>
          </GuideStep>
          <a
            href="https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <BookOpen className="size-4" /> Abrir documentação oficial da Cloud API
          </a>
        </div>
        <div className="space-y-4 p-4">
          <div className="rounded-2xl bg-[#160923] text-white p-4 space-y-3">
            <CopyField label="URL de retorno (Callback URL)" value={overview.callbackUrl} />
            <CopyField label="Token de verificação" value={overview.verifyToken} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="WABA ID"
              value={values.wabaId}
              placeholder={fieldHint(overview.meta, "waba_id", "Ex.: 123456789012345")}
              onChange={(value) => setValues((current) => ({ ...current, wabaId: value }))}
            />
            <Field
              label="Phone Number ID"
              value={values.phoneNumberId}
              placeholder={fieldHint(overview.meta, "phone_number_id", "Ex.: 123456789012345")}
              onChange={(value) => setValues((current) => ({ ...current, phoneNumberId: value }))}
            />
          </div>
          <Field
            label="Token permanente do usuário do sistema"
            value={values.accessToken}
            type="password"
            placeholder={configuredHint(overview.meta, "access_token")}
            onChange={(value) => setValues((current) => ({ ...current, accessToken: value }))}
          />
          <Field
            label="App Secret"
            value={values.appSecret}
            type="password"
            placeholder={configuredHint(overview.meta, "app_secret")}
            onChange={(value) => setValues((current) => ({ ...current, appSecret: value }))}
          />
          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Configuração avançada
            </summary>
            <div className="mt-3">
              <Field
                label="Versão da Graph API"
                value={values.apiVersion}
                placeholder="v24.0"
                onChange={(value) => setValues((current) => ({ ...current, apiVersion: value }))}
              />
            </div>
          </details>
          {overview.meta.lastError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {overview.meta.lastError}
            </div>
          )}
          <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Atenção:</strong> mensagens livres só podem ser
            enviadas dentro da janela de 24 horas iniciada pelo assinante. Fora dela, a Meta exige
            um modelo previamente aprovado.
          </div>
          <Button onClick={onSave} disabled={busy} className="w-full sm:w-auto">
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}{" "}
            Salvar, testar e conectar
          </Button>
        </div>
      </div>
    </Card>
  );
}

function GuideStep({
  number,
  title,
  done = false,
  children,
}: {
  number: string;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <div
        className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"}`}
      >
        {done ? <Check className="size-4" /> : number}
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
      />
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[11px] uppercase tracking-[.12em] text-white/45 font-bold">
        {label}
      </span>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate text-xs bg-white/8 rounded-lg p-2">{value}</code>
        <button
          type="button"
          className="size-9 rounded-lg grid place-items-center hover:bg-white/10"
          onClick={() => navigator.clipboard.writeText(value).then(() => toast.success("Copiado"))}
        >
          <ClipboardCopy className="size-4" />
        </button>
      </div>
    </div>
  );
}

function fieldHint(item: Overview["meta"], field: string, fallback: string) {
  const saved = item.fields.find((entry) => entry.field === field);
  return saved?.configured && saved.last4 ? `Salvo: ${saved.last4}` : fallback;
}

function configuredHint(item: Overview["meta"], field: string) {
  const saved = item.fields.find((entry) => entry.field === field);
  return saved?.configured
    ? `Salvo com final ${saved.last4 || "••••"} — deixe em branco para manter`
    : "Cole a credencial";
}
