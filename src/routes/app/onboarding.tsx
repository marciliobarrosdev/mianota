/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Landmark,
  Loader2,
  Mic,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import fallbackAvatarUrl from "@/assets/marcia-avatar-640.png";
import { brandedRouteHead } from "@/config/brand";
import { useMoneyField } from "@/components/money-input";
import { useBrand } from "@/contexts/brand-context";
import { Button } from "@/components/ui/button";
import { finishFinanceOnboarding } from "@/lib/finance-dashboard.functions";

type Search = { checkout?: string };

export const Route = createFileRoute("/app/onboarding")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    checkout: typeof search.checkout === "string" ? search.checkout : undefined,
  }),
  head: brandedRouteHead("Primeiros passos"),
  component: FinanceOnboarding,
});

const goals = [
  { id: "control", label: "Controlar meus gastos", icon: WalletCards },
  { id: "save", label: "Guardar mais dinheiro", icon: Target },
  { id: "clarity", label: "Entender para onde vai", icon: Sparkles },
];

function FinanceOnboarding() {
  const branding = useBrand();
  const context = Route.useRouteContext();
  const navigate = useNavigate();
  const search = useSearch({ from: "/app/onboarding" }) as Search;
  const companyId = context.company?.id;
  const finishOnboarding = useServerFn(finishFinanceOnboarding);
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState("control");
  const [accountName, setAccountName] = useState("Conta principal");
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const balanceField = useMoneyField({
    cents: balanceCents,
    onChange: setBalanceCents,
    allowNegative: true,
  });
  const [saving, setSaving] = useState(false);
  const avatarUrl = branding.avatarUrl || fallbackAvatarUrl;

  useEffect(() => {
    if (!context.company) navigate({ to: "/app/checkout", replace: true });
  }, [context.company, navigate]);

  useEffect(() => {
    if (search.checkout === "success")
      toast.success("Conta liberada. Agora vamos organizar sua vida financeira.");
  }, [search.checkout]);

  async function finish() {
    if (!companyId || saving) return;
    setSaving(true);
    try {
      await finishOnboarding({
        data: {
          companyId,
          accountName: accountName.trim() || "Conta principal",
          balanceCents: balanceCents ?? 0,
          goal: goal as "control" | "save" | "clarity",
        },
      });
      window.location.href = "/app/marcia";
    } catch (error: any) {
      toast.error(error?.message || "Não consegui concluir agora. Tente novamente.");
      setSaving(false);
    }
  }

  return (
    <main className="relative min-h-[calc(100vh-2rem)] overflow-hidden rounded-[34px] bg-[#100719] text-white shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(168,85,247,.28),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(192,38,211,.18),transparent_35%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[.9fr_1.1fr] lg:px-10">
        <section className="relative hidden min-h-[620px] overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-b from-violet-600/30 to-transparent lg:block">
          <div className="relative z-10 p-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em]">
              <Sparkles className="size-3.5" /> configuração inteligente
            </span>
            <h1 className="mt-7 max-w-md font-display text-5xl font-black leading-[.95] tracking-[-.055em]">
              Seu dinheiro começa a fazer sentido agora.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-violet-100/80">
              Você fala. {branding.assistantName} pergunta o que faltar, registra e transforma tudo
              em clareza.
            </p>
          </div>
          <div className="absolute bottom-0 left-1/2 h-[440px] w-[420px] -translate-x-1/2">
            <div className="absolute inset-x-8 bottom-10 h-32 rounded-full bg-fuchsia-500/25 blur-3xl" />
            <img
              src={avatarUrl}
              alt={branding.assistantName}
              className="marcia-float relative z-10 h-full w-full object-contain object-bottom drop-shadow-[0_30px_32px_rgba(0,0,0,.45)]"
            />
          </div>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white p-5 text-[#21122f] shadow-2xl sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {[1, 2, 3].map((item) => (
                <span
                  key={item}
                  className={`h-2 rounded-full transition-all ${item === step ? "w-12 bg-violet-600" : item < step ? "w-5 bg-emerald-400" : "w-5 bg-violet-100"}`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-violet-500">PASSO {step} DE 3</span>
          </div>

          {step === 1 && (
            <div className="mt-10">
              <div className="grid size-14 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                <Target />
              </div>
              <h2 className="mt-5 font-display text-4xl font-black tracking-[-.05em]">
                O que você quer melhorar primeiro?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Isso ajuda a MárcIA a destacar o que mais importa para você.
              </p>
              <div className="mt-7 grid gap-3">
                {goals.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGoal(item.id)}
                      className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${goal === item.id ? "border-violet-500 bg-violet-50 ring-4 ring-violet-100" : "border-border hover:border-violet-200"}`}
                    >
                      <span
                        className={`grid size-11 place-items-center rounded-xl ${goal === item.id ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"}`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="flex-1 font-bold">{item.label}</span>
                      {goal === item.id && <Check className="size-5 text-violet-600" />}
                    </button>
                  );
                })}
              </div>
              <Button
                onClick={() => setStep(2)}
                className="mt-8 h-13 w-full rounded-2xl bg-violet-700 text-base hover:bg-violet-800"
              >
                Continuar <ArrowRight />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="mt-10">
              <div className="grid size-14 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                <Landmark />
              </div>
              <h2 className="mt-5 font-display text-4xl font-black tracking-[-.05em]">
                Crie sua primeira conta.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Pode ser sua conta principal, uma carteira ou dinheiro. Depois você adiciona as
                outras que usa.
              </p>
              <label className="mt-7 block text-sm font-bold">
                Nome da conta
                <input
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  className="mt-2 h-14 w-full rounded-2xl border border-border bg-muted/30 px-4 text-base outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  placeholder="Ex.: Nubank, Itaú, Carteira"
                />
              </label>
              <label className="mt-5 block text-sm font-bold">
                Saldo de hoje <span className="font-normal text-muted-foreground">(opcional)</span>
                <div className="mt-2 flex h-14 items-center rounded-2xl border border-border bg-muted/30 px-4 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
                  <input
                    {...balanceField.inputProps}
                    aria-label="Saldo de hoje"
                    className="min-w-0 flex-1 bg-transparent text-base outline-none"
                  />
                </div>
                {balanceField.error && (
                  <span className="mt-1 block text-xs font-medium text-destructive">
                    {balanceField.error}
                  </span>
                )}
              </label>
              <div className="mt-8 flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)} className="h-13 rounded-2xl">
                  Voltar
                </Button>
                <Button
                  disabled={!accountName.trim() || Boolean(balanceField.rawError)}
                  onClick={() => setStep(3)}
                  className="h-13 flex-1 rounded-2xl bg-violet-700 text-base hover:bg-violet-800"
                >
                  Continuar <ArrowRight />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-10 text-center">
              <div className="relative mx-auto grid size-24 place-items-center rounded-[30px] bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-xl shadow-violet-200">
                <Mic className="size-10" />
                <span className="absolute -right-1 -top-1 size-5 rounded-full border-4 border-white bg-emerald-400" />
              </div>
              <h2 className="mt-6 font-display text-4xl font-black tracking-[-.05em]">
                Pronto. Agora é só contar.
              </h2>
              <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground">
                Você vai dizer algo como{" "}
                <strong className="text-foreground">“gastei 85 reais no mercado pelo Pix”</strong>.
                A MárcIA entende, confirma e registra.
              </p>
              <div className="mt-7 rounded-2xl bg-violet-50 p-4 text-left text-sm text-violet-950">
                <strong>Depois, se quiser:</strong> ative seu celular para registrar também pelo
                número oficial da MárcIA. Você não precisa disso para começar.
              </div>
              <div className="mt-8 flex gap-3">
                <Button variant="ghost" onClick={() => setStep(2)} className="h-13 rounded-2xl">
                  Voltar
                </Button>
                <Button
                  disabled={saving}
                  onClick={finish}
                  className="h-13 flex-1 rounded-2xl bg-violet-700 text-base hover:bg-violet-800"
                >
                  {saving ? <Loader2 className="animate-spin" /> : <Sparkles />} Conversar com{" "}
                  {branding.assistantName}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
