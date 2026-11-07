import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  FileText,
  Lock,
  Menu,
  MessageCircle,
  Mic,
  PieChart,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  WalletCards,
  X,
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
import type { PublicPlan } from "@/lib/billing/public-plan-rules";
import { LandingPhone } from "./landing-phone";

export type FinancePlan = PublicPlan;

type Props = {
  plans: FinancePlan[];
  plansUnavailable?: boolean;
  /** Usado somente nos cards de plano (acrescenta ?plano=slug). */
  signupHref?: string;
  /** CTAs genéricos de teste/cadastro: sem plano escolhido, levam aos planos. */
  plansHref?: string;
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

const SLOGAN = "Sua assistente financeira na palma da mão.";

const FAQS = [
  ["Preciso entender de finanças?", "Não. Você fala como falaria com uma pessoa. A MIA organiza, pergunta o que faltar e mostra o resultado em palavras simples."],
  ["Ela registra algo sem eu conferir?", "Não. Quando faltar uma informação, a MIA pergunta. Antes de concluir uma ação sensível, ela mostra o que entendeu para você confirmar."],
  ["Como funciona no WhatsApp?", "Você vincula seu celular ao canal da MIA. Só números autorizados acessam sua conta, e você pode mandar texto, áudio, foto ou PDF."],
  ["Consigo usar sem WhatsApp?", "Sim. Voz, texto e envio de comprovantes funcionam diretamente no aplicativo."],
  ["Posso instalar no celular?", "Sim. O sistema abre pelo navegador e pode ser instalado na tela inicial como aplicativo."],
  ["Ela conecta automaticamente com meu banco?", "Não nesta versão. Você organiza contas, cartões e saldos sem entregar acesso bancário."],
  ["A MIA movimenta meu dinheiro?", "Não. Ela organiza informações, mostra alertas e ajuda a interpretar o mês. Pagamentos continuam sempre com você."],
];

const MARQUEE: Array<[LucideIcon, string]> = [
  [MessageCircle, "WhatsApp"], [Mic, "Áudio"], [Camera, "Foto de nota"], [FileText, "PDF"],
  [BarChart3, "Relatório mensal"], [Bell, "Lembretes"], [CalendarDays, "Calendário"], [Target, "Metas"],
];

const STEPS: Array<{ icon: LucideIcon; title: string; text: string; example: string }> = [
  { icon: Mic, title: "Fale", text: "Mande um áudio, texto ou foto como se falasse com uma amiga.", example: "“Paguei R$ 84,90 no mercado pelo Pix.”" },
  { icon: Sparkles, title: "A MIA organiza", text: "Valor, categoria, data e forma de pagamento entram no lugar certo.", example: "Mercado · Alimentação · Pix" },
  { icon: Target, title: "Você decide", text: "Pergunte o que quiser e receba a resposta com base no seu mês.", example: "“Ainda posso gastar com lazer?”" },
];

const UNDERSTANDS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: MessageCircle, title: "Texto", text: "Escreva do seu jeito, sem formulário." },
  { icon: Mic, title: "Áudio", text: "Fale e a MIA transcreve e registra." },
  { icon: Camera, title: "Foto de nota", text: "Envie o comprovante e ela lê os dados." },
  { icon: FileText, title: "PDF", text: "Boletos e extratos viram lançamentos." },
];

const FEATURES: Array<{ icon: LucideIcon; title: string; text: string; wide?: boolean }> = [
  { icon: BarChart3, title: "Visão do mês", text: "Saldo, entradas, saídas e sobra prevista num só olhar, com comparação ao mês anterior.", wide: true },
  { icon: CalendarDays, title: "Planejamento", text: "Contas a pagar e a receber em ordem." },
  { icon: Bell, title: "Lembretes", text: "Avisos antes do vencimento, no app e no WhatsApp." },
  { icon: WalletCards, title: "Contas e cartões", text: "Saldos e faturas sem misturar valores." },
  { icon: PieChart, title: "Categorias", text: "Veja para onde o dinheiro vai." },
  { icon: FileText, title: "Relatório mensal em PDF", text: "Um resumo bonito do mês, pronto para guardar ou compartilhar.", wide: true },
];

const TRUST: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Lock, title: "Sem acesso ao banco", text: "Você nunca entrega senha bancária." },
  { icon: ShieldCheck, title: "Você confirma", text: "Nada sensível é feito sem sua confirmação." },
  { icon: Smartphone, title: "Números autorizados", text: "Só o seu celular conversa com sua conta." },
];

export function FinanceLanding({
  plans,
  plansUnavailable = false,
  signupHref = "/entrar?modo=signup",
  plansHref = "#planos",
  loginHref = "/entrar?modo=login",
  brandName = brand.name,
  assistantName = brand.assistantName,
  tagline = SLOGAN,
  logoUrl = null,
  avatarUrl = null,
  legalName = legalProfile.name,
  legalDocument = legalProfile.document,
  contactEmail = legalProfile.email,
  contactAddress = legalProfile.address,
}: Props) {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const avatar = avatarUrl || fallbackAvatarUrl;
  const p = (v: string) => personalizeAssistantText(v, assistantName);

  const orderedPlans = useMemo(
    () =>
      plans
        .map((plan) => ({
          ...plan,
          description: p(plan.description),
          features: plan.features.map(p),
        }))
        .sort(
          (a, b) =>
            Number(!!b.free) - Number(!!a.free) ||
            Number(a.price.replace(/\./g, "").replace(",", ".")) - Number(b.price.replace(/\./g, "").replace(",", ".")),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plans, assistantName],
  );
  const planSignupHref = (slug: string) =>
    `${signupHref}${signupHref.includes("?") ? "&" : "?"}plano=${encodeURIComponent(slug)}`;
  const freePlan = orderedPlans.find((plan) => plan.free);
  const trialHref = freePlan ? planSignupHref(freePlan.slug) : plansHref;
  const featuredSlug =
    orderedPlans.find((x) => x.featured)?.slug ?? orderedPlans[Math.floor(orderedPlans.length / 2)]?.slug;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal], [data-stagger]"));
    if (!("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("cl-visible"));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("cl-visible");
          obs.unobserve(e.target);
        }),
      { rootMargin: "0px 0px -8%", threshold: 0.08 },
    );
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, []);

  const onHeroMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = heroRef.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const navLinks = [
    ["#como-funciona", "Como funciona"],
    ["#mia", `Conheça a ${assistantName}`],
    ["#recursos", "Recursos"],
    ["#planos", "Planos"],
    ["#faq", "Dúvidas"],
  ];

  return (
    <div ref={rootRef} data-force-motion="gentle" className="min-h-screen overflow-x-hidden bg-ln-bg pb-24 font-sans text-ln-ink lg:pb-0">
      {/* Topo */}
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
        <nav className="cl-nav ln-glass mx-auto flex h-14 max-w-6xl items-center rounded-2xl px-3.5 sm:px-5">
          <a href="#inicio" className="flex min-w-0 items-center gap-2.5">
            <Logo logoUrl={logoUrl} name={brandName} />
            <span className="truncate font-sora text-base font-bold tracking-tight">{brandName}</span>
          </a>
          <div className="ml-auto hidden items-center gap-6 text-[13px] font-semibold text-ln-muted lg:flex">
            {navLinks.map(([href, label]) => (
              <a key={href} href={href} className="transition hover:text-ln-ink">{label}</a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5 lg:ml-6">
            <a href={loginHref} className="hidden rounded-xl px-3 py-2 text-[13px] font-bold text-ln-muted transition hover:text-ln-ink sm:block">Entrar</a>
            <a href={trialHref} className="hidden h-10 items-center gap-1.5 rounded-xl ln-gradient px-4 text-[13px] font-bold text-ln-ink transition hover:-translate-y-0.5 sm:inline-flex">
              Começar <ArrowRight className="size-3.5" />
            </a>
            <button type="button" aria-label="Abrir menu" onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center rounded-xl ln-glass lg:hidden">
              <Menu className="size-5" />
            </button>
          </div>
        </nav>
      </header>

      {/* Menu mobile (abre de baixo) */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <button aria-label="Fechar menu" className="absolute inset-0 bg-ln-bg/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="ln-bubble absolute inset-x-0 bottom-0 rounded-t-[28px] border-t border-ln-line bg-ln-surface p-5 pb-8">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ln-line" />
            <div className="flex items-center justify-between">
              <span className="font-sora font-bold">{brandName}</span>
              <button aria-label="Fechar" onClick={() => setMenuOpen(false)} className="grid size-10 place-items-center rounded-xl ln-glass"><X className="size-5" /></button>
            </div>
            <div className="mt-4 grid gap-1">
              {navLinks.map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3.5 text-base font-semibold transition hover:bg-ln-glass">{label}</a>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={loginHref} className="flex h-12 items-center justify-center rounded-2xl ln-glass font-bold">Entrar</a>
              <a href={trialHref} className="flex h-12 items-center justify-center rounded-2xl ln-gradient font-bold">Começar grátis</a>
            </div>
          </div>
        </div>
      )}

      <main>
        {/* Abertura */}
        <section id="inicio" ref={heroRef} onPointerMove={onHeroMove} className="relative overflow-hidden px-5 pb-16 pt-28 sm:pt-32 lg:pb-24">
          <div className="ln-grid-bg pointer-events-none absolute inset-0" />
          <div className="ln-spotlight pointer-events-none absolute inset-0" />
          <div className="ln-blob pointer-events-none absolute -right-32 top-10 size-96 rounded-full bg-ln-magenta/30 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
            <div className="cl-hero-copy text-center lg:text-left">
              <div className="ln-glass mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold lg:mx-0">
                <img src={avatar} alt="" className="size-5 rounded-full object-cover" />
                Conheça a {assistantName}, sua assistente com IA
              </div>
              <h1 className="mt-6 font-sora text-[clamp(2.6rem,9vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">
                Fale. <span className="ln-gradient-text">A {assistantName} anota.</span>
                <span className="block text-ln-muted">Seu dinheiro faz sentido.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-ln-muted sm:text-lg lg:mx-0">
                {SLOGAN} Mande um áudio, uma foto ou uma mensagem — o {brandName} organiza gastos, contas e metas para você.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <a href={trialHref} className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl ln-gradient px-7 text-base font-bold ln-glow transition hover:-translate-y-0.5">
                  Começar grátis <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </a>
                <a href="#como-funciona" className="inline-flex h-14 items-center justify-center rounded-2xl ln-glass px-7 text-base font-semibold transition hover:bg-ln-surface">
                  Ver como funciona
                </a>
              </div>
              <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-ln-muted lg:justify-start">
                <span className="inline-flex items-center gap-1.5"><Check className="size-4 text-ln-lime" /> Sem cartão no plano grátis</span>
                <span className="inline-flex items-center gap-1.5"><Check className="size-4 text-ln-lime" /> Funciona no WhatsApp</span>
              </div>
            </div>
            <LandingPhone assistantName={assistantName} avatar={avatar} />
          </div>
        </section>

        {/* Faixa */}
        <div className="overflow-hidden border-y border-ln-line py-4">
          <div className="ln-marquee flex w-max gap-10">
            {[...MARQUEE, ...MARQUEE].map(([Icon, label], i) => (
              <span key={i} className="inline-flex items-center gap-2 whitespace-nowrap font-sora text-sm font-semibold text-ln-muted">
                <Icon className="size-4 text-ln-magenta" /> {label}
              </span>
            ))}
          </div>
        </div>

        {/* Como funciona */}
        <Section id="como-funciona" eyebrow="Como funciona" title="Três passos. Nenhuma planilha.">
          <div data-stagger className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text, example }, i) => (
              <article key={title} className="group relative overflow-hidden rounded-3xl ln-glass p-6 transition hover:-translate-y-1">
                <span className="absolute right-5 top-3 font-sora text-6xl font-extrabold text-ln-line">0{i + 1}</span>
                <div className="grid size-12 place-items-center rounded-2xl ln-gradient"><Icon className="size-5" /></div>
                <h3 className="mt-5 font-sora text-xl font-bold">{p(title)}</h3>
                <p className="mt-2 text-sm leading-6 text-ln-muted">{p(text)}</p>
                <div className="mt-5 rounded-2xl border border-ln-line bg-ln-bg/60 px-4 py-3 text-[13px] font-medium">{example}</div>
              </article>
            ))}
          </div>
        </Section>

        {/* Conheça a MIA */}
        <Section id="mia" eyebrow={`Conheça a ${assistantName}`} title="Ela entende do seu jeito.">
          <div className="mt-10 grid items-center gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div data-reveal className="relative mx-auto">
              <span className="ln-aura absolute -inset-6 rounded-full ln-gradient opacity-50 blur-2xl" />
              <img src={avatar} alt={assistantName} className="relative size-56 rounded-full border-4 border-ln-line object-cover sm:size-72" />
              <div className="ln-floaty ln-glass absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold">
                <Zap className="size-4 text-ln-lime" /> Responde em segundos
              </div>
            </div>
            <div data-stagger className="grid grid-cols-2 gap-3 sm:gap-4">
              {UNDERSTANDS.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-3xl ln-glass p-5 transition hover:border-ln-magenta/50">
                  <Icon className="ln-floaty size-7 text-ln-magenta" />
                  <h3 className="mt-4 font-sora text-base font-bold">{title}</h3>
                  <p className="mt-1 text-[13px] leading-5 text-ln-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </Section>

        {/* Painel */}
        <Section id="por-dentro" eyebrow="Por dentro do painel" title="O mês inteiro, num só olhar.">
          <div data-reveal className="mt-10 rounded-[32px] ln-glass p-4 sm:p-7 ln-glow">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Saldo do período", "R$ 2.418,60", "text-ln-ink"],
                ["Entrou", "R$ 5.200,00", "text-ln-lime"],
                ["Saiu", "R$ 2.781,40", "text-ln-magenta"],
                ["Sobra prevista", "R$ 1.136,20", "text-ln-ink"],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-2xl border border-ln-line bg-ln-bg/60 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ln-muted">{label}</div>
                  <div className={`mt-2 font-sora text-lg font-bold sm:text-2xl ${color}`}>{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex h-40 items-end gap-2 rounded-2xl border border-ln-line bg-ln-bg/60 p-4 sm:h-52">
              {[40, 62, 48, 75, 55, 88, 66, 92, 58, 80, 70, 96].map((h, i) => (
                <div key={i} className="ln-bar flex-1 rounded-t-lg ln-gradient" style={{ height: `${h}%`, transitionDelay: `${i * 60}ms` }} />
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-ln-muted">Ilustração com valores de exemplo.</p>
          </div>
        </Section>

        {/* Recursos */}
        <Section id="recursos" eyebrow="Recursos" title="Tudo o que você precisa, nada que atrapalhe.">
          <div data-stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text, wide }) => (
              <article key={title} className={`rounded-3xl ln-glass p-6 transition hover:-translate-y-1 ${wide ? "sm:col-span-2" : ""}`}>
                <Icon className="size-6 text-ln-lime" />
                <h3 className="mt-4 font-sora text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ln-muted">{text}</p>
              </article>
            ))}
          </div>
        </Section>

        {/* Segurança */}
        <Section eyebrow="Você no controle" title="Segurança sem complicação.">
          <div data-stagger className="mt-10 grid gap-4 md:grid-cols-3">
            {TRUST.map(({ icon: Icon, title, text }) => (
              <article key={title} className="flex items-start gap-4 rounded-3xl ln-glass p-5">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ln-violet/25"><Icon className="size-5 text-ln-ink" /></div>
                <div>
                  <h3 className="font-sora font-bold">{title}</h3>
                  <p className="mt-1 text-sm text-ln-muted">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </Section>

        {/* Planos */}
        <Section id="planos" eyebrow="Planos" title="Escolha seu ritmo.">
          <div data-stagger className="mx-auto mt-10 grid max-w-md grid-cols-1 gap-5 lg:max-w-none lg:grid-cols-3 lg:items-stretch">
            {orderedPlans.length === 0 && (
              <p role="status" className="col-span-full py-8 text-center text-ln-muted">
                {plansUnavailable ? "Não foi possível carregar os planos. Tente novamente em instantes." : "Nenhum plano disponível no momento."}
              </p>
            )}
            {orderedPlans.map((plan) => {
              const hot = plan.slug === featuredSlug;
              return (
                <article
                  key={plan.slug}
                  className={`relative flex flex-col rounded-[28px] p-6 sm:p-7 ${hot ? "ln-gradient ln-glow lg:scale-105" : "ln-glass"}`}
                >
                  {hot && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ln-lime px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-ln-bg">
                      Mais escolhido
                    </span>
                  )}
                  <div className="font-sora text-sm font-bold uppercase tracking-widest">{plan.name}</div>
                  {plan.free ? (
                    <div className="mt-4 font-sora text-4xl font-extrabold">SEM CUSTO</div>
                  ) : (
                    <div className="mt-4 flex items-end gap-1">
                      <span className="mb-2 text-sm font-bold">R$</span>
                      <span className="font-sora text-5xl font-extrabold tracking-tight">{plan.price}</span>
                      <span className="mb-2 text-sm opacity-70">/mês</span>
                    </div>
                  )}
                  <p className="mt-3 text-sm leading-6 opacity-80">{plan.description}</p>
                  {(plan.trialDays || 0) > 0 && (
                    <div className="mt-4 rounded-xl bg-ln-bg/40 px-3 py-2 text-xs font-bold text-ln-lime">
                      {plan.free ? `${plan.trialDays} dias grátis · sem cartão` : `${plan.trialDays} dias para testar · condições no checkout`}
                    </div>
                  )}
                  <div className="my-5 h-px bg-ln-line" />
                  <ul className="flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm font-medium">
                        <Check className="mt-0.5 size-4 shrink-0 text-ln-lime" /> {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={planSignupHref(plan.slug)}
                    className={`mt-7 inline-flex h-13 min-h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition hover:-translate-y-0.5 ${hot ? "bg-ln-ink text-ln-bg" : "ln-gradient"}`}
                  >
                    Começar com {plan.name} <ArrowRight className="size-4" />
                  </a>
                </article>
              );
            })}
          </div>
        </Section>

        {/* FAQ */}
        <Section id="faq" eyebrow="Dúvidas" title="Perguntas diretas.">
          <div data-reveal className="mx-auto mt-10 max-w-3xl divide-y divide-ln-line overflow-hidden rounded-3xl ln-glass">
            {FAQS.map(([q, a], i) => (
              <div key={q}>
                <button
                  type="button"
                  aria-expanded={faqOpen === i}
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold sm:px-6"
                >
                  <span>{p(q)}</span>
                  <ChevronDown className={`size-5 shrink-0 text-ln-magenta transition ${faqOpen === i ? "rotate-180" : ""}`} />
                </button>
                <div className={`grid transition-all duration-300 ${faqOpen === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <p className="overflow-hidden px-5 text-sm leading-6 text-ln-muted sm:px-6">
                    <span className="block pb-5">{p(a)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Chamada final */}
        <section className="px-5 py-16">
          <div data-reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] ln-gradient p-8 text-center ln-glow sm:p-14">
            <div className="ln-blob absolute -left-20 -top-20 size-72 rounded-full bg-ln-lime/25 blur-3xl" />
            <img src={avatar} alt="" className="relative mx-auto size-16 rounded-full border-2 border-ln-ink/40 object-cover" />
            <h2 className="relative mx-auto mt-5 max-w-2xl font-sora text-[clamp(2rem,6vw,3.5rem)] font-extrabold leading-tight tracking-tight">
              Organize o mês começando por uma frase.
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-ln-ink/80">{SLOGAN}</p>
            <a href={trialHref} className="relative mt-8 inline-flex h-14 items-center gap-2 rounded-2xl bg-ln-ink px-8 font-bold text-ln-bg transition hover:-translate-y-0.5">
              Começar grátis agora <ArrowRight className="size-4" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-ln-line px-5 pb-8 pt-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-9 border-b border-ln-line pb-9 sm:grid-cols-2 lg:grid-cols-[1.3fr_.7fr_.8fr_1.1fr]">
            <div>
              <div className="flex items-center gap-3">
                <Logo logoUrl={logoUrl} name={brandName} />
                <div>
                  <div className="font-sora text-lg font-bold">{brandName}</div>
                  <div className="text-xs font-semibold text-ln-magenta">{tagline}</div>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-ln-muted">
                Controle financeiro por conversa com a {assistantName}, com lembretes e um painel que qualquer pessoa entende.
              </p>
            </div>
            <FooterColumn title="Produto">
              <a href="#como-funciona">Como funciona</a>
              <a href="#mia">Conheça a {assistantName}</a>
              <a href="#recursos">Recursos</a>
              <a href="#planos">Planos</a>
            </FooterColumn>
            <FooterColumn title="Acesso e políticas">
              <a href={loginHref}>Entrar</a>
              <a href="#faq">Perguntas frequentes</a>
              <a href="/termos">Termos de uso</a>
              <a href="/privacidade">Privacidade</a>
              <a href="/reembolso">Cancelamento e reembolso</a>
            </FooterColumn>
            <div data-company-footer>
              <div className="text-[10px] font-bold uppercase tracking-[.16em] text-ln-magenta">Empresa e atendimento</div>
              <div className="mt-4 space-y-3 text-[13px] leading-5 text-ln-muted">
                <div className="font-bold text-ln-ink">{legalName || brandName}</div>
                {legalDocument && <div>CNPJ: {legalDocument}</div>}
                {contactAddress && <div>{contactAddress}</div>}
                {contactEmail && <a className="block hover:text-ln-ink" href={`mailto:${contactEmail}`}>{contactEmail}</a>}
                {supportConfigured ? (
                  <a href={supportWhatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-bold text-ln-lime">
                    <MessageCircle className="size-4" /> WhatsApp {supportWhatsappDisplay}
                  </a>
                ) : (
                  <div>Atendimento disponível pela área logada.</div>
                )}
              </div>
            </div>
          </div>
          <div className="pt-6 text-[11px] text-ln-muted">
            © {new Date().getFullYear()} {legalName || brandName}. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Barra fixa mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 p-3 lg:hidden">
        <a href={trialHref} className="ln-glass flex h-14 items-center justify-between gap-3 rounded-2xl bg-ln-surface/80 pl-2 pr-2">
          <span className="flex items-center gap-2.5">
            <img src={avatar} alt="" className="size-10 rounded-xl object-cover" />
            <span className="text-sm font-semibold leading-tight">Fale com a {assistantName}<span className="block text-xs text-ln-muted">Comece sem custo</span></span>
          </span>
          <span className="inline-flex h-10 items-center gap-1.5 rounded-xl ln-gradient px-4 text-sm font-bold">
            Começar <ArrowRight className="size-4" />
          </span>
        </a>
      </div>
    </div>
  );
}

function Section({ id, eyebrow, title, children }: { id?: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full ln-glass px-3 py-1 text-[11px] font-bold uppercase tracking-[.16em] text-ln-magenta">
            <ReceiptText className="size-3.5" /> {eyebrow}
          </div>
          <h2 className="mt-4 font-sora text-[clamp(2rem,6vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-0.04em]">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[.16em] text-ln-magenta">{title}</div>
      <div className="mt-4 flex flex-col gap-3 text-[13px] font-semibold text-ln-muted [&_a:hover]:text-ln-ink [&_a]:transition">{children}</div>
    </div>
  );
}

function Logo({ logoUrl, name }: { logoUrl?: string | null; name: string }) {
  if (logoUrl) return <img src={logoUrl} alt={name} className="size-9 rounded-xl object-contain" />;
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl ln-gradient font-sora font-bold text-ln-ink">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
