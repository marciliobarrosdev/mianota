/** Cartão de push: convida a cadastrar o aparelho ou, se ativo, permite testar/desativar. */
import { Bell, BellRing, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useMiaNotifications } from "@/hooks/use-mia-notifications";

export function PushCard({
  push,
  devices,
  onActivate,
  onTest,
  onDeactivate,
}: {
  push: ReturnType<typeof useMiaNotifications>;
  devices: number;
  onActivate: () => Promise<void>;
  onTest: () => Promise<void>;
  onDeactivate: () => Promise<void>;
}) {
  const active = push.isSubscribed && push.permission === "granted";

  if (active) {
    return (
      <section className="flex flex-wrap items-center gap-3 rounded-[20px] border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)] sm:px-5">
        <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">Este aparelho recebe os avisos da MIA</p>
          <p className="text-xs text-muted-foreground">
            {devices} {devices === 1 ? "aparelho cadastrado" : "aparelhos cadastrados"} na sua conta
          </p>
        </div>
        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void onTest()}>
          <Bell /> Enviar teste
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-lg"
          onClick={() => void onDeactivate()}
        >
          Desativar
        </Button>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(125deg,var(--brand-master)_0%,var(--brand-strong)_55%,var(--brand)_100%)] p-5 text-primary-foreground shadow-[var(--shadow-card)] sm:p-6">
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-2xl gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15">
            <Smartphone className="size-6" />
          </div>
          <div>
            <h2 className="font-display text-lg font-extrabold">Receba os avisos no celular</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed opacity-85">
              Toque em Cadastrar aparelho e permita as notificações. No iPhone, instale o app na
              tela inicial antes.
            </p>
            {push.error && <p className="mt-2 text-xs font-semibold">{push.error}</p>}
            {!push.supported && (
              <p className="mt-2 text-xs font-semibold">
                Abra o sistema por HTTPS em um navegador compatível.
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={() => void onActivate()}
          disabled={!push.supported || push.isActivating}
          variant="secondary"
          className="h-11 shrink-0 rounded-xl px-5 font-extrabold"
        >
          {push.isActivating ? <Loader2 className="animate-spin" /> : <BellRing />}
          {push.isActivating ? "Ativando..." : "Cadastrar aparelho"}
        </Button>
      </div>
    </section>
  );
}
