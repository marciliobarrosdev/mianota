import { useState, type ReactNode } from "react";
import {
  Activity,
  BadgeCheck,
  Bell,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  Globe2,
  Instagram,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Palette,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  UsersRound,
  Webhook,
  Wifi,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/marcia/page-kit";
import { useBrand } from "@/contexts/brand-context";

const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-4 text-sm font-extrabold text-white shadow-[0_12px_26px_-14px_rgba(109,40,217,.8)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-14px_rgba(109,40,217,.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2";

const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 text-xs font-extrabold text-violet-800 transition hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2";

const services = [
  {
    name: "Limpeza de pele premium",
    category: "Facial",
    duration: "60 min",
    price: "R$ 180",
    color: "from-violet-500 to-fuchsia-500",
    bookings: 18,
  },
  {
    name: "Drenagem linfática",
    category: "Corporal",
    duration: "60 min",
    price: "R$ 220",
    color: "from-cyan-500 to-blue-500",
    bookings: 12,
  },
  {
    name: "Massagem relaxante",
    category: "Bem-estar",
    duration: "50 min",
    price: "R$ 150",
    color: "from-emerald-500 to-teal-500",
    bookings: 15,
  },
  {
    name: "Design de sobrancelhas",
    category: "Olhar",
    duration: "45 min",
    price: "R$ 85",
    color: "from-amber-500 to-orange-500",
    bookings: 21,
  },
  {
    name: "Peeling renovador",
    category: "Facial",
    duration: "45 min",
    price: "R$ 195",
    color: "from-pink-500 to-rose-500",
    bookings: 8,
  },
  {
    name: "Day spa Aurora",
    category: "Experiência",
    duration: "120 min",
    price: "R$ 390",
    color: "from-indigo-500 to-violet-600",
    bookings: 6,
  },
];

export function ServicesDemoView() {
  const [category, setCategory] = useState("Todos");
  const categories = ["Todos", "Facial", "Corporal", "Bem-estar", "Olhar"];
  const visibleServices =
    category === "Todos" ? services : services.filter((service) => service.category === category);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo e preços"
        title="Serviços"
        description="Organize duração, valor, equipe habilitada e regras de agendamento em um só lugar."
        action={
          <button type="button" className={primaryButton}>
            <Plus className="size-4" /> Novo serviço
          </button>
        }
      />

      <DemoNotice>
        Catálogo ilustrativo do Studio Aurora. Na conta real, você edita preços, horários e
        profissionais.
      </DemoNotice>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={Sparkles}
          label="Serviços ativos"
          value="12"
          accent="violet"
          hint="2 em destaque"
        />
        <SummaryCard
          icon={CalendarClock}
          label="Agendamentos no mês"
          value="80"
          accent="cyan"
          hint="+18% vs. mês anterior"
        />
        <SummaryCard
          icon={CircleDollarSign}
          label="Ticket médio"
          value="R$ 168"
          accent="emerald"
          hint="estimativa ilustrativa"
        />
      </div>

      <section className="rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-lg font-extrabold">Catálogo publicado</h2>
            <p className="text-xs text-muted-foreground">
              O que o cliente pode escolher ao agendar
            </p>
          </div>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                  category === item
                    ? "bg-violet-700 text-white shadow-md"
                    : "border border-border bg-background text-muted-foreground hover:border-violet-200 hover:text-violet-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleServices.map((service) => (
            <article
              key={service.name}
              className="group overflow-hidden rounded-2xl border border-border bg-background/70 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg"
            >
              <div className={`h-1.5 bg-gradient-to-r ${service.color}`} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-extrabold text-violet-700">
                      {service.category}
                    </span>
                    <h3 className="mt-3 text-sm font-black">{service.name}</h3>
                  </div>
                  <button
                    type="button"
                    aria-label={`Mais opções para ${service.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-violet-100 hover:text-violet-700"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock3 className="size-3.5 text-violet-600" />
                    {service.duration}
                  </span>
                  <span className="font-extrabold text-foreground">{service.price}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[10px] text-muted-foreground">
                    {service.bookings} agendamentos
                  </span>
                  <button
                    type="button"
                    className="text-xs font-extrabold text-violet-700 hover:text-violet-900"
                  >
                    Editar serviço
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const team = [
  {
    name: "Ana Martins",
    role: "Esteticista",
    initials: "AM",
    color: "bg-violet-100 text-violet-700",
    occupancy: 82,
    today: "5 atendimentos",
    specialties: ["Facial", "Drenagem"],
    status: "Atendendo agora",
  },
  {
    name: "Beatriz Rocha",
    role: "Massoterapeuta",
    initials: "BR",
    color: "bg-cyan-100 text-cyan-700",
    occupancy: 68,
    today: "4 atendimentos",
    specialties: ["Massagem", "Day spa"],
    status: "Livre às 14:30",
  },
  {
    name: "Carla Nunes",
    role: "Designer de sobrancelhas",
    initials: "CN",
    color: "bg-amber-100 text-amber-700",
    occupancy: 74,
    today: "6 atendimentos",
    specialties: ["Sobrancelhas", "Olhar"],
    status: "Pausa até 13:00",
  },
];

export function TeamDemoView() {
  const branding = useBrand();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pessoas e disponibilidade"
        title="Equipe"
        description="Escalas, especialidades e ocupação para distribuir cada atendimento com clareza."
        action={
          <button type="button" className={primaryButton}>
            <Plus className="size-4" /> Adicionar profissional
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={UsersRound}
          label="Equipe ativa"
          value="3"
          accent="violet"
          hint="todos disponíveis hoje"
        />
        <SummaryCard
          icon={Activity}
          label="Ocupação da semana"
          value="74%"
          accent="cyan"
          hint="+6 pontos"
        />
        <SummaryCard
          icon={Star}
          label="Avaliação média"
          value="4,9"
          accent="amber"
          hint="56 avaliações ilustrativas"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-extrabold">Hoje no Studio Aurora</h2>
              <p className="text-xs text-muted-foreground">Quinta-feira · escala demonstrativa</p>
            </div>
            <button type="button" className={secondaryButton}>
              <CalendarClock className="size-4" /> Ver escala
            </button>
          </div>
          <div className="space-y-3">
            {team.map((member) => (
              <article
                key={member.name}
                className="rounded-2xl border border-border bg-background/70 p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div
                    className={`grid size-12 shrink-0 place-items-center rounded-2xl font-black ${member.color}`}
                  >
                    {member.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black">{member.name}</h3>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                        Ativa
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {member.role} · {member.specialties.join(" · ")}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500"
                        style={{ width: `${member.occupancy}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>{member.occupancy}% ocupada</span>
                      <span>{member.today}</span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-xs font-extrabold text-violet-700">{member.status}</div>
                    <button
                      type="button"
                      className="mt-2 text-[11px] font-bold text-muted-foreground hover:text-violet-700"
                    >
                      Abrir agenda
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[24px] border border-violet-200 bg-gradient-to-br from-violet-700 to-fuchsia-600 p-5 text-white shadow-xl">
            <Zap className="size-5 text-violet-100" />
            <h2 className="mt-3 font-display text-lg font-black">
              Sugestão da {branding.assistantName}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-violet-100">
              Beatriz tem uma janela às 14:30. Uma campanha de encaixe pode avisar 8 clientes
              interessados em massagem.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-3 text-xs font-extrabold text-violet-800 shadow-md transition hover:bg-violet-50"
            >
              Preparar mensagem <ChevronRight className="size-4" />
            </button>
          </section>
          <section className="rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-base font-extrabold">Permissões</h2>
            <div className="mt-3 space-y-3">
              <PermissionRow label="Agenda e clientes" count="3 pessoas" />
              <PermissionRow label="Financeiro" count="1 administradora" />
              <PermissionRow label="Configuração da IA" count="1 administradora" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

const notificationEvents = [
  {
    icon: CalendarClock,
    title: "Lembrete enviado para Juliana",
    detail: "Atendimento amanhã às 14:30 · WhatsApp",
    time: "há 4 min",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: MessageCircle,
    title: "Mariana confirmou o horário",
    detail: "Resposta reconhecida automaticamente pela assistente",
    time: "há 18 min",
    color: "bg-violet-100 text-violet-700",
  },
  {
    icon: Bell,
    title: "Encaixe preenchido",
    detail: "Horário das 16:00 reservado para Renata",
    time: "há 42 min",
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    icon: Mail,
    title: "Resumo diário preparado",
    detail: "6 atendimentos · previsão de R$ 940",
    time: "08:00",
    color: "bg-amber-100 text-amber-700",
  },
];

export function NotificationsDemoView() {
  const [channels, setChannels] = useState({ whatsapp: true, email: true, browser: false });
  const [rules, setRules] = useState({
    confirmation: true,
    reminder: true,
    late: false,
    summary: true,
  });

  const toggleChannel = (key: keyof typeof channels) =>
    setChannels((current) => ({ ...current, [key]: !current[key] }));
  const toggleRule = (key: keyof typeof rules) =>
    setRules((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Avisos e automações"
        title="Notificações"
        description="Escolha o que sua equipe e seus clientes recebem, no canal e no momento certos."
        action={
          <button type="button" className={primaryButton}>
            <Plus className="size-4" /> Nova automação
          </button>
        }
      />

      <DemoNotice>As alterações abaixo são interativas, mas ficam somente nesta prévia.</DemoNotice>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <section className="rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-extrabold">Central de atividades</h2>
              <p className="text-xs text-muted-foreground">
                O que saiu e o que voltou para a operação
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">
              Tudo funcionando
            </span>
          </div>
          <div className="mt-5 space-y-2">
            {notificationEvents.map((event) => {
              const Icon = event.icon;
              return (
                <article
                  key={event.title}
                  className="flex gap-3 rounded-2xl border border-border bg-background/70 p-4"
                >
                  <div
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${event.color}`}
                  >
                    <Icon className="size-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold">{event.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{event.time}</span>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-base font-extrabold">Canais ativos</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Controle os pontos de contato da demonstração
            </p>
            <div className="mt-4 space-y-3">
              <ToggleRow
                icon={MessageCircle}
                label="WhatsApp"
                description="Conectado"
                checked={channels.whatsapp}
                onChange={() => toggleChannel("whatsapp")}
                accent="emerald"
              />
              <ToggleRow
                icon={Mail}
                label="E-mail"
                description="Studio Aurora"
                checked={channels.email}
                onChange={() => toggleChannel("email")}
                accent="violet"
              />
              <ToggleRow
                icon={Bell}
                label="Navegador"
                description="Permissão pendente"
                checked={channels.browser}
                onChange={() => toggleChannel("browser")}
                accent="amber"
              />
            </div>
          </section>
          <section className="rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-base font-extrabold">Regras automáticas</h2>
            <div className="mt-3 space-y-1">
              <CompactToggle
                label="Confirmação ao agendar"
                checked={rules.confirmation}
                onChange={() => toggleRule("confirmation")}
              />
              <CompactToggle
                label="Lembrete 24h antes"
                checked={rules.reminder}
                onChange={() => toggleRule("reminder")}
              />
              <CompactToggle
                label="Aviso de atraso"
                checked={rules.late}
                onChange={() => toggleRule("late")}
              />
              <CompactToggle
                label="Resumo para a equipe"
                checked={rules.summary}
                onChange={() => toggleRule("summary")}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

const integrations = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    detail: "Conversas, confirmações e lembretes",
    icon: MessageCircle,
    color: "bg-emerald-100 text-emerald-700",
    state: "connected",
  },
  {
    id: "google",
    name: "Google Agenda",
    detail: "Sincronização dos compromissos",
    icon: CalendarClock,
    color: "bg-blue-100 text-blue-700",
    state: "connected",
  },
  {
    id: "instagram",
    name: "Instagram",
    detail: "Entrada de novas conversas",
    icon: Instagram,
    color: "bg-pink-100 text-pink-700",
    state: "available",
  },
  {
    id: "payments",
    name: "Link de pagamento",
    detail: "Sinal e cobrança antes do atendimento",
    icon: CreditCard,
    color: "bg-violet-100 text-violet-700",
    state: "available",
  },
  {
    id: "webhook",
    name: "Webhooks",
    detail: "Envie eventos para outras ferramentas",
    icon: Webhook,
    color: "bg-amber-100 text-amber-700",
    state: "advanced",
  },
  {
    id: "site",
    name: "Site e formulário",
    detail: "Capte pedidos direto da sua página",
    icon: Globe2,
    color: "bg-cyan-100 text-cyan-700",
    state: "available",
  },
];

export function IntegrationsDemoView() {
  const [connected, setConnected] = useState(["whatsapp", "google"]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ecossistema conectado"
        title="Integrações"
        description="Conecte os canais que já fazem parte da sua rotina e deixe as informações circularem."
        action={
          <button type="button" className={primaryButton}>
            <Link2 className="size-4" /> Explorar conexões
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={Wifi}
          label="Conectadas"
          value={`${connected.length}`}
          accent="emerald"
          hint="sincronização saudável"
        />
        <SummaryCard
          icon={Zap}
          label="Ações automáticas"
          value="146"
          accent="violet"
          hint="nesta semana"
        />
        <SummaryCard
          icon={ShieldCheck}
          label="Última sincronização"
          value="Agora"
          accent="cyan"
          hint="dados ilustrativos"
        />
      </div>

      <section className="rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-extrabold">Conectores disponíveis</h2>
            <p className="text-xs text-muted-foreground">
              Ative apenas o que fizer sentido para sua operação
            </p>
          </div>
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Buscar integração"
              placeholder="Buscar integração"
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            const isConnected = connected.includes(integration.id);
            return (
              <article
                key={integration.id}
                className={`rounded-2xl border p-4 transition ${isConnected ? "border-emerald-200 bg-emerald-50/40" : "border-border bg-background/70 hover:border-violet-200"}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`grid size-11 shrink-0 place-items-center rounded-2xl ${integration.color}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black">{integration.name}</h3>
                      {isConnected && <BadgeCheck className="size-4 shrink-0 text-emerald-600" />}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {integration.detail}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-[.08em] ${isConnected ? "text-emerald-700" : integration.state === "advanced" ? "text-amber-700" : "text-muted-foreground"}`}
                  >
                    {isConnected
                      ? "Conectada"
                      : integration.state === "advanced"
                        ? "Avançada"
                        : "Disponível"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setConnected((current) =>
                        isConnected
                          ? current.filter((id) => id !== integration.id)
                          : [...current, integration.id],
                      )
                    }
                    className={
                      isConnected
                        ? "text-xs font-extrabold text-emerald-700 hover:text-emerald-900"
                        : "rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-violet-800"
                    }
                  >
                    {isConnected ? "Gerenciar" : "Conectar"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function SettingsDemoView() {
  const [saved, setSaved] = useState(false);
  const [onlineBooking, setOnlineBooking] = useState(true);
  const [waitlist, setWaitlist] = useState(true);
  const [deposit, setDeposit] = useState(false);

  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2600);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Preferências da operação"
        title="Configurações"
        description="Dados do negócio, identidade da marca e regras gerais da agenda."
        action={
          <button type="button" onClick={save} className={primaryButton}>
            {saved ? <Check className="size-4" /> : <Sparkles className="size-4" />}
            {saved ? "Salvo na prévia" : "Salvar alterações"}
          </button>
        }
      />

      <DemoNotice>
        Você pode preencher e testar esta tela. Nenhum dado da demonstração é enviado ou salvo.
      </DemoNotice>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <SettingsSection
            icon={UserRound}
            title="Perfil do negócio"
            description="Informações exibidas nos agendamentos e mensagens"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do negócio" defaultValue="Studio Aurora" />
              <Field label="WhatsApp" defaultValue="(11) 99999-0000" />
              <Field label="E-mail" defaultValue="contato@studioaurora.com.br" type="email" />
              <Field label="Cidade" defaultValue="São Paulo · SP" />
            </div>
            <label className="mt-4 block text-xs font-bold">
              Endereço <span className="font-normal text-muted-foreground">(ilustrativo)</span>
              <div className="relative mt-1.5">
                <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-violet-500" />
                <input
                  defaultValue="Rua das Flores, 120 · Jardins"
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>
            </label>
          </SettingsSection>

          <SettingsSection
            icon={CalendarClock}
            title="Regras de agendamento"
            description="Como os horários são oferecidos aos clientes"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <CompactToggle
                label="Agendamento on-line"
                checked={onlineBooking}
                onChange={() => setOnlineBooking((value) => !value)}
                boxed
              />
              <CompactToggle
                label="Lista de espera"
                checked={waitlist}
                onChange={() => setWaitlist((value) => !value)}
                boxed
              />
              <CompactToggle
                label="Cobrar sinal"
                checked={deposit}
                onChange={() => setDeposit((value) => !value)}
                boxed
              />
              <div className="rounded-2xl border border-border bg-background/70 p-3">
                <label className="text-xs font-extrabold">
                  Antecedência mínima
                  <select
                    className="mt-2 h-9 w-full rounded-lg border border-border bg-card px-2 text-xs outline-none focus:border-violet-400"
                    defaultValue="2"
                  >
                    <option value="1">1 hora</option>
                    <option value="2">2 horas</option>
                    <option value="4">4 horas</option>
                    <option value="24">24 horas</option>
                  </select>
                </label>
              </div>
            </div>
          </SettingsSection>
        </div>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-[24px] border border-violet-200 bg-card shadow-[var(--shadow-card)]">
            <div className="bg-gradient-to-br from-violet-700 to-fuchsia-600 p-5 text-white">
              <Palette className="size-5" />
              <h2 className="mt-3 font-display text-lg font-black">Sua marca</h2>
              <p className="mt-1 text-xs text-violet-100">
                Prévia da identidade aplicada no agendamento.
              </p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-700 to-fuchsia-500 font-display text-lg font-black italic text-white">
                  A
                </div>
                <div>
                  <div className="text-sm font-black">Studio Aurora</div>
                  <div className="text-xs text-muted-foreground">Estética e bem-estar</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  aria-label="Cor violeta"
                  className="size-8 rounded-full bg-violet-600 ring-2 ring-violet-600 ring-offset-2"
                />
                <button
                  type="button"
                  aria-label="Cor rosa"
                  className="size-8 rounded-full bg-rose-500"
                />
                <button
                  type="button"
                  aria-label="Cor azul"
                  className="size-8 rounded-full bg-blue-500"
                />
                <button
                  type="button"
                  aria-label="Cor verde"
                  className="size-8 rounded-full bg-emerald-500"
                />
              </div>
              <button type="button" className={`mt-4 w-full ${secondaryButton}`}>
                <Palette className="size-4" /> Personalizar identidade
              </button>
            </div>
          </section>
          <section className="rounded-[24px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-base font-extrabold">Segurança da conta</h2>
            <div className="mt-3 space-y-3">
              <InfoRow icon={ShieldCheck} label="Acesso protegido" value="Ativo" />
              <InfoRow icon={UsersRound} label="Pessoas com acesso" value="3" />
              <InfoRow icon={FileText} label="Registro de ações" value="Disponível" />
            </div>
            <button type="button" className={`mt-4 w-full ${secondaryButton}`}>
              Gerenciar acessos
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-xs font-semibold leading-relaxed text-violet-800">
      <Sparkles className="mt-0.5 size-4 shrink-0" />
      {children}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: "violet" | "cyan" | "emerald" | "amber";
  hint: string;
}) {
  const palette = {
    violet: "bg-violet-100 text-violet-700",
    cyan: "bg-cyan-100 text-cyan-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${palette[accent]}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-xl font-black">{value}</div>
        <div className="text-xs font-bold">{label}</div>
        <div className="truncate text-[10px] text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}

function PermissionRow({ label, count }: { label: string; count: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-8 place-items-center rounded-lg bg-violet-100 text-violet-700">
        <ShieldCheck className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-extrabold">{label}</div>
        <div className="text-[10px] text-muted-foreground">{count}</div>
      </div>
      <ChevronRight className="ml-auto size-4 text-muted-foreground" />
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  accent: "emerald" | "violet" | "amber";
}) {
  const palette = {
    emerald: "bg-emerald-100 text-emerald-700",
    violet: "bg-violet-100 text-violet-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`grid size-9 place-items-center rounded-xl ${palette[accent]}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-extrabold">{label}</div>
        <div className="text-[10px] text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onChange={onChange} label={`Ativar ${label}`} />
    </div>
  );
}

function CompactToggle({
  label,
  checked,
  onChange,
  boxed = false,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  boxed?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${boxed ? "rounded-2xl border border-border bg-background/70 p-3" : "rounded-xl py-2"}`}
    >
      <span className="text-xs font-extrabold">{label}</span>
      <Switch checked={checked} onChange={onChange} label={`Ativar ${label}`} />
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${checked ? "bg-violet-700" : "bg-slate-300"}`}
    >
      <span
        className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`}
      />
    </button>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
        <div className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-700">
          <Icon className="size-[18px]" />
        </div>
        <div>
          <h2 className="font-display text-base font-extrabold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  defaultValue,
  type = "text",
}: {
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="text-xs font-bold">
      {label}
      <input
        type={type}
        defaultValue={defaultValue}
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
    </label>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-8 place-items-center rounded-lg bg-violet-100 text-violet-700">
        <Icon className="size-4" />
      </div>
      <span className="text-xs font-bold">{label}</span>
      <span className="ml-auto text-xs font-extrabold text-violet-700">{value}</span>
    </div>
  );
}
