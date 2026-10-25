import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Bot,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Database,
  ExternalLink,
  MessageCircle,
  Palette,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { useBrand } from "@/contexts/brand-context";

const DEFAULT_SIGNUP_HREF = "/entrar?modo=signup";

type OfferProofProps = {
  signupHref?: string;
  demoHref?: string;
};

type ValueItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

const VALUE_ITEMS: ValueItem[] = [
  {
    title: "WhatsApp inteligente",
    description: "Entende o pedido, responde com contexto e conduz o próximo passo.",
    icon: MessageCircle,
    tone: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Agenda interna",
    description: "Centraliza horários, duração, profissionais e disponibilidade.",
    icon: CalendarDays,
    tone: "bg-violet-100 text-violet-700",
  },
  {
    title: "Ordens de serviço",
    description: "Transforma o atendimento confirmado em execução organizada.",
    icon: ClipboardCheck,
    tone: "bg-amber-100 text-amber-700",
  },
  {
    title: "Cadastro de clientes",
    description: "Mantém contato, histórico e próximos atendimentos no mesmo lugar.",
    icon: UsersRound,
    tone: "bg-cyan-100 text-cyan-700",
  },
  {
    title: "Notificações",
    description: "Mostra pendências, confirmações e o que precisa de atenção.",
    icon: BellRing,
    tone: "bg-rose-100 text-rose-700",
  },
  {
    title: "App instalável",
    description: "Fica na tela inicial do celular sem depender de uma loja de apps.",
    icon: Smartphone,
    tone: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    title: "Google Agenda",
    description: "Acompanha os compromissos conectados à agenda da operação.",
    icon: CalendarCheck2,
    tone: "bg-blue-100 text-blue-700",
  },
  {
    title: "Marca própria",
    description: "Permite adaptar nome, identidade visual e experiência do produto.",
    icon: Palette,
    tone: "bg-purple-100 text-purple-700",
  },
  {
    title: "IA configurável",
    description: "Ajusta personalidade, tom, instruções, limites e base de conhecimento.",
    icon: Bot,
    tone: "bg-indigo-100 text-indigo-700",
  },
];

const INCLUDED_EXTRAS = [
  {
    label: "Implantação organizada",
    title: "Um roteiro claro para colocar a operação de pé",
    description:
      "Identidade, serviços, equipe, canais, regras e teste final aparecem em uma sequência compreensível.",
    icon: WandSparkles,
    badge: "Incluído",
  },
  {
    label: "Estrutura personalizável",
    title: "Uma base preparada para receber outra marca",
    description:
      "Nome, logo, cores, oferta e dados da operação podem ser adaptados sem reconstruir a experiência do zero.",
    icon: Copy,
    badge: "White-label",
  },
] as const;

export function OfferProofSections({
  signupHref = DEFAULT_SIGNUP_HREF,
  demoHref = "/demo",
}: OfferProofProps) {
  return (
    <>
      <ValueStackSection signupHref={signupHref} />
      <VerifiedProductProof demoHref={demoHref} />
      <OperationalConfidenceBlock signupHref={signupHref} demoHref={demoHref} />
      <OfferProofMotionStyles />
    </>
  );
}

export function ValueStackSection({
  signupHref = DEFAULT_SIGNUP_HREF,
}: Pick<OfferProofProps, "signupHref">) {
  const branding = useBrand();
  return (
    <section id="oferta" className="relative overflow-hidden bg-white px-5 py-24 sm:py-32">
      <div
        aria-hidden
        className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-violet-100/70 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-end gap-8 lg:grid-cols-[1.12fr_.88fr]" data-lp-reveal>
          <div>
            <OfferEyebrow>Uma operação completa, em uma única assinatura</OfferEyebrow>
            <h2 className="mt-4 max-w-4xl font-display text-[clamp(2.1rem,4.8vw,3.8rem)] font-black leading-[1.02] tracking-[-.055em] text-[#241337]">
              Não é só uma IA que responde.
              <span className="mt-1 block bg-gradient-to-r from-violet-700 via-purple-600 to-fuchsia-500 bg-clip-text text-transparent">
                É o caminho inteiro até o serviço concluído.
              </span>
            </h2>
          </div>
          <p className="max-w-xl text-base font-medium leading-8 text-[#675672] sm:text-lg">
            A mensagem entra pelo WhatsApp. A {branding.assistantName} ajuda a organizar cliente,
            horário, equipe e execução — sem obrigar você a remontar o trabalho em várias
            ferramentas.
          </p>
        </div>

        <div className="marcia-offer-border mt-12 overflow-hidden rounded-[34px] bg-[#f9f6ff] shadow-[0_32px_90px_-58px_rgba(91,33,182,.75)]">
          <div className="relative rounded-[33px] bg-[linear-gradient(145deg,rgba(255,255,255,.98),rgba(248,243,255,.96))] p-5 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-5 border-b border-violet-100 pb-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-black uppercase tracking-[.14em] text-violet-700">
                  Tudo conectado
                </div>
                <div className="mt-2 font-display text-2xl font-black tracking-[-.035em] text-[#281738] sm:text-3xl">
                  Nove blocos que trabalham como uma operação só
                </div>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-800">
                <Check className="size-4" /> Da conversa à execução
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {VALUE_ITEMS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    data-lp-reveal
                    className="group rounded-[24px] border border-violet-100 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(76,29,149,.65)] transition duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-[0_24px_50px_-34px_rgba(91,33,182,.55)]"
                    style={{ transitionDelay: `${Math.min(index * 30, 180)}ms` }}
                  >
                    <div className={`grid size-11 place-items-center rounded-2xl ${item.tone}`}>
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mt-5 text-base font-black text-[#2e1c3c]">{item.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#74647f]">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {INCLUDED_EXTRAS.map((extra) => {
                const Icon = extra.icon;
                return (
                  <article
                    key={extra.label}
                    className="marcia-offer-border rounded-[26px] bg-white"
                    data-lp-reveal
                  >
                    <div className="relative flex h-full flex-col rounded-[25px] bg-white p-6 sm:flex-row sm:items-start sm:gap-5">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#2d1742] text-violet-200 shadow-lg">
                        <Icon className="size-5" />
                      </div>
                      <div className="mt-5 sm:mt-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black uppercase tracking-[.12em] text-violet-700">
                            {extra.label}
                          </span>
                          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                            {extra.badge}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-black leading-tight text-[#2c193a]">
                          {extra.title}
                        </h3>
                        <p className="mt-3 text-sm font-medium leading-6 text-[#70607b]">
                          {extra.description}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-7 flex flex-col gap-5 rounded-[24px] bg-[#2b163e] p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-fuchsia-300" />
                <div>
                  <div className="text-base font-black">A base já nasce pronta para adaptar</div>
                  <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-violet-100/80">
                    A clonagem ou o remix dependem das permissões da plataforma e do projeto. A
                    estrutura visual e operacional, porém, foi organizada para facilitar essa
                    personalização.
                  </p>
                </div>
              </div>
              <a
                href={signupHref}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-violet-800 transition hover:-translate-y-0.5"
              >
                Ver planos <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function VerifiedProductProof({ demoHref = "/demo" }: Pick<OfferProofProps, "demoHref">) {
  const branding = useBrand();
  return (
    <section className="relative overflow-hidden bg-[#241337] px-5 py-24 text-white sm:py-32">
      <div
        aria-hidden
        className="absolute -left-28 top-24 size-96 rounded-full bg-violet-600/25 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-28 bottom-8 size-96 rounded-full bg-fuchsia-600/15 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-4xl text-center" data-lp-reveal>
          <OfferEyebrow dark>Prova de produto, não promessa genérica</OfferEyebrow>
          <h2 className="mt-4 font-display text-[clamp(2.1rem,4.8vw,3.8rem)] font-black leading-[1.02] tracking-[-.055em]">
            Você não precisa imaginar
            <span className="block text-violet-300">como a {branding.assistantName} funciona.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-8 text-violet-100/75 sm:text-lg">
            A demonstração é pública e navegável. Abra o sistema, percorra as áreas e acompanhe o
            fluxo que liga atendimento, agenda e execução.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <ProofCard
            icon={Database}
            number="11"
            title="áreas navegáveis"
            description="Hoje, agenda, conversas, clientes, OS, serviços, equipe, notificações, integrações, IA e configurações."
          />
          <ProofCard
            icon={Play}
            number="Demo"
            title="aberta para conferir"
            description="Você pode entrar, clicar e entender a lógica do produto antes de escolher um plano."
          />
          <ProofCard
            icon={BadgeCheck}
            number="1 fluxo"
            title="do início ao fim"
            description="Mensagem recebida, horário validado, cliente salvo e ordem de serviço pronta para acompanhar."
          />
        </div>

        <div
          className="marcia-proof-flow marcia-offer-border mt-6 overflow-hidden rounded-[32px] bg-white/5"
          data-lp-reveal
        >
          <div className="relative rounded-[31px] bg-[#2d1742]/95 p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-black uppercase tracking-[.14em] text-violet-300">
                  O que você consegue verificar
                </div>
                <h3 className="mt-2 font-display text-2xl font-black tracking-[-.035em] sm:text-3xl">
                  Uma conversa avançando até virar trabalho organizado
                </h3>
              </div>
              <a
                href={demoHref}
                className="inline-flex h-12 w-fit shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-violet-800 transition hover:-translate-y-0.5"
              >
                Abrir demo <ExternalLink className="size-4" />
              </a>
            </div>

            <div className="mt-7 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
              <FlowStep
                step="01"
                icon={MessageCircle}
                title="Cliente pede"
                description="A conversa começa no WhatsApp com uma necessidade real."
              />
              <FlowArrow />
              <FlowStep
                step="02"
                icon={CalendarCheck2}
                title="A agenda valida"
                description="O sistema consulta a operação antes de oferecer um horário."
              />
              <FlowArrow />
              <FlowStep
                step="03"
                icon={ClipboardCheck}
                title="A equipe executa"
                description="Cliente e serviço seguem organizados para a ordem de serviço."
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function OperationalConfidenceBlock({
  signupHref = DEFAULT_SIGNUP_HREF,
  demoHref = "/demo",
}: OfferProofProps) {
  return (
    <section className="bg-[#f8f4ff] px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div
          className="marcia-offer-border overflow-hidden rounded-[36px] bg-white shadow-[0_35px_90px_-55px_rgba(76,29,149,.65)]"
          data-lp-reveal
        >
          <div className="relative grid rounded-[35px] bg-white lg:grid-cols-[.84fr_1.16fr]">
            <div className="relative overflow-hidden bg-[linear-gradient(145deg,#32194a,#5b21b6)] p-7 text-white sm:p-10 lg:p-12">
              <div
                aria-hidden
                className="absolute -right-24 -top-24 size-72 rounded-full bg-fuchsia-400/20 blur-2xl"
              />
              <div className="relative">
                <div className="grid size-14 place-items-center rounded-2xl bg-white/12 text-violet-200 ring-1 ring-white/15">
                  <ShieldCheck className="size-7" />
                </div>
                <div className="mt-7 text-sm font-black uppercase tracking-[.14em] text-violet-300">
                  Garantia operacional
                </div>
                <h2 className="mt-3 font-display text-[clamp(2.15rem,4.7vw,3.8rem)] font-black leading-[1] tracking-[-.055em]">
                  Decida com o sistema aberto na sua frente.
                </h2>
                <p className="mt-5 text-base font-medium leading-8 text-violet-100/80">
                  Aqui, a garantia é de transparência: você conhece o produto navegando, testa o
                  fluxo e entende o que está contratando antes de depender dele na operação.
                </p>
              </div>
            </div>

            <div className="p-7 sm:p-10 lg:p-12">
              <div className="space-y-5">
                <ConfidenceRow
                  number="1"
                  title="Explore sem comprar no escuro"
                  description="A demo pública mostra as áreas centrais e a configuração da IA."
                />
                <ConfidenceRow
                  number="2"
                  title="Comece pelo teste disponível no plano"
                  description="Quando o plano oferecer período gratuito, a duração aparece de forma explícita antes da ativação."
                />
                <ConfidenceRow
                  number="3"
                  title="Confira as condições financeiras no lugar certo"
                  description="Cancelamento e eventual reembolso seguem a oferta, o checkout e a política aplicável à compra."
                />
              </div>

              <div className="mt-8 rounded-[22px] border border-amber-200 bg-amber-50 p-5 text-[#5c4314]">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-700" />
                  <p className="text-sm font-semibold leading-6">
                    Não anunciamos um prazo financeiro genérico que a oferta não comprove. Consulte
                    as condições apresentadas no checkout e na{" "}
                    <a href="/reembolso" className="font-black underline underline-offset-4">
                      política de cancelamento e reembolso
                    </a>
                    .
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={demoHref}
                  className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white px-5 text-sm font-black text-violet-800 transition hover:-translate-y-0.5 hover:bg-violet-50"
                >
                  <Play className="size-4 fill-violet-700" /> Conferir a demo
                </a>
                <a
                  href={signupHref}
                  className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-5 text-sm font-black text-white shadow-[0_18px_35px_-20px_rgba(91,33,182,.8)] transition hover:-translate-y-0.5"
                >
                  Ver planos <ArrowRight className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProofCard({
  icon: Icon,
  number,
  title,
  description,
}: {
  icon: LucideIcon;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <article
      className="rounded-[28px] border border-white/12 bg-white/[.07] p-6 backdrop-blur-sm"
      data-lp-reveal
    >
      <div className="flex items-center justify-between">
        <div className="grid size-11 place-items-center rounded-2xl bg-violet-400/15 text-violet-200 ring-1 ring-white/10">
          <Icon className="size-5" />
        </div>
        <Check className="size-5 text-emerald-300" />
      </div>
      <div className="mt-6 font-display text-4xl font-black tracking-[-.055em] text-white">
        {number}
      </div>
      <h3 className="mt-1 text-lg font-black text-violet-200">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-6 text-violet-100/70">{description}</p>
    </article>
  );
}

function FlowStep({
  step,
  icon: Icon,
  title,
  description,
}: {
  step: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[.07] p-5">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-violet-400/15 text-violet-200">
          <Icon className="size-5" />
        </div>
        <span className="text-sm font-black tracking-[.12em] text-fuchsia-300">{step}</span>
      </div>
      <h4 className="mt-5 text-lg font-black">{title}</h4>
      <p className="mt-2 text-sm font-medium leading-6 text-violet-100/70">{description}</p>
    </article>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center text-violet-300" aria-hidden>
      <ChevronRight className="hidden size-6 lg:block" />
      <div className="h-6 w-px bg-gradient-to-b from-violet-300 to-transparent lg:hidden" />
    </div>
  );
}

function ConfidenceRow({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-violet-100 text-sm font-black text-violet-700">
        {number}
      </div>
      <div>
        <h3 className="text-base font-black text-[#2d1b3b]">{title}</h3>
        <p className="mt-1 text-sm font-medium leading-6 text-[#73627e]">{description}</p>
      </div>
    </div>
  );
}

function OfferEyebrow({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <div
      className={`text-sm font-black uppercase tracking-[.16em] ${dark ? "text-violet-300" : "text-violet-700"}`}
    >
      {children}
    </div>
  );
}

function OfferProofMotionStyles() {
  return (
    <style>{`
      .marcia-offer-border {
        position: relative;
        isolation: isolate;
      }

      .marcia-offer-border::before {
        content: "";
        position: absolute;
        inset: -1px;
        z-index: 2;
        border-radius: inherit;
        padding: 1px;
        pointer-events: none;
        background: linear-gradient(
          110deg,
          rgba(139, 92, 246, .18) 0%,
          rgba(139, 92, 246, .18) 24%,
          rgba(192, 132, 252, .78) 43%,
          rgba(236, 72, 153, .58) 50%,
          rgba(139, 92, 246, .18) 68%,
          rgba(139, 92, 246, .18) 100%
        );
        background-size: 260% 100%;
        animation: marcia-offer-border-drift 9s ease-in-out infinite;
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
      }

      .marcia-proof-flow::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        box-shadow: inset 0 0 48px rgba(167, 139, 250, .08);
      }

      @keyframes marcia-offer-border-drift {
        0%, 100% { background-position: 0% 50%; opacity: .65; }
        50% { background-position: 100% 50%; opacity: 1; }
      }

      @media (prefers-reduced-motion: reduce) {
        .marcia-offer-border::before {
          animation: none;
          background-position: 50% 50%;
        }
      }
    `}</style>
  );
}
