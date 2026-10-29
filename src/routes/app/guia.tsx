import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight, Bell, BrainCircuit, CalendarDays, Check, Crown, MessageCircle, Mic, PartyPopper,
  PiggyBank, RefreshCw, Sparkles,
} from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { Button } from "@/components/ui/button";
import { MiaAvatar } from "@/components/finance/mia-avatar";
import { getOnboardingProgress } from "@/lib/onboarding.functions";
import { ONBOARDING_ORDER, onboardingProgress, type OnboardingSignals, type OnboardingStepId } from "@/lib/onboarding-rules";

export const Route = createFileRoute("/app/guia")({
  head: brandedRouteHead("Comece aqui"),
  component: FinanceGuide,
});

type StepInfo = {
  title: string;
  text: string;
  action: string;
  to: string;
  search?: Record<string, string>;
  example?: string;
  icon: typeof Mic;
};

function FinanceGuide() {
  const context = Route.useRouteContext();
  const branding = useBrand();
  const mia = branding.assistantName || "MIA";
  const read = useServerFn(getOnboardingProgress);
  const [data, setData] = useState<(OnboardingSignals & { planName: string | null; periodEnd: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const companyId = context.company?.id;

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try { setData(await read({ data: { companyId } })); } finally { setLoading(false); }
  }, [companyId, read]);
  useEffect(() => { void refresh(); }, [refresh]);

  const p = data ? onboardingProgress(data) : null;
  const daysLeft = data?.periodEnd ? Math.max(0, Math.ceil((new Date(data.periodEnd).getTime() - Date.now()) / 86400000)) : null;

  const info: Record<OnboardingStepId, StepInfo> = {
    first_entry: { title: `Registre seu primeiro gasto com a ${mia}`, text: "Fale ou escreva. Ela pergunta o que faltar e confirma antes de salvar.", action: "Falar com a MIA", to: "/app/marcia", search: { pergunta: "Gastei R$ 45 no mercado hoje" }, example: "“Gastei R$ 45 no mercado hoje”", icon: Mic },
    schedule: { title: "Agende as próximas contas", text: "Cadastre o que vence e quando, inclusive contas que se repetem. Você recebe aviso antes do vencimento.", action: "Abrir planejamento", to: "/app/planejamento", icon: CalendarDays },
    plan: { title: "Ative seu plano", text: data?.paidPlan ? `Plano ${data.planName ?? ""} ativo.` : `Escolha Basic ou PRO para continuar usando sem limites${daysLeft !== null ? ` — restam ${daysLeft} dia(s) do período atual` : ""}.`, action: data?.paidPlan ? "Ver meu plano" : "Ativar plano", to: data?.paidPlan ? "/app/configuracoes" : "/app/planos", search: data?.paidPlan ? { aba: "conta" } : undefined, icon: Crown },
    whatsapp: { title: "Use pelo WhatsApp", text: `Vincule seu celular e mande textos, áudios, fotos de recibos e PDFs para a ${mia}.`, action: "Ativar WhatsApp", to: "/app/conexao", icon: MessageCircle },
    push: { title: "Ative as notificações", text: "Receba avisos de contas, orçamento e resumo do dia neste aparelho.", action: "Ativar avisos", to: "/app/notificacoes", icon: Bell },
    teach_mia: { title: `Ensine a ${mia}`, text: "Defina o jeito de falar, metas, regras de categorias e limites de alerta.", action: "Personalizar", to: "/app/agente", icon: BrainCircuit },
    budget: { title: "Crie um orçamento ou meta", text: "Defina quanto quer gastar por categoria ou quanto quer guardar.", action: "Criar orçamento", to: "/app/planejamento", icon: PiggyBank },
  };

  const allDone = p?.completed === p?.total;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <MiaAvatar className="size-20 ring-4 ring-primary/20 sm:size-24" />
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.16em] text-primary">
              <Sparkles className="size-3.5" /> Comece aqui
            </span>
            <h1 className="mt-3 font-display text-3xl font-black tracking-[-.04em] sm:text-4xl">Olá! Eu sou a {mia}.</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sua assistente financeira na palma da mão. Siga os passos para deixar tudo pronto.</p>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs font-bold">
              <span>{p ? `${p.completed} de ${p.total} passos` : "Carregando…"}</span>
              <span>{p?.percent ?? 0}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p?.percent ?? 0}%` }} />
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => void refresh()} aria-label="Atualizar progresso">
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </section>

      {allDone && (
        <section className="flex flex-col gap-4 rounded-[24px] border border-primary/30 bg-primary/5 p-6 sm:flex-row sm:items-center">
          <PartyPopper className="size-10 text-primary" />
          <div className="flex-1">
            <h2 className="font-display text-xl font-black">Tudo pronto!</h2>
            <p className="text-sm text-muted-foreground">Sua conta está configurada. Agora é só usar no dia a dia.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/app/inicio">Visão do mês</Link></Button>
            <Button asChild><Link to="/app/marcia">Falar com a {mia}</Link></Button>
          </div>
        </section>
      )}

      {(["Essenciais", "Opcionais"] as const).map((group) => (
        <section key={group} className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-[.16em] text-muted-foreground">{group}</h2>
          <ol className="relative space-y-3 border-l-2 border-border pl-6">
            {ONBOARDING_ORDER.filter((s) => s.essential === (group === "Essenciais")).map((s) => {
              const step = info[s.id];
              const done = p?.done[s.id] ?? false;
              const current = p?.next === s.id;
              const Icon = step.icon;
              return (
                <li key={s.id} className={`relative rounded-[20px] border bg-card p-5 shadow-[var(--shadow-card)] ${current ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
                  <span className={`absolute -left-[37px] top-6 grid size-6 place-items-center rounded-full border-2 border-background ${done ? "bg-primary text-primary-foreground" : current ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {done ? <Check className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
                  </span>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${done ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                      {done ? <Check /> : <Icon />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-black tracking-[-.03em]">{step.title}</h3>
                        {done && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Concluído</span>}
                        {current && !done && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Próximo</span>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                      {step.example && !done && <p className="mt-1 text-xs italic text-muted-foreground">Exemplo: {step.example}</p>}
                    </div>
                    <Button asChild variant={done ? "outline" : "default"} className="shrink-0 rounded-xl">
                      <Link to={step.to as never} search={step.search as never}>{step.action}<ArrowRight /></Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
