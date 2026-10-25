import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/marcia/page-kit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBrand } from "@/contexts/brand-context";
import {
  getFinanceWhatsappChannel,
  getFinanceWhatsappIdentity,
} from "@/lib/finance-whatsapp.functions";

export function FinanceConnections({ companyId }: { companyId?: string | null }) {
  const branding = useBrand();
  return <FinanceConnectionsInner branding={branding} companyId={companyId || null} />;
}

function FinanceConnectionsInner({
  branding,
  companyId,
}: {
  branding: ReturnType<typeof useBrand>;
  companyId: string | null;
}) {
  const checkWhatsapp = useServerFn(getFinanceWhatsappChannel);
  const readIdentity = useServerFn(getFinanceWhatsappIdentity);
  const [whatsapp, setWhatsapp] = useState<{ status: string }>({ status: "disconnected" });
  const [identityPhone, setIdentityPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [whatsappResult, identityResult] = await Promise.allSettled([
      checkWhatsapp({ data: { companyId } }),
      readIdentity({ data: { companyId } }),
    ]);
    if (whatsappResult.status === "fulfilled")
      setWhatsapp({
        status: whatsappResult.value.status || "disconnected",
      });
    if (identityResult.status === "fulfilled")
      setIdentityPhone(
        identityResult.value.identity?.active ? identityResult.value.identity.phone_e164 : null,
      );
    setLoading(false);
  }, [checkWhatsapp, companyId, readIdentity]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connected = whatsapp.status === "connected";
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <PageHeader
        eyebrow="Canais da sua vida financeira"
        title="Use no app ou pelo WhatsApp."
        description="Voz, texto, foto e lembretes trabalham juntos. Aqui você escolhe por onde falar com a sua assistente."
        action={
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} /> Atualizar
          </Button>
        }
      />

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="relative overflow-hidden rounded-[28px] border-emerald-200 p-0 shadow-[var(--shadow-card)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-cyan-400" />
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-13 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                <MessageCircle className="size-6" />
              </div>
              <Status ready={connected && Boolean(identityPhone)} loading={loading} />
            </div>
            <h2 className="mt-5 font-display text-2xl font-black tracking-[-.04em]">
              WhatsApp financeiro
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              O número da {branding.assistantName} já é mantido pela plataforma. Ative somente o seu
              celular pessoal com um código de segurança.
            </p>
            <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-xs leading-5 text-emerald-950">
              <b>
                {!connected
                  ? "Canal central em preparação"
                  : !identityPhone
                    ? "Falta ativar seu celular"
                    : "Pronto para usar"}
              </b>
              <div className="mt-1 text-emerald-800">
                {!connected
                  ? "Você não precisa configurar servidor, API ou número extra."
                  : !identityPhone
                    ? "O número oficial está online. Gere o código e envie do seu WhatsApp."
                    : `${identityPhone} é o celular autorizado.`}
              </div>
            </div>
            <Button asChild className="mt-5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">
              <Link to="/app/conexao">
                {connected && identityPhone ? "Gerenciar conexão" : "Conectar agora"} <ArrowRight />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-[28px] border-violet-200 p-0 shadow-[var(--shadow-card)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-purple-400" />
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-13 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                <CalendarDays className="size-6" />
              </div>
              <Status ready loading={false} />
            </div>
            <h2 className="mt-5 font-display text-2xl font-black tracking-[-.04em]">
              Calendário financeiro
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Envie uma conta futura ou recorrente. A MárcIA organiza a data e lembra você antes do
              vencimento.
            </p>
            <div className="mt-5 rounded-2xl bg-violet-50 p-4 text-xs leading-5 text-violet-950">
              <b>Pronto para usar</b>
              <div className="mt-1 text-violet-800">
                Diga: “me lembre do aluguel de R$ 1.500 todo dia 5”.
              </div>
            </div>
            <Button asChild variant="outline" className="mt-5 w-full rounded-xl border-violet-200">
              <Link to="/app/planejamento">
                Abrir calendário <ArrowRight />
              </Link>
            </Button>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-[24px] border-violet-200 p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-black">Use sem configurar nada</h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                A central da {branding.assistantName} já aceita voz e texto no navegador.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4 rounded-xl">
                <Link to="/app/marcia">
                  Conversar agora <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
        <Card className="rounded-[24px] border-violet-200 p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
              <Smartphone className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-black">Instale no celular</h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Abra como aplicativo pela tela inicial, sem loja e sem download pesado.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4 rounded-xl">
                <Link to="/app/guia">
                  Ver começo rápido <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 text-xs leading-5 text-violet-950">
        <LockKeyhole className="mt-0.5 size-5 shrink-0 text-violet-700" />
        <span>
          <b>Sem configuração técnica.</b> O aplicativo e o calendário já funcionam. Para usar o
          WhatsApp, basta autorizar o seu celular no número oficial da assistente.
        </span>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-xs text-emerald-950">
        <ShieldCheck className="size-5 shrink-0 text-emerald-700" /> O WhatsApp financeiro exige
        número pessoal vinculado. Mensagens de outros contatos não acessam seus dados.
      </div>
    </div>
  );
}

function Status({
  ready,
  loading,
  optional = false,
}: {
  ready: boolean;
  loading: boolean;
  optional?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] ${ready ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
    >
      {loading ? (
        <Loader2 className="size-3 animate-spin" />
      ) : ready ? (
        <CheckCircle2 className="size-3" />
      ) : (
        <span className="size-2 rounded-full bg-current opacity-60" />
      )}
      {loading ? "Verificando" : ready ? "Conectado" : optional ? "Opcional" : "Não conectado"}
    </span>
  );
}
