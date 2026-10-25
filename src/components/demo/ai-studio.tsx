import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Bot,
  BrainCircuit,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  MessageCircle,
  Paperclip,
  Play,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import fallbackAvatarUrl from "@/assets/marcia-avatar-640.png";
import { PageHeader } from "@/components/marcia/page-kit";
import { useBrand } from "@/contexts/brand-context";
import { personalizeAssistantText } from "@/config/brand";

type PersonalityId = "acolhedora" | "objetiva" | "consultiva";
type Tone = "Natural" | "Profissional" | "Descontraído";

type ChatMessage = {
  id: number;
  from: "assistant" | "user";
  text: string;
  meta?: string;
};

const personalities: Array<{
  id: PersonalityId;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "acolhedora",
    title: "Acolhedora",
    description: "Escuta, tranquiliza e conduz com cuidado.",
    icon: Sparkles,
  },
  {
    id: "objetiva",
    title: "Objetiva",
    description: "Respostas rápidas, claras e diretas.",
    icon: Zap,
  },
  {
    id: "consultiva",
    title: "Consultiva",
    description: "Entende a necessidade antes de recomendar.",
    icon: BrainCircuit,
  },
];

const knowledgeSources = [
  {
    title: "Serviços e preços",
    detail: "12 itens sincronizados",
    icon: BookOpenCheck,
    color: "bg-violet-100 text-violet-700",
  },
  {
    title: "Agenda da equipe",
    detail: "Disponibilidade em tempo real",
    icon: Clock3,
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    title: "Políticas do studio",
    detail: "4 orientações cadastradas",
    icon: FileText,
    color: "bg-amber-100 text-amber-700",
  },
];

export function AiStudioDemo() {
  const branding = useBrand();
  const [assistantName, setAssistantName] = useState(branding.assistantName);
  const [personality, setPersonality] = useState<PersonalityId>("acolhedora");
  const [tone, setTone] = useState<Tone>("Natural");
  const [creativity, setCreativity] = useState(48);
  const [instructions, setInstructions] = useState(
    "Atenda com carinho, confirme o serviço desejado e ofereça até três horários. Nunca invente preço ou disponibilidade. Quando houver dúvida clínica, encaminhe para uma pessoa da equipe.",
  );
  const [saved, setSaved] = useState(false);
  const [automations, setAutomations] = useState({
    firstResponse: true,
    qualify: true,
    scheduling: true,
    followUp: false,
  });
  const [testInput, setTestInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      from: "assistant",
      text: `Oi! Eu sou ${branding.assistantName}, assistente do Studio Aurora. Como posso cuidar de você hoje? ✨`,
      meta: "Respondido em 2s",
    },
    { id: 2, from: "user", text: "Quero fazer uma limpeza de pele. Tem horário amanhã?" },
    {
      id: 3,
      from: "assistant",
      text: "Claro! A limpeza de pele premium dura 60 minutos e custa R$ 180. Amanhã tenho 10:30 com a Ana ou 15:00 com a Bia. Qual fica melhor para você?",
      meta: "Usou Serviços + Agenda",
    },
  ]);

  useEffect(() => {
    setAssistantName(branding.assistantName);
    setMessages((current) =>
      current.map((message) => ({
        ...message,
        text: personalizeAssistantText(message.text, branding.assistantName),
      })),
    );
  }, [branding.assistantName]);

  const selectedPersonality = useMemo(
    () => personalities.find((item) => item.id === personality) ?? personalities[0],
    [personality],
  );

  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2800);
  };

  const sendTest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanInput = testInput.trim();
    if (!cleanInput) return;

    const nextId = messages.length + 1;
    const lowerInput = cleanInput.toLocaleLowerCase("pt-BR");
    const response =
      lowerInput.includes("preço") || lowerInput.includes("valor")
        ? `Posso ajudar! A limpeza de pele custa R$ 180 e a massagem relaxante R$ 150. Quer que eu procure um horário para algum deles?`
        : lowerInput.includes("horário") || lowerInput.includes("agenda")
          ? "Tenho opções amanhã às 10:30 e às 15:00. Se me disser o serviço, confirmo também a duração e a profissional disponível."
          : `Entendi. Como ${selectedPersonality.title.toLocaleLowerCase("pt-BR")}, eu perguntaria qual serviço você procura e já apresentaria as melhores opções do Studio Aurora.`;

    setMessages((current) => [
      ...current,
      { id: nextId, from: "user", text: cleanInput },
      { id: nextId + 1, from: "assistant", text: response, meta: `${tone} · teste local` },
    ]);
    setTestInput("");
  };

  const resetTest = () => {
    setMessages([
      {
        id: 1,
        from: "assistant",
        text: `Oi! Eu sou ${assistantName || branding.assistantName}. Como posso ajudar você hoje?`,
        meta: "Conversa reiniciada",
      },
    ]);
  };

  const toggleAutomation = (key: keyof typeof automations) => {
    setAutomations((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cérebro da sua operação"
        title={`IA de ${branding.assistantName}`}
        description="Defina como sua assistente atende, o que ela sabe e quando deve chamar sua equipe."
        action={
          <button
            type="button"
            onClick={save}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-4 text-sm font-extrabold text-white shadow-[0_14px_30px_-16px_rgba(109,40,217,.9)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            {saved ? <Check className="size-4" /> : <WandSparkles className="size-4" />}
            {saved ? "Configuração salva na prévia" : "Salvar configuração"}
          </button>
        }
      />

      <div className="relative overflow-hidden rounded-[28px] border border-violet-200 bg-[linear-gradient(120deg,#24103f_0%,#5b21b6_52%,#a21caf_100%)] p-5 text-white shadow-[0_28px_70px_-38px_rgba(76,29,149,.9)] sm:p-7">
        <div
          aria-hidden
          className="absolute -right-16 -top-24 size-72 rounded-full bg-fuchsia-400/25 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 left-1/3 size-64 rounded-full bg-violet-300/20 blur-3xl"
        />
        <div className="relative grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.12em] text-violet-50 backdrop-blur">
              <span className="relative size-2 rounded-full bg-emerald-400">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300 opacity-60" />
              </span>{" "}
              Assistente ativa · modo demonstração
            </div>
            <h2 className="mt-4 font-display text-2xl font-black tracking-[-.035em] sm:text-3xl">
              Uma atendente com o jeito da sua marca.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-violet-100">
              Ela consulta serviços e agenda, responde dúvidas, sugere horários e entrega a conversa
              para uma pessoa quando necessário.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <FeatureChip icon={ShieldCheck} label="Limites configuráveis" />
              <FeatureChip icon={BadgeCheck} label="Usa dados do negócio" />
              <FeatureChip icon={MessageCircle} label="Teste antes de ativar" />
            </div>
          </div>
          <div className="relative flex min-h-[180px] items-end justify-center rounded-[24px] border border-white/15 bg-white/10 px-5 pt-4 backdrop-blur-sm sm:justify-end">
            <div className="absolute left-5 top-5 max-w-[180px] sm:max-w-[220px]">
              <div className="text-[10px] font-bold uppercase tracking-[.12em] text-violet-200">
                Perfil atual
              </div>
              <div className="mt-1 font-display text-lg font-black">
                {selectedPersonality.title}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-violet-100">
                {selectedPersonality.description}
              </p>
            </div>
            <img
              src={branding.avatarUrl || fallbackAvatarUrl}
              alt={`${branding.assistantName}, assistente virtual`}
              className="pointer-events-none -mb-5 ml-auto max-h-[205px] w-[155px] object-contain object-bottom drop-shadow-[0_20px_22px_rgba(18,5,39,.45)] sm:w-[180px]"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(390px,.92fr)]">
        <div className="space-y-5">
          <section className="rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
            <SectionHeading
              icon={Bot}
              title="Identidade da assistente"
              description="Nome, personalidade e tom percebidos pelos clientes"
              step="01"
            />
            <div className="mt-5">
              <label className="text-xs font-extrabold">
                Nome da assistente
                <input
                  value={assistantName}
                  onChange={(event) => setAssistantName(event.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </label>
            </div>
            <div className="mt-5">
              <div className="mb-2 text-xs font-extrabold">Personalidade principal</div>
              <div className="grid gap-2 md:grid-cols-3">
                {personalities.map((item) => {
                  const Icon = item.icon;
                  const active = item.id === personality;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPersonality(item.id)}
                      className={`rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${active ? "border-violet-400 bg-violet-50 shadow-[0_10px_24px_-18px_rgba(109,40,217,.8)]" : "border-border bg-background/60 hover:border-violet-200"}`}
                    >
                      <div
                        className={`grid size-8 place-items-center rounded-xl ${active ? "bg-violet-700 text-white" : "bg-muted text-muted-foreground"}`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className={`mt-3 text-xs font-black ${active ? "text-violet-800" : ""}`}>
                        {item.title}
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_180px]">
              <div>
                <div className="mb-2 text-xs font-extrabold">Tom de voz</div>
                <div className="flex rounded-xl border border-border bg-background p-1">
                  {(["Natural", "Profissional", "Descontraído"] as Tone[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTone(item)}
                      className={`flex-1 rounded-lg px-2 py-2 text-[10px] font-extrabold transition ${tone === item ? "bg-violet-700 text-white shadow-sm" : "text-muted-foreground hover:text-violet-700"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <label className="text-xs font-extrabold">
                Criatividade <span className="float-right text-violet-700">{creativity}%</span>
                <input
                  aria-label="Criatividade das respostas"
                  type="range"
                  min="10"
                  max="90"
                  value={creativity}
                  onChange={(event) => setCreativity(Number(event.target.value))}
                  className="mt-4 w-full accent-violet-700"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Consistente</span>
                  <span>Criativa</span>
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
            <SectionHeading
              icon={Target}
              title="Objetivo e instruções"
              description="Explique o que fazer e também o que nunca fazer"
              step="02"
            />
            <label className="mt-5 block text-xs font-extrabold">
              Objetivo principal
              <select
                defaultValue="agenda"
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value="agenda">Converter conversas em agendamentos</option>
                <option value="support">Responder dúvidas e orientar clientes</option>
                <option value="qualify">Qualificar oportunidades para a equipe</option>
              </select>
            </label>
            <label className="mt-4 block text-xs font-extrabold">
              Instruções personalizadas
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={5}
                className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-relaxed outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <span className="mt-1 block text-right text-[10px] font-normal text-muted-foreground">
                {instructions.length}/600 caracteres
              </span>
            </label>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-700" />
                <div>
                  <div className="text-xs font-extrabold text-amber-900">
                    Limite de segurança ativo
                  </div>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-amber-800">
                    A IA não inventa preços ou disponibilidade e encaminha assuntos sensíveis para a
                    equipe.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
            <SectionHeading
              icon={Zap}
              title="Automações"
              description={`Escolha onde ${branding.assistantName} entra sozinha`}
              step="03"
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <AutomationToggle
                title="Primeira resposta"
                detail="Recebe novos contatos em segundos"
                checked={automations.firstResponse}
                onChange={() => toggleAutomation("firstResponse")}
              />
              <AutomationToggle
                title="Qualificação"
                detail="Entende serviço, urgência e preferência"
                checked={automations.qualify}
                onChange={() => toggleAutomation("qualify")}
              />
              <AutomationToggle
                title="Sugestão de horários"
                detail="Consulta a agenda antes de responder"
                checked={automations.scheduling}
                onChange={() => toggleAutomation("scheduling")}
              />
              <AutomationToggle
                title="Retomar contato"
                detail="Fala com quem não concluiu"
                checked={automations.followUp}
                onChange={() => toggleAutomation("followUp")}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <section className="overflow-hidden rounded-[26px] border border-violet-200 bg-card shadow-[0_24px_60px_-38px_rgba(76,29,149,.6)]">
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-violet-50 to-fuchsia-50 p-4">
              <div className="flex items-center gap-3">
                <div className="relative grid size-10 place-items-center overflow-hidden rounded-xl bg-violet-700">
                  <img
                    src={branding.avatarUrl || fallbackAvatarUrl}
                    alt=""
                    className="absolute inset-x-0 top-1 h-12 object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-sm font-black">
                    Testar {assistantName || branding.assistantName}
                  </h2>
                  <p className="flex items-center gap-1 text-[10px] text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> on-line agora
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetTest}
                aria-label="Reiniciar conversa de teste"
                className="grid size-9 place-items-center rounded-xl border border-violet-200 bg-white text-violet-700 transition hover:bg-violet-100"
              >
                <RefreshCw className="size-4" />
              </button>
            </div>
            <div className="h-[410px] space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#faf8ff,#f5f0fb)] p-4">
              <div className="mx-auto w-fit rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-muted-foreground shadow-sm">
                Conversa simulada · dados ilustrativos
              </div>
              {messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  assistantName={assistantName || branding.assistantName}
                />
              ))}
            </div>
            <form onSubmit={sendTest} className="border-t border-border bg-white p-3">
              <div className="flex items-center gap-2 rounded-2xl border border-violet-200 bg-background px-2 py-1.5 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
                <button
                  type="button"
                  aria-label="Anexar ao teste"
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-violet-100 hover:text-violet-700"
                >
                  <Paperclip className="size-4" />
                </button>
                <input
                  value={testInput}
                  onChange={(event) => setTestInput(event.target.value)}
                  placeholder="Escreva como se fosse um cliente..."
                  className="h-9 min-w-0 flex-1 bg-transparent text-xs outline-none"
                />
                <button
                  type="submit"
                  aria-label="Enviar mensagem de teste"
                  className="grid size-9 place-items-center rounded-xl bg-violet-700 text-white shadow-md transition hover:bg-violet-800 disabled:opacity-40"
                  disabled={!testInput.trim()}
                >
                  <Send className="size-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between px-1 text-[9px] text-muted-foreground">
                <span>Não envia mensagem real</span>
                <span>
                  {tone} · criatividade {creativity}%
                </span>
              </div>
            </form>
          </section>

          <section className="rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-extrabold">Base de conhecimento</h2>
                <p className="text-[10px] text-muted-foreground">Fontes consultadas pela IA</p>
              </div>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-xl bg-violet-700 text-white shadow-md hover:bg-violet-800"
                aria-label="Adicionar fonte"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {knowledgeSources.map((source) => {
                const Icon = source.icon;
                return (
                  <div key={source.title} className="flex items-center gap-3">
                    <div className={`grid size-9 place-items-center rounded-xl ${source.color}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold">{source.title}</div>
                      <div className="text-[10px] text-muted-foreground">{source.detail}</div>
                    </div>
                    <Check className="size-4 text-emerald-600" />
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 text-xs font-extrabold text-violet-800 transition hover:bg-violet-100"
            >
              Gerenciar conhecimento <ChevronRight className="size-4" />
            </button>
          </section>

          <Link
            to="/demo/conversas"
            className="group flex items-center gap-3 rounded-[24px] border border-violet-200 bg-gradient-to-r from-violet-700 to-fuchsia-600 p-4 text-white shadow-lg transition hover:-translate-y-0.5"
          >
            <div className="grid size-11 place-items-center rounded-2xl bg-white/15">
              <Play className="size-5 fill-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black">Ver a IA em atendimento</div>
              <div className="text-[10px] text-violet-100">Abra uma conversa completa na demo</div>
            </div>
            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </Link>
        </aside>
      </div>
    </div>
  );
}

function FeatureChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5 text-[10px] font-bold text-violet-50 backdrop-blur">
      <Icon className="size-3" />
      {label}
    </span>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
  step,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  step: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-base font-extrabold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span className="ml-auto rounded-lg bg-muted px-2 py-1 text-[10px] font-black text-muted-foreground">
        {step}
      </span>
    </div>
  );
}

function AutomationToggle({
  title,
  detail,
  checked,
  onChange,
}: {
  title: string;
  detail: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${checked ? "border-violet-200 bg-violet-50" : "border-border bg-background/60"}`}
    >
      <div
        className={`grid size-9 shrink-0 place-items-center rounded-xl ${checked ? "bg-violet-700 text-white" : "bg-muted text-muted-foreground"}`}
      >
        {checked ? <Check className="size-4" /> : <Settings2 className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-extrabold">{title}</div>
        <div className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{detail}</div>
      </div>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-violet-700" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`}
        />
      </span>
    </button>
  );
}

function ChatBubble({ message, assistantName }: { message: ChatMessage; assistantName: string }) {
  const assistant = message.from === "assistant";
  return (
    <div className={`flex ${assistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed shadow-sm ${assistant ? "rounded-tl-md border border-violet-100 bg-white text-foreground" : "rounded-tr-md bg-violet-700 text-white"}`}
      >
        {assistant && (
          <div className="mb-1 text-[9px] font-black uppercase tracking-[.08em] text-violet-600">
            {assistantName}
          </div>
        )}
        <div>{message.text}</div>
        {message.meta && (
          <div
            className={`mt-1.5 flex items-center gap-1 text-[9px] ${assistant ? "text-muted-foreground" : "text-violet-200"}`}
          >
            <BrainCircuit className="size-2.5" />
            {message.meta}
          </div>
        )}
      </div>
    </div>
  );
}
