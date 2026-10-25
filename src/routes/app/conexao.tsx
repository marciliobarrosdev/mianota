import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import {
  createFinanceWhatsappPairing,
  getFinanceWhatsappChannel,
  getFinanceWhatsappIdentity,
  revokeFinanceWhatsappIdentity,
} from "@/lib/finance-whatsapp.functions";

export const Route = createFileRoute("/app/conexao")({
  head: brandedRouteHead("WhatsApp"),
  component: ConexaoPage,
});

type ChannelState = {
  connected: boolean;
  provider: string | null;
  phone: string | null;
  status: string;
  lastError: string | null;
};

function normalizePhoneForLink(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function ConexaoPage() {
  const ctx = Route.useRouteContext();
  const companyId = ctx.company?.id;
  const branding = useBrand();
  const plan = usePlanFeatures(companyId);
  const readChannel = useServerFn(getFinanceWhatsappChannel);
  const readIdentity = useServerFn(getFinanceWhatsappIdentity);
  const createPairing = useServerFn(createFinanceWhatsappPairing);
  const revokeIdentity = useServerFn(revokeFinanceWhatsappIdentity);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [channel, setChannel] = useState<ChannelState>({
    connected: false,
    provider: null,
    phone: null,
    status: "disconnected",
    lastError: null,
  });
  const [identityPhone, setIdentityPhone] = useState<string | null>(null);
  const [pairing, setPairing] = useState<{
    code: string;
    command: string;
    expiresAt: string;
  } | null>(null);

  async function refresh(silent = false) {
    if (!companyId || plan.loading || !plan.features.automacoes) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [channelResult, identityResult] = await Promise.allSettled([
      readChannel({ data: { companyId } }),
      readIdentity({ data: { companyId } }),
    ]);
    if (channelResult.status === "fulfilled") setChannel(channelResult.value);
    if (identityResult.status === "fulfilled") {
      setIdentityPhone(
        identityResult.value.identity?.active ? identityResult.value.identity.phone_e164 : null,
      );
      if (identityResult.value.identity?.active) setPairing(null);
    }
    if (!silent && channelResult.status === "rejected") {
      toast.error("Não foi possível conferir o canal agora.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void refresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, plan.features.automacoes, plan.loading]);

  async function generatePairing() {
    if (!companyId || !channel.connected) return;
    setActionLoading(true);
    try {
      const result = await createPairing({ data: { companyId } });
      setPairing(result);
      toast.success("Código criado. Envie a mensagem pelo seu WhatsApp.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o código.");
    } finally {
      setActionLoading(false);
    }
  }

  async function revokeAccess() {
    if (!companyId) return;
    setActionLoading(true);
    try {
      await revokeIdentity({ data: { companyId } });
      setIdentityPhone(null);
      setPairing(null);
      toast.success("Celular desvinculado.");
    } catch {
      toast.error("Não foi possível desvincular agora.");
    } finally {
      setActionLoading(false);
    }
  }

  async function copyCommand() {
    if (!pairing?.command) return;
    await navigator.clipboard.writeText(pairing.command);
    toast.success("Mensagem copiada.");
  }

  if (!plan.loading && !plan.features.automacoes) {
    return (
      <div className="mx-auto max-w-3xl pb-10">
        <Card className="overflow-hidden rounded-[30px] border-violet-200 shadow-[var(--shadow-card)]">
          <div className="bg-gradient-to-br from-[#170c25] via-[#2b1045] to-violet-700 p-7 text-white sm:p-10">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-200">
              Recurso do plano Pro
            </div>
            <h1 className="mt-3 font-display text-3xl font-black tracking-[-.04em] sm:text-4xl">
              Fale com a {branding.assistantName} pelo WhatsApp.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-violet-100">
              No Basic, voz, texto, foto, calendário e lembretes funcionam no aplicativo. O Pro
              também libera o número oficial da assistente — sem número extra, servidor ou API para
              você configurar.
            </p>
            <Button asChild className="mt-6 rounded-xl bg-white text-violet-900 hover:bg-violet-50">
              <Link to="/app/checkout" search={{ plano: "pro" }}>
                Ver plano Pro
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const centralPhone = normalizePhoneForLink(channel.phone);
  const whatsappLink =
    pairing && centralPhone
      ? `https://wa.me/${centralPhone}?text=${encodeURIComponent(pairing.command)}`
      : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <header className="rounded-[28px] border border-violet-200 bg-gradient-to-br from-white via-violet-50 to-fuchsia-50 p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-700">
              WhatsApp financeiro
            </div>
            <h1 className="mt-2 font-display text-3xl font-black tracking-[-.04em] sm:text-4xl">
              Ative seu celular. Sem QR Code.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              O número da {branding.assistantName} já é mantido pela plataforma. Você só confirma
              qual celular pode consultar e organizar os seus dados financeiros.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} /> Atualizar
          </Button>
        </div>
      </header>

      <Card className="overflow-hidden rounded-[28px] border-violet-200 shadow-[var(--shadow-card)]">
        <div className="border-b border-violet-100 p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                <MessageCircle className="size-6" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-black tracking-[-.03em]">
                  Número oficial da {branding.assistantName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {channel.phone || "Canal central da plataforma"}
                </p>
              </div>
            </div>
            {loading ? (
              <Badge variant="outline">
                <Loader2 className="animate-spin" /> Conferindo
              </Badge>
            ) : channel.connected ? (
              <Badge className="bg-emerald-600">
                <CheckCircle2 /> Online
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                Em preparação
              </Badge>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-7">
          {!channel.connected ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
              <b>O WhatsApp ainda está sendo preparado pela plataforma.</b>
              <p className="mt-1">
                Você não precisa configurar servidor, Evolution ou Meta. Enquanto isso, continue
                usando voz, texto e foto dentro do aplicativo.
              </p>
              <Button asChild variant="outline" className="mt-4 rounded-xl border-amber-300">
                <Link to="/app/marcia">Usar no aplicativo</Link>
              </Button>
            </div>
          ) : identityPhone ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-700" />
                <div>
                  <h3 className="font-bold text-emerald-950">Seu celular está autorizado</h3>
                  <p className="mt-1 text-sm text-emerald-800">{identityPhone}</p>
                  <p className="mt-2 text-xs leading-5 text-emerald-800">
                    Envie gastos, receitas, fotos e perguntas para o número oficial da assistente.
                    As respostas e os registros ficam somente na sua conta.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {centralPhone ? (
                  <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                    <a href={`https://wa.me/${centralPhone}`} target="_blank" rel="noreferrer">
                      Abrir WhatsApp <ExternalLink />
                    </a>
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={revokeAccess}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="animate-spin" /> : null} Trocar celular
                </Button>
              </div>
            </div>
          ) : pairing ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
                <div className="text-xs font-black uppercase tracking-[.14em] text-violet-700">
                  Envie esta mensagem pelo seu celular
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
                  <code className="text-lg font-black text-violet-950">{pairing.command}</code>
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={copyCommand}>
                    <Copy /> Copiar
                  </Button>
                </div>
                <p className="mt-3 text-xs leading-5 text-violet-800">
                  O código expira em 15 minutos. Depois do envio, a {branding.assistantName}{" "}
                  confirma a vinculação na própria conversa.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {whatsappLink ? (
                  <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                    <a href={whatsappLink} target="_blank" rel="noreferrer">
                      Abrir WhatsApp <ExternalLink />
                    </a>
                  </Button>
                ) : null}
                <Button variant="outline" className="rounded-xl" onClick={generatePairing}>
                  <RefreshCw /> Gerar outro código
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-display text-xl font-black">Vincule seu WhatsApp pessoal</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Toque no botão, envie a mensagem pronta para o número oficial e acabou. Você não
                escaneia QR Code e não conecta uma conta comercial.
              </p>
              <Button
                className="mt-5 rounded-xl"
                onClick={generatePairing}
                disabled={actionLoading || loading}
              >
                {actionLoading ? <Loader2 className="animate-spin" /> : <MessageCircle />}
                Ativar meu WhatsApp
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["1", "Gere o código", "Um código temporário protege sua vinculação."],
          ["2", "Envie a mensagem", "Mande pelo celular que você quer autorizar."],
          ["3", "Use normalmente", "Fale, fotografe ou escreva para a assistente."],
        ].map(([number, title, description]) => (
          <Card key={number} className="rounded-[22px] border-violet-100 p-5 shadow-sm">
            <div className="grid size-8 place-items-center rounded-full bg-violet-100 text-xs font-black text-violet-700">
              {number}
            </div>
            <h3 className="mt-4 font-bold">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs leading-5 text-emerald-950">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
        <span>
          <b>Dados separados por conta.</b> Seu número identifica sua assinatura antes de qualquer
          consulta ou lançamento. Nunca envie senha bancária, código de cartão ou credencial de API.
        </span>
      </div>
    </div>
  );
}
