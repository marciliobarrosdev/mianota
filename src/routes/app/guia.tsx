import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  MessageCircle,
  Mic,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import fallbackAvatarUrl from "@/assets/marcia-avatar-640.png";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { Button } from "@/components/ui/button";
import {
  getFinanceDashboard,
  type FinanceDashboardSnapshot,
} from "@/lib/finance-dashboard.functions";

export const Route = createFileRoute("/app/guia")({
  head: brandedRouteHead("Comece aqui"),
  beforeLoad: ({ context }) => {
    const role = context?.membership?.role;
    if (role !== "owner" && role !== "admin") throw redirect({ to: "/app/inicio" });
  },
  component: FinanceGuide,
});

function FinanceGuide() {
  const context = Route.useRouteContext();
  const branding = useBrand();
  const readDashboard = useServerFn(getFinanceDashboard);
  const [snapshot, setSnapshot] = useState<FinanceDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const companyId = context.company?.id;

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      setSnapshot(await readDashboard({ data: { companyId } }));
    } finally {
      setLoading(false);
    }
  }, [companyId, readDashboard]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const firstMovement = Boolean(snapshot?.latest.length);
  const completed = [firstMovement].filter(Boolean).length;
  const steps = [
    {
      title: `Conte para ${branding.assistantName}`,
      text: "Fale ou escreva um gasto ou receita. Ela pergunta o que faltar e confirma antes de salvar.",
      done: firstMovement,
      action: "Registrar por voz ou texto",
      to: "/app/marcia" as const,
      icon: Mic,
    },
    {
      title: "WhatsApp no seu ritmo",
      text: "Ative seu celular e mande mensagens para o número oficial da MárcIA. Sem QR Code ou configuração técnica.",
      done: false,
      action: "Ativar WhatsApp",
      to: "/app/conexao" as const,
      icon: MessageCircle,
      optional: true,
    },
    {
      title: "Agende as próximas contas",
      text: "Conte o que vence e quando. O calendário organiza e avisa antes do pagamento.",
      done: false,
      action: "Abrir calendário",
      to: "/app/planejamento" as const,
      icon: CalendarDays,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] bg-[#160925] px-6 py-8 text-white shadow-2xl sm:px-9 lg:min-h-[330px] lg:pr-[390px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(139,92,246,.45),transparent_35%),radial-gradient(circle_at_90%_80%,rgba(217,70,239,.24),transparent_35%)]" />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.18em]">
            <Sparkles className="size-3.5" /> começo rápido
          </span>
          <h1 className="mt-5 font-display text-4xl font-black leading-[.98] tracking-[-.055em] sm:text-5xl">
            Do zero ao primeiro dinheiro organizado.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-violet-100/75 sm:text-base">
            Sem planilha e sem configuração técnica. Comece pelo app; WhatsApp e lembretes entram no
            seu ritmo.
          </p>
          <div className="mt-7 flex max-w-md items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs font-bold">
                <span>{completed} de 1 essencial</span>
                <span>{completed * 100}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-400 transition-all"
                  style={{ width: `${completed * 100}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="grid size-10 place-items-center rounded-xl border border-white/15 bg-white/10"
              aria-label="Atualizar progresso"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <img
          src={branding.avatarUrl || fallbackAvatarUrl}
          alt={branding.assistantName}
          className="marcia-float absolute -bottom-8 right-4 hidden h-[330px] object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.55)] lg:block"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <article
              key={step.title}
              className={`rounded-[26px] border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6 ${step.done ? "border-emerald-200" : "border-border"}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`grid size-12 shrink-0 place-items-center rounded-2xl ${step.done ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}
                >
                  {step.done ? <Check /> : <Icon />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[.16em] text-violet-600">
                      Passo {index + 1}
                    </span>
                    {step.optional && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                        opcional
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 font-display text-xl font-black tracking-[-.035em]">
                    {step.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                <span
                  className={`text-xs font-bold ${step.done ? "text-emerald-600" : "text-muted-foreground"}`}
                >
                  {step.done ? "Concluído" : step.optional ? "Faça quando quiser" : "Falta fazer"}
                </span>
                <Button
                  asChild
                  variant={step.done ? "outline" : "default"}
                  className={`rounded-xl ${step.done ? "" : "bg-violet-700 hover:bg-violet-800"}`}
                >
                  <Link to={step.to}>
                    {step.action}
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
