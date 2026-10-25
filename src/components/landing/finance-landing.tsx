import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock,
  CreditCard,
  FileText,
  Home,
  ListChecks,
  Lock,
  MessageCircle,
  Mic,
  PieChart,
  Play,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
  Zap,
  type LucideIcon,
} from "lucide-react";
import fallbackAvatarUrl from "@/assets/marcia-avatar-640.png";
import {
  brand,
  legalProfile,
  personalizeAssistantText,
  supportConfigured,
  supportWhatsappDisplay,
  supportWhatsappUrl,
} from "@/config/brand";

export type FinancePlan = {
  slug: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  trialDays?: number;
  featured?: boolean;
  badge?: string;
};

type Props = {
  plans?: FinancePlan[];
  /** Usado somente nos cards de plano (acrescenta ?plano=slug). */
  signupHref?: string;
  /** CTAs genéricos de teste/cadastro: sem plano escolhido, levam aos planos. */
  plansHref?: string;
  demoHref?: string;
  loginHref?: string;
  brandName?: string;
  assistantName?: string;
  tagline?: string;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  legalName?: string;
  legalDocument?: string;
  contactEmail?: string;
  contactAddress?: string;
};

const FALLBACK_PLANS: FinancePlan[] = [
  {
    slug: "starter",
    name: "Basic",
    price: "49",
    description: "O essencial para organizar o mês sem planilha.",
    features: [
      "Dashboard financeiro",
      "Comandos por voz e texto",
      "Contas e cartões",
      "Calendário e lembretes",
      "Orçamentos básicos",
      "Aplicativo instalável",
    ],
    trialDays: 3,
  },
  {
    slug: "pro",
    name: "Pro",
    price: "69",
    description: "Para conversar com seu financeiro e automatizar a rotina.",
    features: [
      "Tudo do Basic",
      "WhatsApp financeiro",
      "Metas e recorrências",
      "Relatórios inteligentes",
      "Mais comandos com IA",
      "Lembretes avançados",
    ],
    trialDays: 3,
    featured: true,
  },
];

const FAQS = [
  [
    "Preciso entender de finanças?",
    "Não. Você fala como falaria com uma pessoa. A assistente organiza, pergunta o que faltar e mostra o resultado em palavras simples.",
  ],
  [
    "Ela registra algo sem eu conferir?",
    "Não. Quando faltar uma informação, a assistente pergunta. Antes de concluir uma ação sensível, ela mostra o que entendeu para você confirmar.",
  ],
  [
    "Como funcionam os lembretes?",
    "Você informa uma conta futura por voz ou texto. Ela entra no calendário financeiro e aparece nos avisos antes do vencimento.",
  ],
  [
    "Como funciona no WhatsApp?",
    "No plano Pro, você conecta o canal configurado para a assistente e vincula seu celular. Só números autorizados acessam sua conta.",
  ],
  [
    "Consigo usar sem WhatsApp?",
    "Sim. Voz, texto e envio de comprovantes funcionam diretamente no aplicativo. O WhatsApp é um canal adicional do plano Pro.",
  ],
  [
    "Posso instalar no celular?",
    "Sim. O sistema abre pelo navegador e pode ser instalado na tela inicial como aplicativo.",
  ],
  [
    "Ela conecta automaticamente com meu banco?",
    "Não nesta versão. Você organiza contas, cartões e saldos manualmente, sem entregar acesso bancário e sem pagar por uma conexão externa.",
  ],
  [
    "A MárcIA movimenta meu dinheiro?",
    "Não. Ela organiza informações, prepara registros, mostra alertas e ajuda a interpretar o mês. Pagamentos e transferências continuam sempre com você.",
  ],
  [
    "Posso mandar foto de comprovante?",
    "Sim. Envie uma imagem legível pelo aplicativo. A MárcIA identifica os dados disponíveis e pergunta o que faltar antes de registrar.",
  ],
];

const WORKFLOW_STEPS = [
  "Ouvindo sua mensagem",
  "Entendendo valor e categoria",
  "Completando o que faltou",
  "Atualizando seu painel",
] as const;

const PAIN_POINTS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: ReceiptText,
    title: "Você lembra que gastou, mas não registra",
    text: "No fim do mês, pequenos gastos viram uma diferença que ninguém consegue explicar.",
  },
  {
    icon: CalendarDays,
    title: "As próximas contas ficam espalhadas",
    text: "Vencimentos moram na memória, no e-mail, no boleto e em várias conversas.",
  },
  {
    icon: CreditCard,
    title: "A fatura surpreende quando já fechou",
    text: "Você descobre tarde quanto comprometeu e onde o dinheiro foi embora.",
  },
  {
    icon: FileText,
    title: "Planilhas e formulários cansam",
    text: "O controle é abandonado porque dá mais trabalho alimentar o sistema do que viver a rotina.",
  },
];

const DAILY_MOMENTS: Array<{
  icon: LucideIcon;
  number: string;
  title: string;
  example: string;
  result: string;
}> = [
  {
    icon: Mic,
    number: "01",
    title: "Gastou? Só conte.",
    example: "“Paguei R$ 84,90 no mercado pelo Pix.”",
    result: "A despesa entra na categoria certa e atualiza o mês.",
  },
  {
    icon: CalendarDays,
    number: "02",
    title: "Tem conta futura? Avise.",
    example: "“A internet vence todo dia 12 e custa R$ 120.”",
    result: "A conta vai para o calendário e vira lembrete.",
  },
  {
    icon: MessageCircle,
    number: "03",
    title: "Quer decidir? Pergunte.",
    example: "“Ainda posso gastar R$ 300 com lazer este mês?”",
    result: "A resposta usa seu saldo, seu ritmo e seus limites.",
  },
];

const FINANCE_FEATURES: Array<{
  icon: LucideIcon;
  title: string;
  text: string;
  tag: string;
}> = [
  {
    icon: BarChart3,
    title: "Visão do mês",
    text: "Saldo, entradas, saídas e comparação com o período anterior.",
    tag: "Entender",
  },
  {
    icon: ReceiptText,
    title: "Movimentações",
    text: "Histórico organizado e pesquisável do que entrou e saiu.",
    tag: "Consultar",
  },
  {
    icon: CalendarDays,
    title: "Calendário financeiro",
    text: "Contas futuras, recebimentos e vencimentos em ordem.",
    tag: "Planejar",
  },
  {
    icon: Bell,
    title: "Lembretes",
    text: "Avisos antes das datas importantes para nada vencer no susto.",
    tag: "Lembrar",
  },
  {
    icon: WalletCards,
    title: "Contas e cartões",
    text: "Saldos manuais, cartões e faturas sem misturar os valores.",
    tag: "Separar",
  },
  {
    icon: PieChart,
    title: "Categorias e orçamento",
    text: "Veja onde mais gasta e acompanhe o limite de cada área.",
    tag: "Controlar",
  },
  {
    icon: Target,
    title: "Metas e recorrências",
    text: "Objetivos e gastos fixos entrando na previsão do mês.",
    tag: "Avançar",
  },
  {
    icon: Sparkles,
    title: "Leitura da MárcIA",
    text: "Os números viram uma explicação curta e uma próxima ação clara.",
    tag: "Decidir",
  },
];

const COMPARISON_ROWS = [
  ["Registrar gasto", "Abrir tela e preencher campos", "Falar, digitar ou fotografar"],
  ["Entender o mês", "Somar e interpretar sozinho", "Receber uma leitura em linguagem simples"],
  ["Lembrar contas", "Confiar na memória", "Calendário e aviso antes do vencimento"],
  ["Corrigir informação", "Editar vários campos", "Responder à pergunta que faltou"],
  ["Tomar uma decisão", "Cruzar saldos, faturas e limites", "Perguntar diretamente à MárcIA"],
] as const;

const START_STEPS: Array<{ icon: LucideIcon; number: string; title: string; text: string }> = [
  {
    icon: CircleDollarSign,
    number: "01",
    title: "Escolha seu plano",
    text: "Basic para organizar no aplicativo ou Pro para incluir o WhatsApp financeiro.",
  },
  {
    icon: MessageCircle,
    number: "02",
    title: "Conte a primeira movimentação",
    text: "Fale, digite ou fotografe. A MárcIA pergunta somente o que estiver faltando.",
  },
  {
    icon: ListChecks,
    number: "03",
    title: "Acompanhe o mês pronto",
    text: "Painel, calendário, categorias e lembretes passam a trabalhar com a sua rotina.",
  },
];

export function FinanceLanding({
  plans = FALLBACK_PLANS,
  signupHref = "/entrar?modo=signup",
  plansHref = "#planos",
  demoHref = "/demo",
  loginHref = "/entrar?modo=login",
  brandName = brand.name,
  assistantName = brand.assistantName,
  tagline = "Sua assessora financeira com IA",
  logoUrl = null,
  avatarUrl = null,
  legalName = legalProfile.name,
  legalDocument = legalProfile.document,
  contactEmail = legalProfile.email,
  contactAddress = legalProfile.address,
}: Props) {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const landingRef = useRef<HTMLDivElement>(null);
  const personalize = (value: string) => personalizeAssistantText(value, assistantName);
  const displayPlans = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        description: personalizeAssistantText(plan.description, assistantName),
        features: plan.features.map((feature) => personalizeAssistantText(feature, assistantName)),
      })),
    [plans, assistantName],
  );

  useEffect(() => {
    const root = landingRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal], [data-stagger]"));
    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("cl-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("cl-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -9%", threshold: 0.08 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={landingRef}
      data-force-motion="gentle"
      className="min-h-screen overflow-hidden bg-[#08060d] text-white selection:bg-violet-500/40"
    >
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
        <nav className="cl-nav mx-auto flex h-14 max-w-[1120px] items-center rounded-2xl border border-white/10 bg-[#100b18]/88 px-3.5 shadow-2xl backdrop-blur-2xl sm:px-5">
          <a href="#inicio" className="flex min-w-0 items-center gap-2.5">
            <Logo logoUrl={logoUrl} name={brandName} />
            <span className="truncate font-display text-base font-black tracking-[-.04em]">
              {brandName}
            </span>
          </a>

          <div className="ml-auto hidden items-center gap-7 text-[13px] font-bold text-white/62 lg:flex">
            <a href="#como-funciona" className="transition hover:text-white">
              Como funciona
            </a>
            <a
              href={`${demoHref}/dashboard`}
              className="transition hover:text-white"
              data-demo-entry="header"
            >
              Ver demo
            </a>
            <a href="#recursos" className="transition hover:text-white">
              Recursos
            </a>
            <a href="#planos" className="transition hover:text-white">
              Planos
            </a>
          </div>

          <div className="ml-auto flex items-center gap-1.5 lg:ml-8">
            <a
              href={loginHref}
              className="hidden rounded-xl px-3 py-2 text-[13px] font-extrabold text-white/68 transition hover:bg-white/5 hover:text-white sm:block"
            >
              Entrar
            </a>
            <a
              href={plansHref}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-[13px] font-black text-violet-800 transition hover:-translate-y-0.5"
            >
              Testar grátis <ArrowRight className="size-3.5" />
            </a>
          </div>
        </nav>
      </header>

      <main>
        <section id="inicio" className="relative overflow-hidden px-5 pb-10 pt-24 sm:pt-28">
          <div className="cl-hero-aurora absolute inset-0 bg-[radial-gradient(circle_at_78%_29%,rgba(124,58,237,.38),transparent_29%),radial-gradient(circle_at_13%_25%,rgba(217,70,239,.13),transparent_25%),linear-gradient(180deg,#08060d,#150a22_66%,#08060d)]" />
          <div className="relative mx-auto grid min-h-[520px] max-w-[1120px] items-center gap-8 lg:grid-cols-[1.04fr_.96fr]">
            <div className="cl-hero-copy z-10 max-w-3xl text-center lg:text-left">
              <Pill dark>
                <Sparkles className="size-3.5" /> Sua assessora financeira com IA
              </Pill>
              <h1 className="mt-4 max-w-[660px] font-display text-[clamp(2.8rem,5vw,4.4rem)] font-black leading-[.93] tracking-[-.065em]">
                Você fala.
                <span className="mt-2 block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-white bg-clip-text text-transparent">
                  A {assistantName} organiza seu dinheiro.
                </span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-[16px] font-medium leading-7 text-white/68 sm:text-[17px] lg:mx-0">
                Envie um áudio, uma mensagem ou um comprovante. Ela registra, lembra suas próximas
                contas e mostra o mês com clareza.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <a
                  href={plansHref}
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 text-[14px] font-black shadow-[0_24px_55px_-20px_rgba(147,51,234,.9)] transition hover:-translate-y-0.5"
                >
                  Testar grátis{" "}
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </a>
                <a
                  href={`${demoHref}/dashboard`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/7 px-6 text-[14px] font-black backdrop-blur transition hover:bg-white/12"
                  data-demo-entry="hero"
                >
                  <Play className="size-4 fill-white" /> Ver a demo
                </a>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[12px] font-bold text-white/58 lg:justify-start">
                {["Áudio, texto e foto", "Lembretes de contas", "Dashboard simples"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="size-4 text-emerald-400" /> {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto h-[430px] w-full max-w-[500px] sm:h-[500px]">
              <div className="cl-halo absolute left-1/2 top-1/2 size-[350px] rounded-full border border-violet-200/15 bg-[radial-gradient(circle,rgba(167,139,250,.25),rgba(88,28,135,.06)_54%,transparent_70%)] sm:size-[430px]" />
              <div className="cl-orbit absolute left-1/2 top-1/2 size-[390px] rounded-full border border-dashed border-violet-300/20 sm:size-[470px]" />
              <img
                src={avatarUrl || fallbackAvatarUrl}
                alt={`${assistantName}, assessora financeira com IA`}
                className="cl-avatar absolute bottom-[-34px] left-1/2 z-10 h-[485px] max-w-none object-contain object-bottom drop-shadow-[0_38px_42px_rgba(0,0,0,.48)] sm:h-[555px]"
              />
              <Float
                className="left-0 top-[18%] sm:-left-[3%]"
                icon={<Mic className="size-4 text-fuchsia-300" />}
                title="Áudio entendido"
                text="Mercado · R$ 84,90"
              />
              <Float
                className="right-0 top-[48%] sm:-right-[5%]"
                icon={<PieChart className="size-4 text-emerald-300" />}
                title="Painel atualizado"
                text="Tudo organizado"
                delay="1.2s"
              />
            </div>
          </div>
        </section>

        <section className="bg-[#f7f2fb] px-5 py-14 text-[#21152e] sm:py-16">
          <div data-reveal className="mx-auto max-w-[1120px]">
            <Heading
              centered
              eyebrow="01 · A rotina real"
              title="Organizar o dinheiro não deveria virar outro trabalho."
              description="O problema não é falta de vontade. É depender de memória, formulário e planilha para entender uma rotina que acontece o dia inteiro."
            />
            <div data-stagger className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PAIN_POINTS.map(({ icon: Icon, title, text }) => (
                <article
                  key={title}
                  className="rounded-[22px] border border-violet-100 bg-white p-5 shadow-[0_22px_50px_-42px_rgba(55,28,77,.5)]"
                >
                  <div className="grid size-11 place-items-center rounded-2xl bg-rose-50 text-rose-600">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-[15px] font-black leading-5">{title}</h3>
                  <p className="mt-2 text-[12px] font-medium leading-5 text-[#75667e]">{text}</p>
                </article>
              ))}
            </div>
            <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-[22px] bg-[#21132f] px-6 py-5 text-center text-white sm:flex-row sm:text-left">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.14em] text-violet-300">
                  O jeito mais simples
                </div>
                <p className="mt-1 text-[15px] font-black">
                  Se aconteceu com seu dinheiro, você conta para a {assistantName}.
                </p>
              </div>
              <a
                href="#como-funciona"
                className="inline-flex shrink-0 items-center gap-2 text-sm font-black text-fuchsia-200 transition hover:text-white"
              >
                Veja o fluxo <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="scroll-mt-20 bg-white px-5 py-12 text-[#21152e] sm:py-14"
        >
          <div data-reveal className="mx-auto max-w-[1120px]">
            <Heading
              centered
              eyebrow="02 · Veja acontecer"
              title="Você fala. Ela organiza. O painel muda."
              description="Uma única demonstração mostra o caminho completo, sem cliques e sem formulários."
            />
            <WorkflowDemo
              assistantName={assistantName}
              avatarUrl={avatarUrl || fallbackAvatarUrl}
            />
            <div className="mt-5 text-center">
              <a
                href={`${demoHref}/dashboard`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-5 text-sm font-black text-violet-800 transition hover:-translate-y-0.5 hover:border-violet-400"
              >
                Explorar o sistema completo <ArrowUpRight className="size-4" />
              </a>
              <p className="mt-2 text-[11px] font-semibold text-[#8b7c94]">
                Demonstração navegável com dados fictícios
              </p>
            </div>
          </div>
        </section>

        <section id="rotina" className="scroll-mt-20 bg-[#0c0712] px-5 py-14 text-white sm:py-16">
          <div data-reveal className="mx-auto max-w-[1120px]">
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-fuchsia-300">
                03 · Cabe no seu dia
              </div>
              <h2 className="mt-3 font-display text-[clamp(2.15rem,4vw,3.65rem)] font-black leading-[.97] tracking-[-.055em]">
                Fale do jeito que você lembra.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-[15px] font-medium leading-7 text-white/58">
                A {assistantName} transforma frases comuns em registros, lembretes e respostas
                úteis. Sem aprender comando especial.
              </p>
            </div>
            <div data-stagger className="mt-9 grid gap-4 lg:grid-cols-3">
              {DAILY_MOMENTS.map(({ icon: Icon, number, title, example, result }) => (
                <article
                  key={number}
                  className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[.055] p-5 transition hover:-translate-y-1 hover:border-violet-400/40"
                >
                  <div className="absolute -right-4 -top-8 font-display text-[88px] font-black text-white/[.035]">
                    {number}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 place-items-center rounded-2xl bg-violet-500/18 text-violet-200">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[.14em] text-violet-300">
                        Situação {number}
                      </div>
                      <h3 className="mt-1 text-[16px] font-black">{title}</h3>
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl bg-white p-4 text-[13px] font-black leading-5 text-[#2b1935] shadow-xl">
                    {example}
                  </div>
                  <div className="mt-4 flex items-start gap-2 text-[12px] font-medium leading-5 text-white/58">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    {result}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="por-dentro"
          className="scroll-mt-20 bg-[#f7f2fb] px-5 py-12 text-[#21152e] sm:py-14"
        >
          <div
            data-reveal
            className="mx-auto grid max-w-[1120px] items-center gap-8 lg:grid-cols-[.7fr_1.3fr]"
          >
            <div>
              <Pill>
                <BarChart3 className="size-3.5" /> 04 · Por dentro do painel
              </Pill>
              <h2 className="mt-4 font-display text-[clamp(2.15rem,3.8vw,3.45rem)] font-black leading-[.97] tracking-[-.055em]">
                Abra e entenda.<span className="block text-violet-700">Sem fazer conta.</span>
              </h2>
              <p className="mt-4 max-w-xl text-[15px] font-medium leading-7 text-[#685873]">
                Saldo, o que entrou, o que saiu e onde você mais gastou aparecem primeiro. A{" "}
                {assistantName}
                destaca somente o que merece sua atenção.
              </p>
              <div className="mt-6 space-y-2.5">
                <Outcome
                  icon={TrendingUp}
                  title="Entenda o mês"
                  text="Saldo, entradas, saídas e categorias em uma tela."
                />
                <Outcome
                  icon={CalendarDays}
                  title="Não esqueça contas"
                  text="Vencimentos organizados com lembretes antes da data."
                />
                <Outcome
                  icon={Mic}
                  title="Registre sem formulário"
                  text="Fale, digite ou envie uma foto e siga o seu dia."
                />
              </div>
              <a
                href={`${demoHref}/dashboard`}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-[#21132f] px-5 text-sm font-black text-white transition hover:-translate-y-0.5"
              >
                Ver dashboard completo <ArrowUpRight className="size-4" />
              </a>
            </div>
            <DashboardPreview assistantName={assistantName} />
          </div>

          <div className="mx-auto mt-8 flex max-w-[1120px] flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-violet-100 pt-6 text-xs font-black text-[#6b5b75]">
            <Channel icon={Mic}>Áudio</Channel>
            <Channel icon={MessageCircle}>Texto</Channel>
            <Channel icon={Camera}>Comprovante</Channel>
            <Channel icon={Smartphone}>Aplicativo</Channel>
            <Channel icon={Zap}>WhatsApp no Pro</Channel>
          </div>
        </section>

        <section id="recursos" className="scroll-mt-20 bg-white px-5 py-14 text-[#21152e] sm:py-16">
          <div data-reveal className="mx-auto max-w-[1120px]">
            <Heading
              centered
              eyebrow="05 · O sistema completo"
              title="Tudo que você precisa para sair do improviso."
              description="A conversa deixa o uso simples. Por trás dela, cada informação vai para o lugar certo e continua disponível quando você precisar."
            />
            <div data-stagger className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FINANCE_FEATURES.map(({ icon: Icon, title, text, tag }) => (
                <article
                  key={title}
                  className="group rounded-[22px] border border-violet-100 bg-[#fbf9fd] p-5 transition hover:-translate-y-1 hover:border-violet-300 hover:bg-white hover:shadow-[0_24px_55px_-42px_rgba(78,35,110,.6)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid size-11 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                      <Icon className="size-5" />
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-violet-600 ring-1 ring-violet-100">
                      {tag}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[15px] font-black">{title}</h3>
                  <p className="mt-2 text-[12px] font-medium leading-5 text-[#75667e]">{text}</p>
                </article>
              ))}
            </div>
            <div className="mt-7 flex flex-col items-center justify-between gap-4 rounded-[22px] border border-violet-100 bg-violet-50 px-6 py-5 text-center sm:flex-row sm:text-left">
              <div className="flex items-center gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm">
                  <Smartphone className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-black">Use no computador ou instale no celular.</div>
                  <div className="mt-1 text-xs font-medium text-[#75667e]">
                    A mesma conta, o mesmo painel e os mesmos dados em qualquer tela.
                  </div>
                </div>
              </div>
              <a
                href={`${demoHref}/dashboard`}
                className="inline-flex shrink-0 items-center gap-2 text-sm font-black text-violet-700"
              >
                Navegar pela demo <ArrowUpRight className="size-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="bg-[#f7f2fb] px-5 py-14 text-[#21152e] sm:py-16">
          <div data-reveal className="mx-auto max-w-[1000px]">
            <Heading
              centered
              eyebrow="06 · A diferença na prática"
              title="Controle financeiro sem virar operador de planilha."
              description="A MárcIA não mostra apenas uma lista de números. Ela reduz o trabalho entre o que aconteceu e a decisão que você precisa tomar."
            />
            <div className="mt-9 overflow-hidden rounded-[26px] border border-violet-100 bg-white shadow-[0_30px_70px_-52px_rgba(55,28,77,.65)]">
              <div className="grid grid-cols-[1fr_1fr] border-b border-violet-100 bg-[#21132f] text-white sm:grid-cols-[.72fr_1fr_1fr]">
                <div className="hidden px-5 py-4 text-[10px] font-black uppercase tracking-[.12em] text-white/45 sm:block">
                  No dia a dia
                </div>
                <div className="px-4 py-4 text-[11px] font-black uppercase tracking-[.1em] text-white/55 sm:px-5">
                  Controle tradicional
                </div>
                <div className="bg-violet-700 px-4 py-4 text-[11px] font-black uppercase tracking-[.1em] sm:px-5">
                  Com a {assistantName}
                </div>
              </div>
              {COMPARISON_ROWS.map(([action, before, after]) => (
                <div
                  key={action}
                  className="grid grid-cols-[1fr_1fr] border-b border-violet-100 last:border-b-0 sm:grid-cols-[.72fr_1fr_1fr]"
                >
                  <div className="col-span-2 border-b border-violet-50 bg-[#fbf9fd] px-4 py-2 text-[10px] font-black uppercase tracking-[.1em] text-violet-700 sm:col-span-1 sm:border-b-0 sm:px-5 sm:py-4">
                    {action}
                  </div>
                  <div className="flex items-start gap-2 px-4 py-4 text-[12px] font-medium leading-5 text-[#84758c] sm:px-5">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-rose-400" />
                    {before}
                  </div>
                  <div className="flex items-start gap-2 bg-violet-50/70 px-4 py-4 text-[12px] font-bold leading-5 text-[#4c315d] sm:px-5">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    {after}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#0c0712] px-5 py-14 text-white sm:py-16">
          <div
            data-reveal
            className="mx-auto grid max-w-[1120px] items-center gap-8 lg:grid-cols-[.72fr_1.28fr]"
          >
            <div>
              <Pill dark>
                <ShieldCheck className="size-3.5" /> 07 · Você continua no controle
              </Pill>
              <h2 className="mt-4 font-display text-[clamp(2.15rem,3.8vw,3.45rem)] font-black leading-[.97] tracking-[-.055em]">
                A IA prepara.<span className="block text-violet-300">Você confirma.</span>
              </h2>
              <p className="mt-4 max-w-xl text-[15px] font-medium leading-7 text-white/58">
                A {assistantName} pergunta o que estiver faltando, mostra o que entendeu e mantém
                cada conta protegida. Ela organiza informações — não movimenta seu dinheiro.
              </p>
              <a
                href="#faq"
                className="mt-6 inline-flex items-center gap-2 text-sm font-black text-fuchsia-200"
              >
                Tire suas dúvidas <ArrowRight className="size-4" />
              </a>
            </div>
            <div data-stagger className="grid gap-3 sm:grid-cols-2">
              <TrustCard
                icon={BadgeCheck}
                title="Confirmação antes de registrar"
                text="Quando uma informação é importante, você vê o resumo antes de concluir."
              />
              <TrustCard
                icon={Lock}
                title="Acesso protegido por conta"
                text="Seus dados ficam separados e vinculados ao seu acesso."
              />
              <TrustCard
                icon={WalletCards}
                title="Sem acesso ao seu banco"
                text="Nesta versão, contas e cartões são organizados manualmente; não há conexão bancária."
              />
              <TrustCard
                icon={ShieldCheck}
                title="WhatsApp autorizado no Pro"
                text="O canal financeiro aceita somente os celulares vinculados à conta."
              />
            </div>
          </div>
        </section>

        <section id="planos" className="scroll-mt-20 bg-white px-5 py-14 text-[#21152e] sm:py-16">
          <div data-reveal className="mx-auto max-w-[1120px]">
            <Heading
              centered
              eyebrow="08 · Planos simples"
              title="Escolha o quanto quer automatizar."
              description="Comece com o essencial ou leve a MárcIA também para o WhatsApp."
            />
            <div data-stagger className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
              {displayPlans.map((plan) => (
                <article
                  key={plan.slug}
                  className={`relative flex flex-col rounded-[24px] border p-6 ${plan.featured ? "border-violet-500 bg-[#21132f] text-white shadow-[0_30px_70px_-35px_rgba(91,33,182,.9)]" : "border-violet-100 bg-[#fbf9fd]"}`}
                >
                  {plan.featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-white">
                      Mais escolhido
                    </span>
                  )}
                  <div
                    className={`text-[11px] font-black uppercase tracking-[.13em] ${plan.featured ? "text-violet-300" : "text-violet-600"}`}
                  >
                    {plan.name}
                  </div>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="mb-2 text-sm font-black">R$</span>
                    <span className="font-display text-5xl font-black tracking-[-.06em]">
                      {plan.price}
                    </span>
                    <span
                      className={`mb-2 text-xs font-bold ${plan.featured ? "text-white/55" : "text-[#7b6c84]"}`}
                    >
                      /mês
                    </span>
                  </div>
                  <p
                    className={`mt-4 text-sm font-medium leading-6 ${plan.featured ? "text-white/65" : "text-[#6b5b75]"}`}
                  >
                    {plan.description}
                  </p>
                  {(plan.trialDays || 0) > 0 && (
                    <div
                      className={`mt-4 rounded-xl px-3 py-2 text-xs font-black ${plan.featured ? "bg-emerald-400/13 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}
                    >
                      {plan.trialDays} dias para testar · condições no checkout
                    </div>
                  )}
                  <div className="my-6 h-px bg-current opacity-10" />
                  <div className="flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5 text-sm font-bold">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" /> {feature}
                      </div>
                    ))}
                  </div>
                  <a
                    href={`${signupHref}${signupHref.includes("?") ? "&" : "?"}plano=${encodeURIComponent(plan.slug)}`}
                    className={`mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-black ${plan.featured ? "bg-white text-violet-800" : "bg-violet-700 text-white"}`}
                  >
                    Começar com {plan.name} <ArrowRight className="size-4" />
                  </a>
                </article>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-[#6b5b75]">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-violet-600" /> Conta protegida
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="size-4 text-emerald-600" /> Cancele conforme o plano
              </span>
              <span className="inline-flex items-center gap-2">
                <Smartphone className="size-4 text-violet-600" /> Use como aplicativo
              </span>
            </div>
          </div>
        </section>

        <section className="bg-[#f7f2fb] px-5 py-14 text-[#21152e] sm:py-16">
          <div data-reveal className="mx-auto max-w-[1120px]">
            <Heading
              centered
              eyebrow="09 · Do primeiro acesso à clareza"
              title="Começar leva uma conversa."
              description="Você não precisa importar planilha nem configurar um sistema inteiro antes de usar. O controle nasce a partir do primeiro registro."
            />
            <div data-stagger className="mx-auto mt-9 grid max-w-5xl gap-4 lg:grid-cols-3">
              {START_STEPS.map(({ icon: Icon, number, title, text }) => (
                <article
                  key={number}
                  className="relative overflow-hidden rounded-[24px] border border-violet-100 bg-white p-6 shadow-[0_24px_58px_-48px_rgba(55,28,77,.65)]"
                >
                  <div className="absolute right-5 top-4 font-display text-5xl font-black text-violet-100">
                    {number}
                  </div>
                  <div className="grid size-11 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-[16px] font-black">{title}</h3>
                  <p className="mt-2 text-[12px] font-medium leading-5 text-[#75667e]">{text}</p>
                </article>
              ))}
            </div>
            <div className="mx-auto mt-6 flex max-w-5xl flex-col items-center justify-between gap-4 rounded-[22px] border border-violet-200 bg-violet-50 px-6 py-5 text-center sm:flex-row sm:text-left">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm">
                  <Clock className="size-4.5" />
                </div>
                <div>
                  <div className="text-sm font-black">Teste antes de decidir.</div>
                  <div className="mt-1 text-xs font-medium text-[#75667e]">
                    Os dias e as condições aparecem no plano antes da confirmação.
                  </div>
                </div>
              </div>
              <a
                href={plansHref}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-black text-white"
              >
                Criar minha conta <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 bg-white px-5 py-12 text-[#21152e] sm:py-14">
          <div
            data-reveal
            className="mx-auto grid max-w-[1050px] gap-8 lg:grid-cols-[.62fr_1.38fr]"
          >
            <div>
              <Pill>10 · Perguntas diretas</Pill>
              <h2 className="mt-4 font-display text-[clamp(2.25rem,4.2vw,3.55rem)] font-black leading-[.97] tracking-[-.055em]">
                Simples antes<span className="block text-violet-700">mesmo de começar.</span>
              </h2>
              <p className="mt-4 text-[14px] font-medium leading-6 text-[#6b5b75]">
                O essencial sobre uso, segurança e canais.
              </p>
            </div>
            <div className="divide-y divide-violet-100 overflow-hidden rounded-[24px] border border-violet-100 bg-white">
              {FAQS.map(([question, answer], index) => (
                <div key={question}>
                  <button
                    type="button"
                    onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                    className="flex w-full items-center justify-between gap-5 px-5 py-4 text-left text-[14px] font-black sm:px-6"
                  >
                    <span>{personalize(question)}</span>
                    <ChevronDown
                      className={`size-5 shrink-0 text-violet-600 transition ${faqOpen === index ? "rotate-180" : ""}`}
                    />
                  </button>
                  {faqOpen === index && (
                    <p className="px-5 pb-5 text-[13px] font-medium leading-6 text-[#6b5b75] sm:px-6">
                      {personalize(answer)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#0c0712] px-5 py-10">
          <div
            data-reveal
            className="cl-cta-pulse mx-auto max-w-4xl overflow-hidden rounded-[26px] border border-violet-300/15 bg-[radial-gradient(circle_at_80%_20%,rgba(217,70,239,.25),transparent_30%),linear-gradient(125deg,#3b1480,#7c3aed_55%,#a21caf)] p-7 text-center shadow-2xl sm:p-9"
          >
            <h2 className="mx-auto max-w-3xl font-display text-[clamp(2.1rem,4vw,3.5rem)] font-black leading-[.97] tracking-[-.055em]">
              Organize o mês começando por uma frase.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] font-medium leading-6 text-white/70">
              A {assistantName} entende o pedido e transforma o resto em clareza.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={plansHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-[14px] font-black text-violet-800"
              >
                Testar grátis <ArrowRight className="size-4" />
              </a>
              <a
                href={`${demoHref}/dashboard`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/8 px-6 text-[14px] font-black"
              >
                Entrar na demonstração <Play className="size-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 bg-[#08060d] px-5 pb-7 pt-12">
        <div data-reveal className="mx-auto max-w-[1120px]">
          <div className="grid gap-9 border-b border-white/8 pb-9 sm:grid-cols-2 lg:grid-cols-[1.3fr_.7fr_.8fr_1.1fr]">
            <div>
              <div className="flex items-center gap-3">
                <Logo logoUrl={logoUrl} name={brandName} />
                <div>
                  <div className="font-display text-lg font-black tracking-[-.035em]">
                    {brandName}
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-violet-300">{tagline}</div>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm font-medium leading-6 text-white/48">
                Controle financeiro por conversa, com lembretes e um painel que qualquer pessoa
                entende.
              </p>
            </div>

            <FooterColumn title="Produto">
              <a href="#como-funciona">Como funciona</a>
              <a href="#por-dentro">Por dentro</a>
              <a href="#recursos">Recursos</a>
              <a href="#planos">Planos</a>
              <a href={`${demoHref}/dashboard`}>Demonstração</a>
            </FooterColumn>

            <FooterColumn title="Acesso e políticas">
              <a href={loginHref}>Entrar</a>
              <a href="#faq">Perguntas frequentes</a>
              <a href="/termos">Termos de uso</a>
              <a href="/privacidade">Privacidade</a>
              <a href="/reembolso">Cancelamento e reembolso</a>
            </FooterColumn>

            <div data-company-footer>
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-violet-300">
                Empresa e atendimento
              </div>
              <div className="mt-4 space-y-3 text-[13px] font-medium leading-5 text-white/52">
                <div className="font-black text-white/85">{legalName || brandName}</div>
                {legalDocument && <div>CNPJ: {legalDocument}</div>}
                {contactAddress && <div>{contactAddress}</div>}
                {contactEmail && (
                  <a className="block hover:text-white" href={`mailto:${contactEmail}`}>
                    {contactEmail}
                  </a>
                )}
                {supportConfigured ? (
                  <a
                    href={supportWhatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 font-black text-emerald-300 hover:text-emerald-200"
                  >
                    <MessageCircle className="size-4" /> WhatsApp {supportWhatsappDisplay}
                  </a>
                ) : (
                  <div>Atendimento disponível pela área logada.</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-[11px] font-medium text-white/32 sm:flex-row sm:items-center sm:justify-between">
            <div>
              © {new Date().getFullYear()} {legalName || brandName}. Todos os direitos reservados.
            </div>
            <div>Dados e valores das demonstrações são ilustrativos.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function WorkflowDemo({ assistantName, avatarUrl }: { assistantName: string; avatarUrl: string }) {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const demo = demoRef.current;
    if (!demo) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) setStep(0);
      },
      { threshold: 0.12 },
    );
    observer.observe(demo);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || typeof window === "undefined") return;
    const timer = window.setInterval(
      () => setStep((current) => (current + 1) % WORKFLOW_STEPS.length),
      2600,
    );
    return () => window.clearInterval(timer);
  }, [isVisible]);

  return (
    <div
      ref={demoRef}
      data-reveal
      className="mt-7 overflow-hidden rounded-[28px] border border-violet-200 bg-[#110919] text-white shadow-[0_38px_90px_-48px_rgba(91,33,182,.7)]"
    >
      <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
          </span>
          <div>
            <div className="text-sm font-black">Demonstração automática</div>
            <div className="text-[11px] font-medium text-white/42">
              uma despesa indo da conversa para o painel
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-2"
          aria-label={`Etapa ${step + 1} de ${WORKFLOW_STEPS.length}`}
        >
          {WORKFLOW_STEPS.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all duration-500 ${index === step ? "w-7 bg-fuchsia-300" : index < step ? "w-3 bg-violet-400" : "w-3 bg-white/15"}`}
            />
          ))}
        </div>
      </div>

      <div className="relative grid items-center gap-5 overflow-hidden p-5 lg:grid-cols-[270px_145px_minmax(0,1fr)] lg:gap-4 lg:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_45%,rgba(16,185,129,.12),transparent_24%),radial-gradient(circle_at_73%_35%,rgba(124,58,237,.24),transparent_38%)]" />

        <article className="relative">
          <div className="mb-3 flex items-center justify-between px-2 text-[9px] font-black uppercase tracking-[.14em] text-emerald-300">
            <span>Você envia</span>
            <span className="text-white/35">celular</span>
          </div>
          <div className="mx-auto w-full max-w-[255px] rounded-[40px] border-[7px] border-[#302a36] bg-[#17131c] p-[5px] shadow-[0_35px_80px_-28px_rgba(0,0,0,.9)]">
            <div className="relative min-h-[430px] overflow-hidden rounded-[29px] bg-[#eeeaf1] text-[#24182d]">
              <div className="absolute left-1/2 top-2 z-20 h-6 w-[78px] -translate-x-1/2 rounded-full bg-black" />
              <div className="flex h-11 items-center justify-between px-5 pt-2 text-[8px] font-black">
                <span>9:41</span>
                <span>5G ▰</span>
              </div>
              <div className="flex h-14 items-center gap-2.5 bg-white/85 px-4 shadow-sm">
                <div className="relative size-9 overflow-hidden rounded-full bg-violet-100">
                  <img
                    src={avatarUrl}
                    alt=""
                    className="absolute top-1 h-[52px] w-full object-cover object-top"
                  />
                </div>
                <div>
                  <div className="text-xs font-black">{assistantName}</div>
                  <div className="text-[8px] font-bold text-emerald-600">● online agora</div>
                </div>
              </div>
              <div className="flex min-h-[270px] flex-col px-3 py-4">
                <div className="ml-auto w-[92%] rounded-[17px] rounded-br-[5px] bg-[#d6f8e7] p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-emerald-600 text-white">
                      <Play className="size-3 fill-current" />
                    </span>
                    <AudioWave />
                    <span className="text-[8px] font-bold text-emerald-900/55">0:06</span>
                  </div>
                  <p className="mt-2 text-[10px] font-bold leading-4">
                    Paguei R$ 189 no mercado hoje, no cartão.
                  </p>
                </div>
                <div
                  className={`mt-3 max-w-[94%] rounded-[17px] rounded-tl-[5px] bg-white p-3 text-[10px] font-bold leading-4 shadow-sm transition-all duration-500 ${step >= 1 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
                >
                  <span className="block text-[8px] font-black uppercase text-violet-600">
                    {assistantName}
                  </span>
                  Entendi. Qual cartão você usou?
                </div>
                <div
                  className={`ml-auto mt-3 rounded-[14px] rounded-br-[5px] bg-[#d6f8e7] px-4 py-2 text-[10px] font-black shadow-sm transition-all duration-500 ${step >= 2 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
                >
                  Nubank
                </div>
                <div
                  className={`mt-3 max-w-[94%] rounded-[17px] rounded-tl-[5px] border border-emerald-100 bg-white p-3 shadow-sm transition-all duration-500 ${step >= 3 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
                >
                  <div className="flex items-center gap-2 text-[10px] font-black text-emerald-700">
                    <BadgeCheck className="size-4" /> Registrado e organizado
                  </div>
                  <p className="mt-1 text-[9px] font-bold text-[#62536a]">
                    Painel e orçamento atualizados.
                  </p>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex h-14 items-center gap-2 border-t border-black/5 bg-white/85 px-3">
                <div className="grid size-8 place-items-center rounded-full bg-violet-100 text-violet-700">
                  <Mic className="size-3.5" />
                </div>
                <div className="flex h-9 flex-1 items-center rounded-full bg-white px-3 text-[8px] font-bold text-[#9b8ea3] shadow-sm">
                  Mensagem para {assistantName}...
                </div>
              </div>
            </div>
          </div>
        </article>

        <article
          data-workflow-core
          className="relative flex min-h-[285px] items-center justify-center lg:min-h-[460px]"
        >
          <div className="absolute left-1/2 top-1/2 hidden h-px w-[145%] -translate-x-1/2 bg-gradient-to-r from-emerald-400/10 via-violet-400/65 to-violet-400/10 lg:block" />
          <div className="relative z-10 w-full max-w-[220px] text-center">
            <div className="relative mx-auto h-[230px] w-[210px] lg:h-[285px] lg:w-[235px]">
              <div className="absolute left-1/2 top-[52%] size-[178px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/15 blur-2xl lg:size-[205px]" />
              <div className="marcia-core-orbit absolute left-1/2 top-[52%] size-[172px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/25 bg-[radial-gradient(circle_at_50%_44%,rgba(168,85,247,.24),rgba(31,15,47,.2)_62%,transparent_63%)] lg:size-[200px]">
                <span className="absolute left-1/2 top-[-5px] size-2 -translate-x-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_16px_rgba(240,171,252,.95)]" />
              </div>
              <div className="marcia-thinking absolute inset-x-0 bottom-0 z-10 flex justify-center">
                <img
                  src={avatarUrl}
                  alt={`${assistantName} organizando a despesa`}
                  className="h-[225px] max-w-none object-contain object-bottom drop-shadow-[0_24px_32px_rgba(9,4,18,.5)] lg:h-[275px]"
                />
              </div>
            </div>
            <div
              key={step}
              className="marcia-rise relative z-20 mx-auto -mt-6 w-[190px] rounded-[20px] border border-white/12 bg-[#20122e]/90 px-3.5 py-2.5 shadow-[0_18px_45px_-22px_rgba(217,70,239,.9)] backdrop-blur-xl"
              aria-live="polite"
            >
              <div className="flex items-center justify-center gap-1.5 text-[8px] font-black uppercase tracking-[.12em] text-fuchsia-300">
                <Sparkles className="size-3" /> {assistantName} organizando
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-2">
                <span className="text-[10px] font-black">{WORKFLOW_STEPS[step]}</span>
                <span className="flex shrink-0 gap-1" aria-hidden="true">
                  {[0, 1, 2].map((dot) => (
                    <i
                      key={dot}
                      className="marcia-thinking-dot size-1 rounded-full bg-fuchsia-300"
                      style={{ animationDelay: `${dot * 150}ms` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          </div>
        </article>

        <article className="relative">
          <div className="mb-3 flex items-center justify-between px-2 text-[9px] font-black uppercase tracking-[.14em] text-violet-300">
            <span>O painel mostra</span>
            <span className={step === 3 ? "text-emerald-300" : "text-white/35"}>
              {step === 3 ? "atualizado agora" : "seu mês"}
            </span>
          </div>
          <DashboardPreview assistantName={assistantName} compact updated={step === 3} />
        </article>
      </div>
    </div>
  );
}

function DashboardPreview({
  assistantName,
  compact = false,
  updated = true,
}: {
  assistantName: string;
  compact?: boolean;
  updated?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden border border-violet-100 bg-[#f8f6fa] text-[#25172e] shadow-[0_30px_70px_-35px_rgba(65,31,89,.55)] ${compact ? "rounded-[24px]" : "cl-dashboard-float rounded-[28px]"}`}
    >
      <div className="flex h-10 items-center gap-2 border-b border-violet-100 bg-white px-4">
        <div className="flex gap-1.5">
          <i className="size-2 rounded-full bg-rose-400" />
          <i className="size-2 rounded-full bg-amber-400" />
          <i className="size-2 rounded-full bg-emerald-400" />
        </div>
        <div className="mx-auto rounded-full bg-[#f3eff6] px-7 py-1 text-[7px] font-black text-[#8d7e96]">
          SEU PAINEL FINANCEIRO
        </div>
      </div>
      <div
        className={`grid ${compact ? "min-h-[405px] grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[86px_minmax(0,1fr)]" : "min-h-[470px] grid-cols-[56px_minmax(0,1fr)] sm:grid-cols-[108px_minmax(0,1fr)]"}`}
      >
        <aside className="border-r border-violet-100 bg-white p-2.5 sm:p-3.5">
          <div className="grid size-8 place-items-center rounded-xl bg-violet-600 text-sm font-black text-white">
            {assistantName.charAt(0).toUpperCase()}
          </div>
          <div className="mt-6 space-y-2">
            {[
              [Home, "Início"],
              [ReceiptText, "Movimentos"],
              [CalendarDays, "Calendário"],
              [PieChart, "Categorias"],
            ].map(([Icon, label], index) => {
              const C = Icon as LucideIcon;
              return (
                <div
                  key={String(label)}
                  className={`flex items-center gap-2 rounded-xl p-2 ${index === 0 ? "bg-violet-100 text-violet-700" : "text-[#9a8da2]"}`}
                >
                  <C className="size-3.5 shrink-0" />
                  <span className="hidden text-[7px] font-black sm:block">{String(label)}</span>
                </div>
              );
            })}
          </div>
        </aside>

        <div className={`min-w-0 ${compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[.12em] text-violet-600">
                Visão do mês
              </div>
              <h3 className="mt-1 text-lg font-black tracking-[-.04em] sm:text-2xl">
                Outubro sob controle.
              </h3>
            </div>
            <div className="hidden rounded-xl bg-violet-100 px-3 py-2 text-[8px] font-black text-violet-700 sm:block">
              <Sparkles className="mr-1 inline size-3" /> Resumo da {assistantName}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ["Saldo", "R$ 4.821", "text-violet-700"],
              ["Entrou", "R$ 6.200", "text-emerald-700"],
              ["Saiu", updated ? "R$ 2.369" : "R$ 2.180", "text-rose-600"],
            ].map(([label, value, color], index) => (
              <div
                key={label}
                className={`rounded-2xl border border-violet-100 bg-white p-3 ${index === 2 ? "col-span-2 sm:col-span-1" : ""} ${updated && index === 2 ? "ring-2 ring-emerald-200" : ""}`}
              >
                <div className="text-[7px] font-black uppercase tracking-[.08em] text-[#9b8fa2]">
                  {label}
                </div>
                <div className={`mt-1 text-sm font-black sm:text-lg ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1.12fr_.88fr]">
            <div className="rounded-2xl border border-violet-100 bg-white p-3.5">
              <div className="flex items-center justify-between">
                <div className="text-[9px] font-black">Entradas e saídas</div>
                <TrendingUp className="size-3.5 text-emerald-600" />
              </div>
              <div className={`${compact ? "h-24" : "h-32"} mt-4 flex items-end gap-2`}>
                {[46, 68, 42, updated ? 88 : 62, 51, 36].map((height, index) => (
                  <div
                    key={`${height}-${index}`}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
                    <i
                      className={`w-full rounded-t-md transition-all duration-700 ${index === 3 ? "bg-violet-600" : "bg-violet-200"}`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[6px] font-bold text-[#a597ac]">{index + 1}ª</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-[#251331] p-3.5 text-white">
              <div className="flex items-center justify-between">
                <div className="text-[9px] font-black">Onde mais gastou</div>
                <PieChart className="size-3.5 text-violet-300" />
              </div>
              <div className="mx-auto mt-4 grid size-20 place-items-center rounded-full bg-[conic-gradient(#8b5cf6_0_38%,#d8b4fe_38%_64%,rgba(255,255,255,.12)_64%_100%)] p-2">
                <div className="grid size-full place-items-center rounded-full bg-[#251331] text-center">
                  <div>
                    <div className="text-base font-black">38%</div>
                    <div className="text-[6px] font-bold text-white/40">alimentação</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[6px] font-bold text-white/45">
                <span>Casa 26%</span>
                <span>Transp. 18%</span>
                <span>Outros 18%</span>
              </div>
            </div>
          </div>

          <div
            className={`mt-3 flex items-center gap-2.5 rounded-2xl border p-3 transition-all ${updated ? "border-emerald-300 bg-emerald-50" : "border-violet-100 bg-white opacity-55"}`}
          >
            <div
              className={`grid size-8 shrink-0 place-items-center rounded-xl ${updated ? "bg-emerald-500 text-white" : "bg-violet-100 text-violet-500"}`}
            >
              {updated ? <Check className="size-4" /> : <ReceiptText className="size-4" />}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[9px] font-black">
                {updated ? "Mercado registrado agora" : "Aguardando confirmação"}
              </div>
              <div className="mt-0.5 truncate text-[7px] font-bold text-[#8f8297]">
                Alimentação · Cartão Nubank · Hoje
              </div>
            </div>
            <div className="ml-auto text-xs font-black text-rose-600">- R$ 189</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Outcome({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white p-3.5">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
        <Icon className="size-4.5" />
      </div>
      <div>
        <div className="text-sm font-black">{title}</div>
        <div className="mt-0.5 text-xs font-medium leading-5 text-[#75667e]">{text}</div>
      </div>
    </div>
  );
}

function TrustCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <article className="rounded-[22px] border border-white/10 bg-white/[.055] p-5">
      <div className="grid size-10 place-items-center rounded-2xl bg-violet-400/15 text-violet-200">
        <Icon className="size-4.5" />
      </div>
      <h3 className="mt-4 text-[14px] font-black">{title}</h3>
      <p className="mt-2 text-[12px] font-medium leading-5 text-white/52">{text}</p>
    </article>
  );
}

function Channel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="size-4 text-violet-600" /> {children}
    </span>
  );
}

function AudioWave() {
  return (
    <div className="flex h-7 flex-1 items-center gap-[3px]">
      {[9, 15, 22, 11, 27, 18, 8, 24, 13, 20, 10].map((height, index) => (
        <i
          key={`${height}-${index}`}
          className="w-[3px] flex-1 rounded-full bg-emerald-700/55"
          style={{ height }}
        />
      ))}
    </div>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-[.16em] text-violet-300">
        {title}
      </div>
      <div className="mt-4 flex flex-col gap-3 text-[13px] font-bold text-white/52 [&_a]:transition [&_a:hover]:text-white">
        {children}
      </div>
    </div>
  );
}

function Logo({ logoUrl, name }: { logoUrl?: string | null; name: string }) {
  if (logoUrl) return <img src={logoUrl} alt={name} className="size-9 rounded-xl object-contain" />;
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 font-black text-white shadow-lg">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Pill({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-black uppercase tracking-[.14em] ${dark ? "border-white/12 bg-white/7 text-violet-200" : "border-violet-200 bg-white text-violet-700"}`}
    >
      {children}
    </div>
  );
}

function Heading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <div className="text-[10px] font-black uppercase tracking-[.16em] text-violet-600">
        {eyebrow}
      </div>
      <h2 className="mt-3 font-display text-[clamp(2.15rem,4vw,3.65rem)] font-black leading-[.97] tracking-[-.055em]">
        {title}
      </h2>
      <p
        className={`mt-4 max-w-2xl text-[15px] font-medium leading-7 text-[#6b5b75] ${centered ? "mx-auto" : ""}`}
      >
        {description}
      </p>
    </div>
  );
}

function Float({
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
      className={`cl-float absolute z-20 hidden min-w-[150px] rounded-2xl border border-white/12 bg-[#160f20]/88 p-3 shadow-2xl backdrop-blur-xl sm:block ${className}`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-[11px] font-black">{title}</span>
      </div>
      <div className="mt-1.5 text-[10px] font-bold text-white/46">{text}</div>
    </div>
  );
}
