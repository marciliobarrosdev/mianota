import { type ReactNode, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Bot,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  Gauge,
  LayoutDashboard,
  MessageCircle,
  Palette,
  Play,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
  WandSparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import fallbackAvatarUrl from "@/assets/marcia-avatar-640.png";
import { brand, personalizeAssistantText } from "@/config/brand";

export type CinematicPlan = {
  slug: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  trialDays?: number;
  featured?: boolean;
  badge?: string;
};

export type CinematicLandingProps = {
  plans?: CinematicPlan[];
  signupHref?: string;
  demoHref?: string;
  loginHref?: string;
  brandName?: string;
  assistantName?: string;
  tagline?: string;
  logoUrl?: string | null;
  avatarUrl?: string | null;
};

const DEFAULT_PLANS: CinematicPlan[] = [
  {
    slug: "starter",
    name: "Basic",
    price: "49",
    description: "O essencial para cuidar do dinheiro sem planilha.",
    features: [
      "Dashboard financeiro",
      "Lançamentos por voz e texto",
      "Contas e cartões",
      "Calendário e lembretes",
      "Orçamentos básicos",
      "App instalável",
    ],
    trialDays: 3,
  },
  {
    slug: "pro",
    name: "Pro",
    price: "69",
    description: "Para automatizar a rotina e conversar com seu financeiro.",
    features: [
      "Tudo do Basic",
      "WhatsApp financeiro",
      "Metas e recorrências",
      "Relatórios inteligentes",
      "Mais comandos com IA",
      "Suporte prioritário",
    ],
    trialDays: 3,
    featured: true,
    badge: "Melhor escolha",
  },
];

const SCENARIOS = [
  {
    id: "agendar",
    label: "Novo agendamento",
    question: "Oi! Tem horário amanhã à tarde para limpeza de pele?",
    answer: "Tenho 14:30 com a Ana. Posso confirmar para você?",
    result: "Agendado para amanhã, 14:30",
    steps: ["Cliente identificado", "Horário reservado", "Confirmação enviada"],
  },
  {
    id: "reagendar",
    label: "Reagendar",
    question: "Não vou conseguir ir às 14:30. Pode ser mais tarde?",
    answer: "Claro. Às 16:00 está livre com a mesma profissional.",
    result: "Reagendado para amanhã, 16:00",
    steps: ["Agenda consultada", "Conflito evitado", "Cliente avisado"],
  },
  {
    id: "acompanhar",
    label: "Acompanhar serviço",
    question: "Meu serviço já foi iniciado?",
    answer: "Sim. A OS #0024 está em execução e a previsão é 17:30.",
    result: "OS #0024 em execução",
    steps: ["Ordem localizada", "Status consultado", "Previsão informada"],
  },
] as const;

const DASH_TABS = [
  {
    id: "hoje",
    label: "Hoje",
    icon: LayoutDashboard,
    title: "O que precisa acontecer agora",
    description: "Agenda, pendências e ordens em uma visão curta do dia.",
    metric: "4 agendados",
    rows: ["09:00 · Camila Souza", "11:30 · Mariana Lima", "14:30 · Juliana Alves"],
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: CalendarDays,
    title: "Disponibilidade sem adivinhação",
    description: "Horários, duração e profissional antes de confirmar.",
    metric: "2 horários livres",
    rows: ["09:00 · ocupado", "11:30 · ocupado", "14:30 · disponível"],
  },
  {
    id: "conversas",
    label: "Conversas",
    icon: MessageCircle,
    title: "Atendimento ligado ao trabalho",
    description: "Cada conversa mostra cliente, intenção e próximo passo.",
    metric: "3 em andamento",
    rows: ["Novo agendamento", "Reagendamento", "Acompanhamento de OS"],
  },
  {
    id: "ia",
    label: "IA",
    icon: Bot,
    title: "Uma secretária com regras claras",
    description: "Tom, instruções, limites e conhecimento configuráveis.",
    metric: "Assistente ativa",
    rows: ["Tom acolhedor", "Nunca inventar horários", "Confirmar antes de agendar"],
  },
] as const;

const FEATURES: Array<{
  title: string;
  description: string;
  result: string;
  icon: LucideIcon;
}> = [
  {
    title: "WhatsApp inteligente",
    description: "Entende o pedido e conduz o cliente até uma decisão.",
    result: "Menos conversa parada",
    icon: MessageCircle,
  },
  {
    title: "Agenda interna",
    description: "Controla horário, duração, equipe e disponibilidade.",
    result: "Sem choque de agenda",
    icon: CalendarCheck2,
  },
  {
    title: "Clientes organizados",
    description: "Contato e histórico continuam disponíveis depois do chat.",
    result: "Cadastro reaproveitável",
    icon: UsersRound,
  },
  {
    title: "Ordens de serviço",
    description: "O atendimento confirmado continua até a execução.",
    result: "Serviço com responsável",
    icon: ClipboardCheck,
  },
  {
    title: "Notificações úteis",
    description: "Mostra confirmações, atrasos e pendências importantes.",
    result: "Prioridade visível",
    icon: BellRing,
  },
  {
    title: "IA configurável",
    description: "Personalidade, regras, automações e base de conhecimento.",
    result: "Atendimento com padrão",
    icon: Bot,
  },
];

const COMPARISONS = [
  {
    action: "Responder",
    before: "Alguém para o trabalho e procura o que dizer.",
    after: "A IA entende o pedido e responde com contexto.",
  },
  {
    action: "Agendar",
    before: "O horário é conferido e digitado manualmente.",
    after: "A agenda é consultada antes da opção ser oferecida.",
  },
  {
    action: "Executar",
    before: "O serviço some do WhatsApp ou vai para uma planilha.",
    after: "O agendamento vira cliente e ordem de serviço.",
  },
] as const;

const FAQS = [
  {
    question: "Preciso baixar o sistema em uma loja de aplicativos?",
    answer:
      "Não. A {{assistant}} funciona no navegador e pode ser adicionada à tela inicial do celular como uma PWA.",
  },
  {
    question: "A {{assistant}} substitui o meu WhatsApp?",
    answer:
      "Ela organiza o atendimento conectado à operação. A configuração do canal define como as mensagens entram e são conduzidas.",
  },
  {
    question: "Posso usar a minha própria marca?",
    answer:
      "A experiência foi preparada para adaptar nome, cores e identidade visual conforme as permissões e a configuração do projeto.",
  },
  {
    question: "Qual agenda controla os horários?",
    answer:
      "A agenda interna é a fonte da operação. O Google Agenda pode acompanhar os compromissos quando a integração estiver configurada.",
  },
  {
    question: "Como eu testo antes de contratar?",
    answer:
      "A demonstração pública fica disponível para navegação. Quando houver período gratuito, ele aparece claramente no respectivo plano.",
  },
] as const;

export function CinematicLanding({
  plans = DEFAULT_PLANS,
  signupHref = "/entrar?modo=signup",
  demoHref = "/demo",
  loginHref = "/entrar",
  brandName = brand.name,
  assistantName = brand.assistantName,
  tagline = "Sua secretária inteligente",
  logoUrl = null,
  avatarUrl = null,
}: CinematicLandingProps) {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [dashIndex, setDashIndex] = useState(0);
  const [brandPreview, setBrandPreview] = useState("Studio Aurora");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const scenario = SCENARIOS[scenarioIndex];
  const dash = DASH_TABS[dashIndex];
  const DashIcon = dash.icon;
  const personalize = (text: string) =>
    personalizeAssistantText(text, assistantName).replaceAll("{{assistant}}", assistantName);
  const displayPlans = plans.map((plan) => ({
    ...plan,
    description: personalize(plan.description),
    features: plan.features.map(personalize),
  }));
  const faqItems = FAQS.map((item) => ({
    question: personalize(item.question),
    answer: personalize(item.answer),
  }));
  const hasTrial = displayPlans.some((plan) => (plan.trialDays ?? 0) > 0);

  return (
    <div className="cinematic-landing min-h-screen overflow-hidden bg-[#09060f] text-white">
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
        <nav
          aria-label="Navegação principal"
          className="mx-auto flex h-16 max-w-7xl items-center rounded-2xl border border-white/10 bg-[#100b19]/80 px-3.5 shadow-[0_18px_55px_-32px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:px-5"
        >
          <a
            href="#inicio"
            className="flex items-center gap-2.5"
            aria-label={`${brandName}, início`}
          >
            <LogoMark logoUrl={logoUrl} brandName={brandName} />
            <div>
              <div className="font-display text-base font-black leading-none tracking-[-.04em]">
                {brandName}
              </div>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-[.12em] text-violet-300">
                {tagline}
              </div>
            </div>
          </a>
          <div className="ml-auto hidden items-center gap-6 text-[13px] font-bold text-white/75 lg:flex">
            <a href="#como-funciona" className="transition hover:text-white">
              Como funciona
            </a>
            <a href="#demonstracao" className="transition hover:text-white">
              Demonstração
            </a>
            <a href="#tour" className="transition hover:text-white">
              Por dentro
            </a>
            <a href="#planos" className="transition hover:text-white">
              Planos
            </a>
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-7">
            <a
              href={loginHref}
              className="hidden h-10 items-center rounded-xl px-3 text-[13px] font-extrabold text-white/75 transition hover:bg-white/5 hover:text-white sm:inline-flex"
            >
              Entrar
            </a>
            <a
              href={signupHref}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[13px] font-black text-[#5b21b6] shadow-lg transition hover:-translate-y-0.5"
            >
              Começar grátis <ArrowRight className="size-3.5" />
            </a>
          </div>
        </nav>
      </header>

      <main>
        <section
          id="inicio"
          className="relative scroll-mt-24 overflow-hidden px-5 pb-14 pt-28 sm:pt-32"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_76%_32%,rgba(124,58,237,.34),transparent_30%),radial-gradient(circle_at_12%_20%,rgba(217,70,239,.12),transparent_28%),linear-gradient(180deg,#09060f_0%,#130a20_70%,#09060f_100%)]"
          />
          <div className="relative mx-auto grid min-h-[610px] max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-2">
            <div className="z-10 max-w-3xl text-center lg:text-left">
              <Eyebrow dark>
                <Sparkles className="size-3.5" /> O atendimento que continua depois da resposta
              </Eyebrow>
              <h1 className="mt-5 font-display text-[clamp(3.25rem,7vw,6.3rem)] font-black leading-[.91] tracking-[-.075em]">
                Atende no WhatsApp.
                <span className="mt-1 block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-white bg-clip-text text-transparent">
                  Organiza o resto.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-[17px] font-medium leading-8 text-white/75 sm:text-xl lg:mx-0">
                A {assistantName} entende o pedido, encontra um horário, salva o cliente e prepara a
                ordem de serviço. Uma conversa entra. Uma operação pronta sai.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <a
                  href={signupHref}
                  className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#c026d3] px-7 text-[15px] font-black text-white shadow-[0_24px_55px_-20px_rgba(147,51,234,.85)] transition hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(90deg, var(--brand), #c026d3)" }}
                >
                  Testar grátis{" "}
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </a>
                <a
                  href={demoHref}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/7 px-7 text-[15px] font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/12"
                >
                  <Play className="size-4 fill-white" /> Abrir demonstração
                </a>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] font-bold text-white/70 lg:justify-start">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-400" /> Demonstração pública
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-400" /> App instalável
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-400" /> Google Agenda
                </span>
              </div>
            </div>

            <div className="relative mx-auto h-[500px] w-full max-w-[540px] sm:h-[590px] lg:h-[640px]">
              <div
                aria-hidden
                className="absolute left-1/2 top-1/2 size-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/15 bg-[radial-gradient(circle,rgba(167,139,250,.22),rgba(88,28,135,.08)_52%,transparent_70%)] sm:size-[510px]"
              />
              <div
                aria-hidden
                className="cl-orbit absolute left-1/2 top-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-violet-300/25 sm:size-[570px]"
              />
              <img
                src={avatarUrl || fallbackAvatarUrl}
                alt={`${assistantName}, secretária virtual inteligente`}
                width={640}
                height={960}
                fetchPriority="high"
                decoding="async"
                className="cl-avatar absolute bottom-[-28px] left-1/2 z-10 h-[560px] max-w-none -translate-x-1/2 object-contain object-bottom drop-shadow-[0_35px_38px_rgba(0,0,0,.42)] sm:h-[670px] lg:h-[720px]"
              />
              <FloatingStatus
                className="left-0 top-[19%] sm:-left-[4%]"
                icon={<MessageCircle className="size-4 text-emerald-400" />}
                title="Novo pedido"
                text="Tem horário amanhã?"
              />
              <FloatingStatus
                className="right-0 top-[46%] sm:-right-[7%]"
                icon={<CalendarCheck2 className="size-4 text-violet-300" />}
                title="Horário confirmado"
                text="Amanhã · 14:30"
                delay="1.3s"
              />
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="scroll-mt-24 bg-white px-5 py-16 text-[#21152e] sm:py-20"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="O problema em uma frase"
              title="Responder não basta. O trabalho precisa continuar."
              description={`Sem conexão, o pedido fica preso na conversa. Com a ${assistantName}, cada resposta já prepara o próximo passo.`}
            />
            <div className="mt-9 grid gap-4 lg:grid-cols-2">
              <article className="rounded-[30px] border border-rose-100 bg-[#fffafb] p-5 sm:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-[12px] font-black uppercase tracking-[.12em] text-rose-600">
                    WhatsApp sozinho
                  </div>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-black text-rose-700">
                    Pendente
                  </span>
                </div>
                <div className="mt-6 rounded-2xl bg-[#f4eff6] p-4 text-[15px] font-bold text-[#493c51]">
                  “Tem horário amanhã depois das 14h?”
                </div>
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-dashed border-rose-200 bg-white p-4">
                  <Clock3 className="mt-0.5 size-5 shrink-0 text-rose-500" />
                  <div>
                    <div className="text-[15px] font-black text-rose-800">A conversa espera</div>
                    <p className="mt-1 text-[15px] font-medium leading-6 text-rose-700/70">
                      Alguém ainda precisa conferir agenda, responder e copiar os dados.
                    </p>
                  </div>
                </div>
              </article>

              <article className="cl-animated-border rounded-[30px] bg-[#1d102a] p-[1px] text-white shadow-[0_30px_70px_-50px_rgba(91,33,182,.9)]">
                <div className="h-full rounded-[29px] bg-[#1d102a] p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-[12px] font-black uppercase tracking-[.12em] text-violet-300">
                      Com a {assistantName}
                    </div>
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-black text-emerald-300">
                      Organizando
                    </span>
                  </div>
                  <div className="mt-6 grid gap-2.5">
                    {["Pedido entendido", "14:30 está livre", "Cliente pronto para confirmar"].map(
                      (item, index) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-2xl bg-white/7 p-4"
                        >
                          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-violet-500/20 text-[11px] font-black text-violet-200">
                            0{index + 1}
                          </div>
                          <span className="text-[15px] font-bold text-white/85">{item}</span>
                          {index === 2 && <Check className="ml-auto size-5 text-emerald-400" />}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          id="demonstracao"
          className="relative scroll-mt-24 overflow-hidden bg-[#140b20] px-5 py-16 sm:py-20"
        >
          <div
            aria-hidden
            className="absolute -left-40 top-1/2 size-96 -translate-y-1/2 rounded-full bg-violet-700/20 blur-3xl"
          />
          <div className="relative mx-auto max-w-7xl">
            <SectionHeading
              dark
              centered
              eyebrow="Simulação guiada · 20 segundos"
              title="Escolha um pedido. Veja o sistema trabalhar."
              description={`1. Escolha o pedido. 2. Veja a resposta. 3. Confira o que a ${assistantName} criou na operação.`}
            />
            <div className="mt-9 grid gap-4 lg:grid-cols-[.72fr_1.28fr]">
              <div className="grid content-start gap-2.5" aria-label="Cenários da demonstração">
                {SCENARIOS.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setScenarioIndex(index)}
                    aria-pressed={scenarioIndex === index}
                    className={`flex min-h-[78px] items-center gap-3 rounded-[22px] border p-4 text-left transition ${
                      scenarioIndex === index
                        ? "border-violet-300 bg-white text-[#251431] shadow-lg"
                        : "border-white/10 bg-white/5 text-white hover:bg-white/9"
                    }`}
                  >
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-2xl text-[13px] font-black ${
                        scenarioIndex === index
                          ? "bg-violet-600 text-white"
                          : "bg-white/8 text-white/75"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-[12px] font-black uppercase tracking-[.12em] opacity-80">
                        Cenário
                      </span>
                      <span className="mt-1 block text-[15px] font-black">{item.label}</span>
                    </span>
                    <ChevronRight className="ml-auto size-4 opacity-80" />
                  </button>
                ))}
                <p className="mt-2 rounded-2xl border border-white/8 bg-black/15 p-4 text-[13px] font-medium leading-6 text-white/70">
                  Conteúdo ilustrativo da demonstração. Os dados reais dependem da configuração da
                  sua operação.
                </p>
              </div>

              <div
                key={scenario.id}
                className="cl-panel-enter grid overflow-hidden rounded-[30px] border border-white/10 bg-white/6 p-4 sm:grid-cols-[1fr_.9fr] sm:p-5"
              >
                <div className="rounded-[24px] bg-[#09150f] p-5 sm:p-6">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="grid size-11 place-items-center rounded-full bg-emerald-500 text-white">
                      <MessageCircle className="size-5" />
                    </div>
                    <div>
                      <div className="text-[15px] font-black">Cliente no WhatsApp</div>
                      <div className="mt-0.5 text-[12px] font-bold text-emerald-400">
                        online agora
                      </div>
                    </div>
                  </div>
                  <div className="cl-message mt-7 max-w-[88%] rounded-[18px_18px_18px_5px] bg-white/10 p-4 text-[15px] font-medium leading-6 text-white/85">
                    {scenario.question}
                  </div>
                  <div className="cl-message ml-auto mt-4 max-w-[90%] rounded-[18px_18px_5px_18px] bg-gradient-to-r from-violet-600 to-fuchsia-600 p-4 text-[15px] font-bold leading-6 shadow-lg [animation-delay:180ms]">
                    {scenario.answer}
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-[12px] font-bold text-violet-200">
                    <Sparkles className="size-4" /> A {assistantName} consultou a operação antes de
                    responder
                  </div>
                </div>
                <div className="mt-3 rounded-[24px] bg-white p-5 text-[#251431] sm:ml-3 sm:mt-0 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-[11px] font-black uppercase tracking-[.13em] text-violet-600">
                      Resultado em tempo real
                    </div>
                    <RefreshCw className="size-4 text-violet-500" />
                  </div>
                  <h3 className="mt-5 text-2xl font-black leading-tight tracking-[-.035em]">
                    {scenario.result}
                  </h3>
                  <div className="mt-6 space-y-2.5">
                    {scenario.steps.map((step, index) => (
                      <div
                        key={step}
                        className="cl-check flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-3.5"
                        style={{ animationDelay: `${250 + index * 120}ms` }}
                      >
                        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                          <Check className="size-4" />
                        </div>
                        <span className="text-[15px] font-black">{step}</span>
                        <span className="ml-auto text-[11px] font-black text-violet-400">
                          0{index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                  <a
                    href={demoHref}
                    className="mt-6 inline-flex items-center gap-2 text-[14px] font-black text-violet-700 hover:text-violet-900"
                  >
                    Abrir a demo completa <ArrowRight className="size-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tour" className="scroll-mt-24 bg-[#f7f4fb] px-5 py-16 text-[#21152e] sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-end gap-6 lg:grid-cols-[1fr_.8fr]">
              <SectionHeading
                eyebrow="Por dentro do sistema"
                title="Uma tela simples para saber o que fazer."
                description="Nada de painel cheio de números sem sentido. As áreas seguem a rotina: atender, agendar, executar e acompanhar."
              />
              <div
                className="flex flex-wrap gap-2 lg:justify-end"
                aria-label="Áreas da demonstração"
              >
                {DASH_TABS.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDashIndex(index)}
                      aria-pressed={dashIndex === index}
                      className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-black transition ${
                        dashIndex === index
                          ? "border-violet-700 bg-violet-700 text-white"
                          : "border-violet-100 bg-white text-[#61536b] hover:border-violet-300"
                      }`}
                    >
                      <Icon className="size-4" /> {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-9 overflow-hidden rounded-[32px] border border-violet-100 bg-white shadow-[0_30px_75px_-52px_rgba(76,29,149,.7)]">
              <div className="grid min-h-[420px] lg:grid-cols-[220px_1fr]">
                <aside className="hidden border-r border-violet-100 bg-[#1b1027] p-4 text-white lg:block">
                  <div className="flex items-center gap-2 border-b border-white/10 px-2 pb-4">
                    <LogoMark compact logoUrl={logoUrl} brandName={brandName} />
                    <span className="text-[15px] font-black">{brandName}</span>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    {DASH_TABS.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDashIndex(index)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-bold transition ${
                            dashIndex === index
                              ? "bg-violet-600 text-white"
                              : "text-white/70 hover:bg-white/6"
                          }`}
                        >
                          <Icon className="size-4" /> {item.label}
                        </button>
                      );
                    })}
                  </div>
                </aside>
                <div key={dash.id} className="cl-panel-enter bg-[#fbfaff] p-5 sm:p-8 lg:p-10">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[.13em] text-violet-600">
                        Visão simples
                      </div>
                      <h3 className="mt-2 text-3xl font-black leading-tight tracking-[-.045em] sm:text-4xl">
                        {dash.title}
                      </h3>
                      <p className="mt-3 max-w-2xl text-[15px] font-medium leading-7 text-[#6b5d74]">
                        {dash.description}
                      </p>
                    </div>
                    <div className="flex w-fit items-center gap-2 rounded-2xl bg-violet-100 px-4 py-3 text-[14px] font-black text-violet-800">
                      <DashIcon className="size-5" /> {personalize(dash.metric)}
                    </div>
                  </div>
                  <div className="mt-8 grid gap-3 lg:grid-cols-[1.2fr_.8fr]">
                    <div className="rounded-[24px] border border-violet-100 bg-white p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3 pb-4">
                        <span className="text-[14px] font-black">Próximos passos</span>
                        <span className="text-[11px] font-black uppercase tracking-[.1em] text-emerald-600">
                          Atualizado
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {dash.rows.map((row, index) => (
                          <div
                            key={row}
                            className="flex items-center gap-3 rounded-2xl bg-[#f7f3fb] p-3.5"
                          >
                            <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-[11px] font-black text-violet-700 shadow-sm">
                              0{index + 1}
                            </div>
                            <span className="text-[14px] font-bold text-[#46374f]">{row}</span>
                            <ChevronRight className="ml-auto size-4 text-violet-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[24px] bg-[#21132f] p-5 text-white">
                      <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[.12em] text-violet-300">
                        <Sparkles className="size-4" /> Dica da {assistantName}
                      </div>
                      <p className="mt-5 text-xl font-black leading-7">
                        Comece pelo que pede atenção hoje.
                      </p>
                      <p className="mt-3 text-[15px] font-medium leading-6 text-white/70">
                        A interface mostra o próximo passo sem exigir que a equipe aprenda um
                        sistema complexo.
                      </p>
                      <a
                        href={demoHref}
                        className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-black text-violet-800"
                      >
                        Navegar na demo <ArrowRight className="size-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="scroll-mt-24 bg-white px-5 py-16 text-[#21152e] sm:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              centered
              eyebrow="O necessário para operar"
              title="Seis peças. Um único fluxo."
              description="Cada recurso resolve uma parte concreta do atendimento. Juntos, eles evitam retrabalho e informação perdida."
            />
            <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className={`group rounded-[26px] border p-5 transition hover:-translate-y-1 hover:shadow-[0_24px_55px_-40px_rgba(91,33,182,.65)] ${index === 0 || index === 5 ? "border-violet-200 bg-violet-50/65" : "border-[#ece5f3] bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid size-11 place-items-center rounded-2xl bg-[#241337] text-violet-200 transition group-hover:bg-violet-700 group-hover:text-white">
                        <Icon className="size-5" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-[.12em] text-violet-500">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-black tracking-[-.035em]">{feature.title}</h3>
                    <p className="mt-2 text-[15px] font-medium leading-6 text-[#6b5b75]">
                      {feature.description}
                    </p>
                    <div className="mt-5 flex items-center gap-2 text-[13px] font-black text-violet-700">
                      <Check className="size-4 text-emerald-600" /> {feature.result}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="comparacao" className="scroll-mt-24 bg-[#100918] px-5 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              dark
              centered
              eyebrow="Antes e depois"
              title="A diferença aparece no próximo passo."
              description="Em vez de comparar termos técnicos, compare o que a equipe ainda precisa fazer depois de cada conversa."
            />
            <div className="mt-9 grid gap-3 lg:grid-cols-3">
              {COMPARISONS.map((item, index) => (
                <article
                  key={item.action}
                  className="overflow-hidden rounded-[26px] border border-white/10 bg-white/5"
                >
                  <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                    <span className="grid size-8 place-items-center rounded-xl bg-violet-500/20 text-[11px] font-black text-violet-200">
                      0{index + 1}
                    </span>
                    <h3 className="text-[17px] font-black">{item.action}</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div className="border-b border-white/10 p-5 sm:border-b-0 sm:border-r lg:border-b lg:border-r-0 xl:border-b-0 xl:border-r">
                      <div className="text-[12px] font-black uppercase tracking-[.12em] text-rose-300">
                        Sem {assistantName}
                      </div>
                      <p className="mt-3 text-[15px] font-medium leading-6 text-white/70">
                        {item.before}
                      </p>
                    </div>
                    <div className="bg-violet-500/8 p-5">
                      <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[.12em] text-emerald-300">
                        <Check className="size-3.5" /> Com {assistantName}
                      </div>
                      <p className="mt-3 text-[15px] font-bold leading-6 text-white/85">
                        {item.after}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="app" className="scroll-mt-24 bg-[#f6f1fb] px-5 py-16 text-[#21152e] sm:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[.86fr_1.14fr]">
            <div>
              <Eyebrow>Agenda por dentro. App por fora.</Eyebrow>
              <h2 className="mt-4 max-w-2xl font-display text-[clamp(2.35rem,5vw,4.25rem)] font-black leading-[.98] tracking-[-.06em]">
                No computador da equipe.
                <span className="mt-1 block text-violet-700">Na tela inicial do celular.</span>
              </h2>
              <p className="mt-5 max-w-xl text-[16px] font-medium leading-7 text-[#685873]">
                A agenda interna controla a operação. O Google Agenda acompanha. A PWA abre como um
                aplicativo, sem depender de loja.
              </p>
              <div className="mt-6 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {[
                  ["1", "Agenda interna", "Fonte oficial"],
                  ["2", "Google Agenda", "Sincronizado"],
                  ["3", "PWA", "Instalável"],
                ].map(([number, title, status]) => (
                  <div key={title} className="rounded-2xl border border-violet-100 bg-white p-4">
                    <div className="text-[11px] font-black uppercase tracking-[.1em] text-violet-500">
                      Etapa {number}
                    </div>
                    <div className="mt-2 text-[15px] font-black">{title}</div>
                    <div className="mt-1 text-[12px] font-bold text-emerald-600">{status}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_.62fr]">
              <div className="cl-animated-border rounded-[30px] bg-white p-[1px] shadow-[0_30px_75px_-48px_rgba(91,33,182,.7)]">
                <div className="h-full rounded-[29px] bg-white p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[.12em] text-violet-600">
                        Agenda de amanhã
                      </div>
                      <div className="mt-1 text-xl font-black">Tudo no lugar</div>
                    </div>
                    <CalendarCheck2 className="size-6 text-violet-600" />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {["09:00", "11:30", "14:30"].map((time, index) => (
                      <div
                        key={time}
                        className={`rounded-2xl p-3 text-center ${index === 2 ? "bg-emerald-50 text-emerald-800" : "bg-violet-50 text-violet-800"}`}
                      >
                        <Clock3 className="mx-auto size-4" />
                        <div className="mt-2 text-[13px] font-black">{time}</div>
                        <div className="mt-1 text-[11px] font-bold opacity-80">
                          {index === 2 ? "livre" : "ocupado"}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#21132f] p-4 text-white">
                    <RefreshCw className="size-4 text-violet-300" />
                    <span className="text-[13px] font-bold">Google Agenda sincronizado</span>
                    <Check className="ml-auto size-4 text-emerald-400" />
                  </div>
                </div>
              </div>
              <div className="flex min-h-[320px] flex-col rounded-[30px] bg-[#21132f] p-5 text-white shadow-[0_30px_75px_-48px_rgba(0,0,0,.85)]">
                <div className="mx-auto mt-1 w-full max-w-[190px] rounded-[26px] border border-white/10 bg-[#0f0a16] p-3 shadow-inner">
                  <div className="mx-auto h-1.5 w-12 rounded-full bg-white/15" />
                  <div className="mt-4 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-4">
                    <LogoMark compact logoUrl={logoUrl} brandName={brandName} />
                    <div className="mt-7 text-[15px] font-black">{brandName}</div>
                    <div className="mt-1 text-[11px] font-bold text-white/70">Sua operação</div>
                  </div>
                </div>
                <div className="mt-auto pt-5 text-center">
                  <Download className="mx-auto size-5 text-violet-300" />
                  <div className="mt-2 text-[14px] font-black">Adicionar à tela inicial</div>
                  <div className="mt-1 text-[12px] font-medium text-white/70">
                    Sem loja de aplicativos
                  </div>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event("marcia:request-install"))}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-3 text-[12px] font-black text-violet-800 transition hover:-translate-y-0.5"
                  >
                    <Download className="size-4" /> Testar instalação
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="white-label"
          className="scroll-mt-24 bg-white px-5 py-16 text-[#21152e] sm:py-20"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-4 lg:grid-cols-[1.06fr_.94fr]">
              <article className="flex flex-col overflow-hidden rounded-[32px] bg-[#21132f] p-6 text-white sm:p-8">
                <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[.12em] text-violet-300">
                  <Palette className="size-4" /> White-label
                </div>
                <h2 className="mt-4 max-w-xl font-display text-[clamp(2.2rem,4.4vw,3.7rem)] font-black leading-[1] tracking-[-.055em]">
                  A tecnologia fica. A marca muda.
                </h2>
                <p className="mt-4 max-w-xl text-[15px] font-medium leading-7 text-white/72">
                  Nome, cores e experiência preparados para adaptar o sistema ao negócio do seu
                  cliente.
                </p>
                <label
                  className="mt-7 block text-[12px] font-black uppercase tracking-[.12em] text-violet-300"
                  htmlFor="brand-preview"
                >
                  Teste um nome
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="brand-preview"
                    value={brandPreview}
                    onChange={(event) => setBrandPreview(event.target.value)}
                    maxLength={28}
                    className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/8 px-4 text-[15px] font-bold text-white outline-none placeholder:text-white/35 focus:border-violet-300"
                    placeholder="Nome da empresa"
                  />
                  <span className="inline-flex h-12 items-center justify-center rounded-xl bg-violet-600 px-4 text-[13px] font-black">
                    Visualização ao vivo
                  </span>
                </div>
                <div className="mt-6 rounded-[24px] bg-white p-5 text-[#21152e]">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white">
                      <WandSparkles className="size-5" />
                    </div>
                    <div>
                      <div className="text-[17px] font-black">
                        {brandPreview.trim() || "Sua marca"}
                      </div>
                      <div className="mt-0.5 text-[12px] font-bold text-violet-600">
                        Atendimento inteligente
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <span className="h-2 flex-1 rounded-full bg-violet-600" />
                    <span className="h-2 w-10 rounded-full bg-fuchsia-400" />
                    <span className="h-2 w-6 rounded-full bg-emerald-400" />
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2 lg:mt-auto lg:pt-6">
                  {["Nome e logo", "Cores", "Experiência"].map((item, index) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/7 p-3">
                      <div className="text-[11px] font-black uppercase tracking-[.1em] text-violet-300">
                        0{index + 1}
                      </div>
                      <div className="mt-1.5 text-[13px] font-black text-white">{item}</div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[32px] border border-violet-100 bg-[#f9f6fc] p-6 sm:p-8">
                <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[.12em] text-violet-700">
                  <Eye className="size-4" /> Prova que você pode conferir
                </div>
                <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.15rem)] font-black leading-[1.03] tracking-[-.05em]">
                  Não pedimos que você acredite em uma imagem bonita.
                </h2>
                <p className="mt-4 text-[15px] font-medium leading-7 text-[#6b5b75]">
                  A demonstração é pública, navegável e mostra as áreas principais sem criar dados
                  ou depoimentos falsos.
                </p>
                <div className="mt-6 grid gap-2.5">
                  {[
                    ["11 áreas navegáveis", "Agenda, conversas, clientes, OS, IA e mais"],
                    ["3 fluxos demonstráveis", "Agendar, reagendar e acompanhar serviço"],
                    ["Desktop e celular", "Interface responsiva e app instalável"],
                  ].map(([title, text], index) => (
                    <div key={title} className="flex items-start gap-3 rounded-2xl bg-white p-4">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                        <BadgeCheck className="size-5" />
                      </div>
                      <div>
                        <div className="text-[15px] font-black">{title}</div>
                        <div className="mt-1 text-[13px] font-medium leading-5 text-[#76677f]">
                          {text}
                        </div>
                      </div>
                      <span className="ml-auto text-[11px] font-black text-violet-400">
                        0{index + 1}
                      </span>
                    </div>
                  ))}
                </div>
                <a
                  href={demoHref}
                  className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#21132f] px-5 text-[14px] font-black text-white transition hover:-translate-y-0.5"
                >
                  Conferir por conta própria <ArrowRight className="size-4" />
                </a>
              </article>
            </div>
          </div>
        </section>

        <section
          id="planos"
          className="scroll-mt-24 bg-[#f7f3fb] px-5 py-16 text-[#21152e] sm:py-20"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              centered
              eyebrow="Oferta completa"
              title="Tudo para atender, agendar e executar."
              description="Todos os planos começam pela mesma operação conectada. O que muda é a capacidade, o tamanho da equipe e as integrações."
            />
            <div className="mx-auto mt-8 grid max-w-5xl gap-2.5 sm:grid-cols-3">
              {[
                [MessageCircle, "Atendimento", "WhatsApp + IA"],
                [CalendarDays, "Organização", "Agenda + clientes"],
                [ClipboardCheck, "Execução", "OS + notificações"],
              ].map(([Icon, title, text]) => {
                const ValueIcon = Icon as LucideIcon;
                return (
                  <div
                    key={title as string}
                    className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white p-4"
                  >
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
                      <ValueIcon className="size-5" />
                    </div>
                    <div>
                      <div className="text-[14px] font-black">{title as string}</div>
                      <div className="mt-0.5 text-[12px] font-bold text-[#76677f]">
                        {text as string}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-9 grid gap-4 lg:grid-cols-3">
              {displayPlans.map((plan) => (
                <article
                  key={plan.slug}
                  className={`relative flex flex-col rounded-[28px] border p-6 ${
                    plan.featured
                      ? "border-violet-500 bg-[#21132f] text-white shadow-[0_32px_70px_-38px_rgba(91,33,182,.85)] lg:-translate-y-2"
                      : "border-violet-100 bg-white"
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-1.5 text-[11px] font-black uppercase tracking-[.1em] text-white">
                      {plan.badge || "Mais escolhido"}
                    </div>
                  )}
                  <div
                    className={`text-[12px] font-black uppercase tracking-[.12em] ${plan.featured ? "text-violet-300" : "text-violet-700"}`}
                  >
                    {plan.name}
                  </div>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="mb-1 text-[14px] font-black">R$</span>
                    <span className="font-display text-5xl font-black tracking-[-.06em]">
                      {plan.price}
                    </span>
                    <span
                      className={`mb-1 text-[12px] font-bold ${plan.featured ? "text-white/70" : "text-[#776984]"}`}
                    >
                      /mês
                    </span>
                  </div>
                  <p
                    className={`mt-4 min-h-12 text-[15px] font-medium leading-6 ${plan.featured ? "text-white/75" : "text-[#695a72]"}`}
                  >
                    {plan.description}
                  </p>
                  <div className={`my-5 h-px ${plan.featured ? "bg-white/10" : "bg-violet-100"}`} />
                  <div className="flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2.5 text-[15px] font-bold leading-5"
                      >
                        <div
                          className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${plan.featured ? "bg-emerald-400/15 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}
                        >
                          <Check className="size-3" />
                        </div>
                        {feature}
                      </div>
                    ))}
                  </div>
                  <a
                    href={`${signupHref}${signupHref.includes("?") ? "&" : "?"}plano=${encodeURIComponent(plan.slug)}`}
                    className={`mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl text-[14px] font-black transition hover:-translate-y-0.5 ${plan.featured ? "bg-white text-violet-800" : "bg-violet-700 text-white"}`}
                  >
                    {(plan.trialDays ?? 0) > 0
                      ? `Testar ${plan.trialDays} dias grátis`
                      : "Escolher plano"}
                    <ArrowRight className="size-4" />
                  </a>
                </article>
              ))}
            </div>

            <div className="mt-7 grid gap-3 rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 sm:p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-600 text-white">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <div className="text-[17px] font-black text-emerald-950">
                  Teste antes de decidir.
                </div>
                <p className="mt-1 text-[15px] font-medium leading-6 text-emerald-900/75">
                  {hasTrial
                    ? "Abra a demo pública e use o período gratuito indicado no plano. Você entende a operação antes de assumir uma assinatura."
                    : "Abra a demonstração pública, confira o que está incluído e só avance quando fizer sentido para sua operação."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[12px] font-black text-emerald-800 lg:justify-end">
                <span className="rounded-full bg-white px-3 py-2">Período indicado no plano</span>
                <span className="rounded-full bg-white px-3 py-2">Demo aberta</span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="relative scroll-mt-24 overflow-hidden bg-[#0c0712] px-5 py-16 sm:py-20"
        >
          <div
            aria-hidden
            className="absolute left-1/2 top-0 h-64 w-[720px] -translate-x-1/2 rounded-full bg-violet-700/25 blur-3xl"
          />
          <div className="relative mx-auto max-w-5xl text-center">
            <Eyebrow dark>
              <Gauge className="size-3.5" /> Próximo passo
            </Eyebrow>
            <h2 className="mx-auto mt-5 max-w-4xl font-display text-[clamp(2.4rem,5.3vw,4.8rem)] font-black leading-[.98] tracking-[-.065em]">
              Veja funcionando. Depois decida.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[16px] font-medium leading-7 text-white/72">
              Comece pela demonstração ou crie seu acesso gratuito. Em poucos minutos, você entende
              como uma mensagem vira agenda, cliente e ordem de serviço.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={signupHref}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-white px-7 text-[15px] font-black text-violet-800 transition hover:-translate-y-0.5"
              >
                Começar grátis <ArrowRight className="size-4" />
              </a>
              <a
                href={demoHref}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/6 px-7 text-[15px] font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                <Play className="size-4 fill-white" /> Navegar na demo
              </a>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-[12px] font-bold text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="size-4 text-emerald-400" /> Produto demonstrável
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="size-4 text-violet-300" /> Funciona no celular
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Workflow className="size-4 text-fuchsia-300" /> Fluxo completo
              </span>
            </div>

            <div className="mt-12 border-t border-white/10 pt-10 text-left">
              <div className="grid gap-6 lg:grid-cols-[.62fr_1.38fr]">
                <div>
                  <div className="text-[12px] font-black uppercase tracking-[.13em] text-violet-300">
                    Dúvidas rápidas
                  </div>
                  <h3 className="mt-3 text-2xl font-black leading-tight tracking-[-.035em] sm:text-3xl">
                    O essencial antes de começar.
                  </h3>
                  <p className="mt-3 text-[15px] font-medium leading-6 text-white/70">
                    Respostas diretas, sem esconder condições em texto pequeno.
                  </p>
                </div>
                <div className="space-y-2">
                  {faqItems.map((item, index) => {
                    const isOpen = faqOpen === index;
                    const triggerId = `cinematic-faq-trigger-${index}`;
                    const panelId = `cinematic-faq-panel-${index}`;
                    return (
                      <div
                        key={item.question}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                      >
                        <button
                          id={triggerId}
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => setFaqOpen(isOpen ? null : index)}
                          className="flex w-full items-center gap-4 px-4 py-4 text-left text-[15px] font-black text-white sm:px-5"
                        >
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-500/20 text-[11px] text-violet-200">
                            0{index + 1}
                          </span>
                          <span>{item.question}</span>
                          <ChevronDown
                            className={`ml-auto size-4 shrink-0 text-violet-300 transition ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isOpen && (
                          <div
                            id={panelId}
                            role="region"
                            aria-labelledby={triggerId}
                            className="border-t border-white/8 px-4 py-4 pl-[3.75rem] text-[15px] font-medium leading-6 text-white/70 sm:px-5 sm:pl-[4.25rem]"
                          >
                            {item.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 bg-[#09060f] px-5 py-8 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark logoUrl={logoUrl} brandName={brandName} />
            <div>
              <div className="text-[15px] font-black">{brandName}</div>
              <div className="mt-0.5 text-[12px] font-medium text-white/70">
                WhatsApp, agenda e serviços conectados.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-bold text-white/70">
            <a href="#como-funciona" className="hover:text-white">
              Como funciona
            </a>
            <a href={demoHref} className="hover:text-white">
              Demonstração
            </a>
            <a href="#planos" className="hover:text-white">
              Planos
            </a>
            <a href="#faq" className="hover:text-white">
              Dúvidas
            </a>
            <a href={loginHref} className="hover:text-white">
              Entrar
            </a>
            <a href="/termos" className="hover:text-white">
              Termos
            </a>
            <a href="/privacidade" className="hover:text-white">
              Privacidade
            </a>
            <a href="/reembolso" className="hover:text-white">
              Reembolso
            </a>
          </div>
        </div>
      </footer>

      <CinematicStyles />
    </div>
  );
}

function LogoMark({
  compact = false,
  logoUrl,
  brandName = brand.name,
}: {
  compact?: boolean;
  logoUrl?: string | null;
  brandName?: string;
}) {
  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 font-display font-black italic text-white shadow-lg ${compact ? "size-9 text-sm" : "size-10 text-base"}`}
      style={{ background: "linear-gradient(135deg, var(--brand), #d946ef)" }}
    >
      {brandName.trim().charAt(0).toUpperCase() || "M"}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className="absolute inset-0 size-full bg-white object-contain"
          onError={(event) => event.currentTarget.remove()}
        />
      ) : (
        <Sparkles className="absolute -right-1 -top-1 size-3 text-violet-200" />
      )}
    </div>
  );
}

function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-[.14em] ${dark ? "text-violet-300" : "text-violet-700"}`}
    >
      {children}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  dark = false,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  dark?: boolean;
  centered?: boolean;
}) {
  return (
    <div className={`${centered ? "mx-auto max-w-4xl text-center" : "max-w-4xl"}`}>
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      <h2
        className={`mt-4 font-display text-[clamp(2.25rem,4.8vw,4.15rem)] font-black leading-[1] tracking-[-.06em] ${dark ? "text-white" : "text-[#21152e]"}`}
      >
        {title}
      </h2>
      <p
        className={`mt-5 max-w-2xl text-[16px] font-medium leading-7 ${centered ? "mx-auto" : ""} ${dark ? "text-white/70" : "text-[#685873]"}`}
      >
        {description}
      </p>
    </div>
  );
}

function FloatingStatus({
  className,
  icon,
  title,
  text,
  delay = "0s",
}: {
  className: string;
  icon: ReactNode;
  title: string;
  text: string;
  delay?: string;
}) {
  return (
    <div
      className={`cl-float absolute z-20 min-w-[190px] rounded-2xl border border-white/12 bg-[#171021]/88 p-3 shadow-[0_18px_45px_-25px_rgba(0,0,0,.9)] backdrop-blur-xl ${className}`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-2.5">
        <div className="grid size-9 place-items-center rounded-xl bg-white/8">{icon}</div>
        <div>
          <div className="text-[12px] font-black text-white">{title}</div>
          <div className="mt-0.5 text-[11px] font-medium text-white/70">{text}</div>
        </div>
      </div>
    </div>
  );
}

function CinematicStyles() {
  return (
    <style>{`
      .cinematic-landing {
        color-scheme: dark;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }

      .cinematic-landing * {
        box-sizing: border-box;
      }

      .cinematic-landing .bg-violet-700,
      .cinematic-landing .bg-violet-600 { background-color: var(--brand) !important; }
      .cinematic-landing .text-violet-700,
      .cinematic-landing .text-violet-600 { color: var(--brand) !important; }
      .cinematic-landing .border-violet-500 { border-color: var(--brand) !important; }
      .cinematic-landing .from-violet-700,
      .cinematic-landing .from-violet-600 { --tw-gradient-from: var(--brand) !important; }

      .cl-animated-border {
        position: relative;
        isolation: isolate;
        overflow: hidden;
      }

      .cl-animated-border::before {
        position: absolute;
        inset: -45%;
        z-index: -1;
        content: "";
        background: conic-gradient(from 90deg, transparent 0 28%, #8b5cf6 38%, #d946ef 48%, #34d399 56%, transparent 66% 100%);
        animation: cl-spin 9s linear infinite;
      }

      .cl-orbit {
        animation: cl-spin 32s linear infinite;
      }

      .cl-avatar {
        animation: cl-avatar 6s ease-in-out infinite;
      }

      .cl-float {
        animation: cl-float 5s ease-in-out infinite;
      }

      .cl-panel-enter {
        animation: cl-enter .48s cubic-bezier(.22,1,.36,1) both;
      }

      .cl-message {
        animation: cl-message .45s cubic-bezier(.22,1,.36,1) both;
      }

      .cl-check {
        animation: cl-check .42s cubic-bezier(.22,1,.36,1) both;
      }

      @keyframes cl-spin {
        to { transform: rotate(360deg); }
      }

      @keyframes cl-avatar {
        0%, 100% { transform: translateX(-50%) translateY(0); }
        50% { transform: translateX(-50%) translateY(-9px); }
      }

      @keyframes cl-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-7px); }
      }

      @keyframes cl-enter {
        from { opacity: 0; transform: translateY(12px) scale(.992); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @keyframes cl-message {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes cl-check {
        from { opacity: 0; transform: translateX(8px); }
        to { opacity: 1; transform: translateX(0); }
      }

      @media (max-width: 640px) {
        .cl-float {
          min-width: 160px;
          transform: scale(.88);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .cinematic-landing *,
        .cinematic-landing *::before,
        .cinematic-landing *::after {
          scroll-behavior: auto !important;
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .01ms !important;
        }
      }
    `}</style>
  );
}
