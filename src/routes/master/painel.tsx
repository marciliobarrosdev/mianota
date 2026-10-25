import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  ArrowRight,
  Bot,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Landmark,
  Loader2,
  Headphones,
  MessagesSquare,
  Pause,
  Plug,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UsersRound,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { brandedRouteHead } from "@/config/brand";
import { masterKpis } from "@/lib/master.functions";
import { getMasterSetupProgress } from "@/lib/master-setup.functions";

type CompanySummary = {
  id: string;
  nome: string;
  email_corporativo: string | null;
  status_cobranca: string;
  trial_ate: string | null;
  creditos_saldo: number | null;
  created_at: string;
};

type DashboardData = {
  range: { from: string; to: string };
  stats: {
    total: number;
    ativas: number;
    trial: number;
    suspensas: number;
    pendentes: number;
    novasPeriodo: number;
    movimentacoes: number;
    contas: number;
    comandosIa: number;
    assinaturasAtivas: number;
    assinaturasTrial: number;
    mrr: number;
    trialsVencendo: number;
  };
  series: { label: string; total: number }[];
  recentCompanies: CompanySummary[];
};

const PRESETS = [7, 30, 90, 365] as const;

export const Route = createFileRoute("/master/painel")({
  head: brandedRouteHead("Visão geral"),
  component: OverviewPage,
});

function localDate(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function OverviewPage() {
  const getKpis = useServerFn(masterKpis);
  const getSetup = useServerFn(getMasterSetupProgress);
  const [from, setFrom] = useState(() => localDate(29));
  const [to, setTo] = useState(() => localDate());
  const [activePreset, setActivePreset] = useState<number>(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [setup, setSetup] = useState<Awaited<ReturnType<typeof getMasterSetupProgress>> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kpis, setupProgress] = await Promise.all([
        getKpis({ data: { from, to } }),
        getSetup(),
      ]);
      setData(kpis as DashboardData);
      setSetup(setupProgress);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível carregar a visão geral.",
      );
    } finally {
      setLoading(false);
    }
  }, [from, getKpis, getSetup, to]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyPreset(days: number) {
    setActivePreset(days);
    setFrom(localDate(days - 1));
    setTo(localDate());
  }

  const conversion = useMemo(() => {
    if (!data?.stats.total) return 0;
    return Math.round((data.stats.ativas / data.stats.total) * 100);
  }, [data]);

  if (!data && loading) {
    return (
      <div className="grid min-h-[55vh] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-violet-500" />
          <p className="mt-3 text-sm text-muted-foreground">Montando sua visão geral…</p>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const stats = data.stats;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-violet-500">
            Central do proprietário
          </p>
          <h1 className="mt-1 font-display text-2xl font-black tracking-tight sm:text-3xl">
            Visão geral do seu SaaS
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastros, receita, uso e pontos que pedem sua atenção.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border bg-card p-1">
            {PRESETS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => applyPreset(days)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activePreset === days
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {days === 365 ? "1 ano" : `${days}d`}
              </button>
            ))}
          </div>
          <Input
            type="date"
            value={from}
            max={to}
            onChange={(event) => {
              setActivePreset(0);
              setFrom(event.target.value);
            }}
            className="h-10 w-[145px] bg-card text-xs"
            aria-label="Data inicial"
          />
          <Input
            type="date"
            value={to}
            min={from}
            max={localDate()}
            onChange={(event) => {
              setActivePreset(0);
              setTo(event.target.value);
            }}
            className="h-10 w-[145px] bg-card text-xs"
            aria-label="Data final"
          />
          <Button size="icon" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      {setup && (
        <Card
          className={`overflow-hidden p-0 ${setup.readyToLaunch ? "border-emerald-300/60" : "border-violet-300/60"}`}
        >
          <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <div
              className={`grid size-11 place-items-center rounded-2xl ${setup.readyToLaunch ? "bg-emerald-500/10 text-emerald-700" : "bg-violet-500/10 text-violet-600"}`}
            >
              {setup.readyToLaunch ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <ListChecks className="size-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display font-black">
                  {setup.readyToLaunch
                    ? "Configuração essencial concluída"
                    : "Termine de preparar seu SaaS"}
                </h2>
                <Badge variant={setup.readyToLaunch ? "default" : "secondary"}>
                  {setup.percent}% pronto
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {setup.readyToLaunch
                  ? "Planos, cobrança, atendimento e acesso passaram pela conferência."
                  : `${setup.completed} de ${setup.total} verificações concluídas. O checklist mostra a próxima ação.`}
              </p>
              <div className="mt-3 h-1.5 max-w-xl overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500"
                  style={{ width: `${setup.percent}%` }}
                />
              </div>
            </div>
            <Button asChild variant={setup.readyToLaunch ? "outline" : "default"}>
              <Link to="/master/checklist">
                Abrir checklist <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Card>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent
          icon={<CircleDollarSign className="size-4" />}
          label="Receita recorrente"
          value={(stats.mrr / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          helper={`${stats.assinaturasAtivas} assinaturas ativas`}
        />
        <MetricCard
          icon={<Building2 className="size-4" />}
          label="Assinantes"
          value={stats.total}
          helper={`+${stats.novasPeriodo} no período`}
        />
        <MetricCard
          icon={<Activity className="size-4" />}
          label="Operações ativas"
          value={stats.ativas}
          helper={`${conversion}% da base`}
        />
        <MetricCard
          icon={<Sparkles className="size-4" />}
          label="Em teste"
          value={stats.trial}
          helper={`${stats.trialsVencendo} vencem em até 7 dias`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.55fr_.75fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-black">Novas assinantes</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Cadastros de {new Date(`${from}T12:00:00`).toLocaleDateString("pt-BR")} até{" "}
                {new Date(`${to}T12:00:00`).toLocaleDateString("pt-BR")}.
              </p>
            </div>
            <Badge variant="secondary">{stats.novasPeriodo} cadastros</Badge>
          </div>
          <div className="mt-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series} margin={{ left: -22, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,.12)" />
                <XAxis dataKey="label" fontSize={10} stroke="#8B7A9A" tickLine={false} />
                <YAxis allowDecimals={false} fontSize={10} stroke="#8B7A9A" tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#21122f",
                    border: "1px solid rgba(167,139,250,.26)",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Assinantes"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#A855F7", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="overflow-hidden p-5 sm:p-6">
          <h2 className="font-display text-lg font-black">Atenção agora</h2>
          <p className="mt-1 text-xs text-muted-foreground">O que vale conferir primeiro.</p>
          <div className="mt-5 space-y-3">
            <AttentionItem
              icon={<CalendarClock className="size-4" />}
              value={stats.trialsVencendo}
              title="Trials vencendo"
              description="nos próximos 7 dias"
              tone="amber"
            />
            <AttentionItem
              icon={<Pause className="size-4" />}
              value={stats.suspensas}
              title="Assinantes suspensas"
              description="aguardando ação ou pagamento"
              tone="red"
            />
            <AttentionItem
              icon={<Clock3 className="size-4" />}
              value={stats.pendentes}
              title="Cadastros pendentes"
              description="sem ativação concluída"
              tone="violet"
            />
          </div>
          <Button asChild variant="outline" className="mt-5 w-full justify-between">
            <Link to="/master/assinantes">
              Gerenciar assinantes <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          compact
          icon={<Bot className="size-4" />}
          label="Comandos de IA"
          value={stats.comandosIa}
          helper="no período"
        />
        <MetricCard
          compact
          icon={<CreditCard className="size-4" />}
          label="Assinaturas em trial"
          value={stats.assinaturasTrial}
          helper="checkout e Stripe"
        />
        <MetricCard
          compact
          icon={<TrendingUp className="size-4" />}
          label="Movimentações"
          value={stats.movimentacoes}
          helper="registradas no período"
        />
        <MetricCard
          compact
          icon={<Landmark className="size-4" />}
          label="Contas financeiras"
          value={stats.contas}
          helper="criadas no período"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-black">Assinantes recentes</h2>
              <p className="mt-1 text-xs text-muted-foreground">As últimas contas criadas.</p>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link to="/master/assinantes">Ver todas</Link>
            </Button>
          </div>
          <div className="mt-4 divide-y">
            {data.recentCompanies.map((company) => (
              <Link
                key={company.id}
                to="/master/assinantes"
                className="flex items-center gap-3 py-3 transition hover:opacity-75"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 font-bold text-violet-500">
                  {company.nome.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{company.nome}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {company.email_corporativo || "Sem e-mail corporativo"}
                  </div>
                </div>
                <StatusBadge status={company.status_cobranca} />
                <div className="hidden text-right text-[10px] text-muted-foreground sm:block">
                  {new Date(company.created_at).toLocaleDateString("pt-BR")}
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="bg-[#160b22] p-5 text-white sm:p-6">
          <p className="text-xs font-black uppercase tracking-[.14em] text-violet-300">
            Ações rápidas
          </p>
          <h2 className="mt-2 font-display text-2xl font-black tracking-tight">
            Administre sem procurar.
          </h2>
          <div className="mt-5 space-y-2">
            <QuickAction to="/master/novo-assinante" icon={<Plus className="size-4" />}>
              Cadastrar assinante
            </QuickAction>
            <QuickAction to="/master/planos" icon={<CreditCard className="size-4" />}>
              Editar planos e trial
            </QuickAction>
            <QuickAction to="/master/whatsapp-qr" icon={<Plug className="size-4" />}>
              Conferir integrações
            </QuickAction>
            <QuickAction to="/master/whatsapp-qr" icon={<Headphones className="size-4" />}>
              Conectar WhatsApp do sistema
            </QuickAction>
            <QuickAction to="/master/conversas" icon={<MessagesSquare className="size-4" />}>
              Atender assinantes
            </QuickAction>
            <QuickAction to="/master/configuracoes" icon={<UsersRound className="size-4" />}>
              Gerenciar super admins
            </QuickAction>
          </div>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  accent = false,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  helper: string;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <Card
      className={`${compact ? "p-4" : "p-5"} ${
        accent
          ? "border-violet-400/30 bg-[linear-gradient(145deg,rgba(124,58,237,.17),rgba(217,70,239,.03))]"
          : ""
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-violet-500">{icon}</span>
        {label}
      </div>
      <div className={`${compact ? "mt-2 text-2xl" : "mt-3 text-3xl"} font-display font-black`}>
        {value}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{helper}</div>
    </Card>
  );
}

function AttentionItem({
  icon,
  value,
  title,
  description,
  tone,
}: {
  icon: ReactNode;
  value: number;
  title: string;
  description: string;
  tone: "amber" | "red" | "violet";
}) {
  const tones = {
    amber: "bg-amber-500/10 text-amber-600",
    red: "bg-red-500/10 text-red-600",
    violet: "bg-violet-500/10 text-violet-600",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
      <div className="font-display text-2xl font-black">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ativo: "bg-emerald-500/10 text-emerald-600",
    trial: "bg-violet-500/10 text-violet-600",
    suspenso: "bg-red-500/10 text-red-600",
    pendente: "bg-amber-500/10 text-amber-600",
    checkout_pending: "bg-amber-500/10 text-amber-600",
  };
  const labels: Record<string, string> = {
    ativo: "Ativa",
    trial: "Trial",
    suspenso: "Suspensa",
    pendente: "Pendente",
    checkout_pending: "Checkout",
  };
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold ${styles[status] || "bg-muted"}`}
    >
      {labels[status] || status}
    </span>
  );
}

type QuickActionRoute =
  | "/master/novo-assinante"
  | "/master/planos"
  | "/master/whatsapp-qr"
  | "/master/configuracoes"
  | "/master/whatsapp-qr"
  | "/master/conversas";

function QuickAction({
  to,
  icon,
  children,
}: {
  to: QuickActionRoute;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-white/82 transition hover:border-violet-400/40 hover:bg-white/10"
    >
      <span className="text-violet-300">{icon}</span>
      <span className="flex-1">{children}</span>
      <ArrowRight className="size-4 text-white/35" />
    </Link>
  );
}
