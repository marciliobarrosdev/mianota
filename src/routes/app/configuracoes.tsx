/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { createFileRoute, redirect, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/auth/realm-supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Bell,
  CalendarDays,
  Check,
  Loader2,
  Save,
  CreditCard,
  Sparkles,
  AlertTriangle,
  Download,
  MessageCircle,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Target,
} from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { trialDaysLeft } from "@/lib/tenant";
import { listAuditLog, exportLgpd } from "@/lib/security.functions";
import { patchCachedAppCompany } from "@/lib/app-access-cache";
import { PageHeader } from "@/components/marcia/page-kit";
import { useBrand } from "@/contexts/brand-context";
import { saveSubscriberContact } from "@/lib/subscriber-profile.functions";
import { PHONE_INPUT_PROPS, brazilianPhoneError, maskBrazilianPhoneInput } from "@/lib/phone";

export const Route = createFileRoute("/app/configuracoes")({
  head: brandedRouteHead("Configurações"),
  beforeLoad: ({ context }: any) => {
    const r = context?.membership?.role;
    if (r === "atendente") throw redirect({ to: "/app/inicio" });
  },
  component: ConfigPage,
});

function ConfigPage() {
  const branding = useBrand();
  const router = useRouter();
  const ctx = Route.useRouteContext();
  const companyId = ctx.company?.id;
  const userId = ctx.user.id;
  const company = ctx.company;

  const [empresa, setEmpresa] = useState({ nome: "", telefone: "" });
  const [perfil, setPerfil] = useState({ nome: "", email: ctx.user.email ?? "" });
  const [senha, setSenha] = useState({ nova: "", confirma: "" });
  const [experience, setExperience] = useState({
    preferred_name: "",
    primary_goal: "control",
    assistant_style: "direta" as "direta" | "didatica" | "motivadora",
    alert_budget_percent: 80,
    ask_before_save: true,
    weekly_summary: true,
    proactive_insights: true,
  });
  const saveContact = useServerFn(saveSubscriberContact);
  const [savingE, setSavingE] = useState(false);
  const [savingP, setSavingP] = useState(false);
  const [savingS, setSavingS] = useState(false);
  const [savingExperience, setSavingExperience] = useState(false);
  const [sub, setSub] = useState<any>(null);

  useEffect(() => {
    if (ctx.company) {
      setEmpresa({
        nome: ctx.company.nome,
        telefone: maskBrazilianPhoneInput(ctx.company.telefone ?? ""),
      });
    }
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nome")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) setPerfil((p) => ({ ...p, nome: data.nome ?? "" }));
    })();
    if (companyId) {
      void (async () => {
        const [subscription, companyProfile] = await Promise.all([
          supabase
            .from("subscription")
            .select("*, plan:plan(id,nome,preco_cents,moeda,intervalo)")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          (supabase as any)
            .from("company")
            .select("finance_profile")
            .eq("id", companyId)
            .maybeSingle(),
        ]);
        setSub(subscription.data);
        setExperience((current) => ({
          ...current,
          ...(companyProfile.data?.finance_profile || {}),
        }));
      })();
    }
  }, [companyId, userId]);

  async function saveEmpresa() {
    if (!companyId) return;
    if (empresa.nome.trim().length < 2) return toast.error("Informe o nome do espaço.");
    const phoneError = brazilianPhoneError(empresa.telefone, { required: false });
    if (phoneError) return toast.error(phoneError);
    setSavingE(true);
    try {
      const saved = await saveContact({
        data: { companyId, nome: empresa.nome, telefone: empresa.telefone || null },
      });
      patchCachedAppCompany(companyId, saved);
      setEmpresa({ nome: saved.nome, telefone: maskBrazilianPhoneInput(saved.telefone ?? "") });
      await router.invalidate();
      toast.success("Dados salvos");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar agora.");
    } finally {
      setSavingE(false);
    }
  }

  async function saveExperience() {
    if (!companyId) return;
    setSavingExperience(true);
    const { error } = await (supabase as any)
      .from("company")
      .update({ finance_profile: experience })
      .eq("id", companyId);
    setSavingExperience(false);
    if (error) return toast.error(error.message);
    toast.success(`${branding.assistantName} aprendeu suas preferências.`);
  }

  async function savePerfil() {
    setSavingP(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome: perfil.nome || null })
      .eq("user_id", userId);
    setSavingP(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  }

  async function saveSenha() {
    if (senha.nova.length < 8) return toast.error("Mínimo 8 caracteres");
    if (senha.nova !== senha.confirma) return toast.error("Senhas não conferem");
    setSavingS(true);
    const { error } = await supabase.auth.updateUser({ password: senha.nova });
    setSavingS(false);
    if (error) return toast.error(error.message);
    setSenha({ nova: "", confirma: "" });
    toast.success("Senha alterada");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Do seu jeito"
        title="Configurações"
        description="Personalize a ajuda que recebe, escolha onde falar com a assistente e cuide da sua conta."
      />
      <Tabs defaultValue="experiencia">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-muted/70 p-1.5 sm:w-fit">
          <TabsTrigger value="experiencia" className="rounded-xl">
            Minha experiência
          </TabsTrigger>
          <TabsTrigger value="canais" className="rounded-xl">
            Canais
          </TabsTrigger>
          <TabsTrigger value="conta" className="rounded-xl">
            Conta e plano
          </TabsTrigger>
          <TabsTrigger value="privacidade" className="rounded-xl">
            Privacidade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="privacidade" className="mt-5">
          <SegurancaTab />
        </TabsContent>

        <TabsContent value="experiencia" className="mt-5">
          <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
            <Card className="space-y-6 rounded-[28px] border-violet-100 p-5 shadow-[var(--shadow-card)] sm:p-7">
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                  <SlidersHorizontal className="size-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-black">Que ajuda você quer receber?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A assistente adapta prioridades, alertas e linguagem.
                  </p>
                </div>
              </div>
              <div>
                <Label>Como você quer ser chamado?</Label>
                <Input
                  className="mt-2 h-11 rounded-xl"
                  value={experience.preferred_name}
                  onChange={(event) =>
                    setExperience((current) => ({
                      ...current,
                      preferred_name: event.target.value.slice(0, 80),
                    }))
                  }
                  placeholder="Ex.: Luis"
                />
              </div>
              <div>
                <Label>Seu foco principal agora</Label>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    ["control", "Controlar gastos", "Entender para onde o dinheiro vai"],
                    ["save", "Economizar", "Criar sobra e formar reserva"],
                    ["debt", "Sair das dívidas", "Priorizar contas e reduzir juros"],
                    ["plan", "Realizar planos", "Transformar metas em valor mensal"],
                  ].map(([value, title, text]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setExperience((current) => ({ ...current, primary_goal: value }))
                      }
                      className={`rounded-2xl border p-4 text-left transition ${experience.primary_goal === value ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100" : "border-border hover:border-violet-200"}`}
                    >
                      <span className="flex items-center justify-between font-black">
                        {title}
                        {experience.primary_goal === value && (
                          <Check className="size-4 text-violet-600" />
                        )}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Jeito de conversar</Label>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {[
                    ["direta", "Direta"],
                    ["didatica", "Didática"],
                    ["motivadora", "Motivadora"],
                  ].map(([value, title]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setExperience((current) => ({
                          ...current,
                          assistant_style: value as typeof current.assistant_style,
                        }))
                      }
                      className={`rounded-xl border px-3 py-3 text-sm font-bold ${experience.assistant_style === value ? "border-violet-500 bg-violet-50 text-violet-800" : "border-border"}`}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="flex items-center justify-between text-sm font-bold">
                  Avisar quando usar o orçamento
                  <b className="text-violet-700">{experience.alert_budget_percent}%</b>
                </span>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={experience.alert_budget_percent}
                  onChange={(event) =>
                    setExperience((current) => ({
                      ...current,
                      alert_budget_percent: Number(event.target.value),
                    }))
                  }
                  className="mt-3 w-full accent-violet-600"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ["weekly_summary", "Resumo semanal", "Uma leitura curta do que mudou"],
                  [
                    "proactive_insights",
                    "Alertas proativos",
                    "Riscos e oportunidades sem precisar perguntar",
                  ],
                ].map(([field, title, text]) => {
                  const checked = Boolean(
                    experience[field as "weekly_summary" | "proactive_insights"],
                  );
                  return (
                    <button
                      key={field}
                      type="button"
                      onClick={() =>
                        setExperience((current) => ({ ...current, [field]: !checked }))
                      }
                      className="flex items-center gap-3 rounded-2xl border border-border p-4 text-left"
                    >
                      <span
                        className={`relative h-6 w-11 shrink-0 rounded-full ${checked ? "bg-violet-600" : "bg-muted"}`}
                      >
                        <span
                          className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`}
                        />
                      </span>
                      <span>
                        <b className="block text-sm">{title}</b>
                        <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">
                          {text}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <Button
                onClick={saveExperience}
                disabled={savingExperience}
                className="h-11 w-full rounded-xl bg-violet-700 hover:bg-violet-800"
              >
                {savingExperience ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Salvar minhas preferências
              </Button>
            </Card>
            <div className="space-y-4">
              <Card className="rounded-[26px] border-violet-200 bg-[#21112f] p-5 text-white shadow-xl">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-violet-300">
                  <Sparkles className="size-4" /> Resposta personalizada
                </div>
                <p className="mt-5 font-display text-xl font-black leading-snug">
                  {experience.preferred_name ? `${experience.preferred_name}, ` : ""}você já usou{" "}
                  {experience.alert_budget_percent}% do limite de alimentação.
                </p>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  Quer que eu mostre o que mais pesou e sugira um ajuste para esta semana?
                </p>
              </Card>
              <Button asChild variant="outline" className="h-12 w-full rounded-xl">
                <Link to="/app/agente">
                  <Target /> Ver personalização completa
                </Link>
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="canais" className="mt-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <ChannelCard
              icon={Smartphone}
              title="Neste aplicativo"
              status="Já está pronto"
              description="Envie texto, áudio ou comprovante direto para a MárcIA, pelo celular ou computador."
              to="/app/marcia"
              action="Abrir conversa"
              ready
            />
            <ChannelCard
              icon={MessageCircle}
              title="WhatsApp"
              status="Opcional"
              description="Vincule seu celular e registre despesas ou faça perguntas sem abrir o painel."
              to="/app/conexao"
              action="Ativar meu celular"
            />
            <ChannelCard
              icon={CalendarDays}
              title="Calendário e lembretes"
              status="Já está pronto"
              description="Agende contas futuras e recorrentes. A MárcIA avisa antes do vencimento."
              to="/app/planejamento"
              action="Abrir calendário"
              ready
            />
          </div>
          <Card className="mt-5 rounded-[24px] border-violet-100 bg-violet-50/60 p-5">
            <h2 className="font-display text-lg font-black">
              Um financeiro, vários caminhos de entrada
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Tudo que você registra no app ou envia pelo WhatsApp atualiza a mesma visão do mês.
              Você não precisa escolher um canal definitivo.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="conta" className="mt-5 space-y-5">
          <PlanoCard company={company} sub={sub} />
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-4 p-5">
              <h2 className="font-semibold">Seu espaço financeiro</h2>
              <div>
                <Label>Nome do espaço</Label>
                <Input
                  value={empresa.nome}
                  onChange={(e) => setEmpresa({ ...empresa, nome: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="company-phone">Telefone de contato</Label>
                <Input
                  id="company-phone"
                  {...PHONE_INPUT_PROPS}
                  value={empresa.telefone}
                  onChange={(e) =>
                    setEmpresa({ ...empresa, telefone: maskBrazilianPhoneInput(e.target.value) })
                  }
                />
                {empresa.telefone.replace(/\D/g, "").length >= 10 &&
                  brazilianPhoneError(empresa.telefone, { required: false }) && (
                    <p className="mt-1 text-[11px] text-destructive">
                      {brazilianPhoneError(empresa.telefone, { required: false })}
                    </p>
                  )}
              </div>
              <Button onClick={saveEmpresa} disabled={savingE} className="w-full">
                {savingE ? <Loader2 className="animate-spin" /> : <Save />} Salvar espaço
              </Button>
            </Card>
            <Card className="space-y-4 p-5">
              <h2 className="font-semibold">Meus dados</h2>
              <div>
                <Label>Email</Label>
                <Input value={perfil.email} disabled />
              </div>
              <div>
                <Label>Nome</Label>
                <Input
                  value={perfil.nome}
                  onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={savePerfil} disabled={savingP} className="w-full">
                  {savingP ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="size-4 mr-1.5" />
                  )}{" "}
                  Salvar
                </Button>
              </div>
            </Card>
            <Card className="space-y-4 p-5 md:col-span-2">
              <h2 className="font-semibold">Trocar senha</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nova senha</Label>
                  <Input
                    type="password"
                    value={senha.nova}
                    onChange={(e) => setSenha({ ...senha, nova: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Confirmar</Label>
                  <Input
                    type="password"
                    value={senha.confirma}
                    onChange={(e) => setSenha({ ...senha, confirma: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveSenha} disabled={savingS}>
                  {savingS ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="size-4 mr-1.5" />
                  )}{" "}
                  Trocar
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChannelCard({
  icon: Icon,
  title,
  status,
  description,
  to,
  action,
  ready = false,
}: {
  icon: typeof Smartphone;
  title: string;
  status: string;
  description: string;
  to: string;
  action: string;
  ready?: boolean;
}) {
  return (
    <Card className="flex min-h-64 flex-col rounded-[26px] border-violet-100 p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-violet-100 text-violet-700">
          <Icon className="size-5" />
        </span>
        <Badge
          className={
            ready
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
              : "bg-muted text-muted-foreground hover:bg-muted"
          }
        >
          {status}
        </Badge>
      </div>
      <h2 className="mt-5 font-display text-lg font-black">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
      <Button asChild variant={ready ? "default" : "outline"} className="mt-5 w-full rounded-xl">
        <Link to={to}>{action}</Link>
      </Button>
    </Card>
  );
}

function SegurancaTab() {
  const fetchLog = useServerFn(listAuditLog);
  const fetchExport = useServerFn(exportLgpd);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setRows(await fetchLog());
      } catch (e: any) {
        toast.error(e?.message ?? "Erro");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function baixarExport() {
    setExporting(true);
    try {
      const data = await fetchExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lgpd-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Exportação concluída");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao exportar");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Bell className="size-4" /> Notificações do aplicativo
            </h2>
            <p className="text-sm text-muted-foreground">
              Acesse a central de avisos e prepare este aparelho para push quando o serviço de envio
              estiver configurado.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/app/notificacoes">Configurar</Link>
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Download className="size-4" /> Exportação LGPD
            </h2>
            <p className="text-sm text-muted-foreground">
              Baixe um JSON com todos os dados da sua empresa armazenados aqui.
            </p>
          </div>
          <Button onClick={baixarExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="size-4 mr-1.5" />
            )}{" "}
            Exportar
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Shield className="size-4" /> Log de auditoria
        </h2>
        <p className="text-sm text-muted-foreground">Últimas 200 ações registradas.</p>
        {loading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</div>
        ) : (
          <div className="border rounded-md divide-y max-h-[500px] overflow-auto">
            {rows.map((r) => (
              <div key={r.id} className="p-3 text-sm flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {r.acao}
                    {r.recurso ? ` · ${r.recurso}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.actor_email ?? "sistema"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function fmtBRL(cents: number, moeda = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(cents / 100);
}

function PlanoCard({ company, sub }: { company: any; sub: any }) {
  const status = company?.status_cobranca as string | undefined;
  const trialEnd = sub?.trial_ends_at ?? company?.trial_ate ?? null;
  const days = trialEnd ? trialDaysLeft(trialEnd) : 0;
  const isTrial = status === "trial" || sub?.status === "trialing";
  const isActive = status === "ativo" || sub?.status === "active";
  const isExpired = isTrial && days <= 0;

  return (
    <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Plano atual</h2>
          {isActive ? (
            <Badge className="bg-emerald-600">Ativo</Badge>
          ) : isTrial ? (
            <Badge variant={isExpired ? "destructive" : "secondary"}>
              {isExpired ? "Trial expirado" : "Em teste"}
            </Badge>
          ) : (
            <Badge variant="destructive">Inativo</Badge>
          )}
        </div>
        {sub?.plan ? (
          <>
            <div className="text-2xl font-bold">{sub.plan.nome}</div>
            <div className="text-sm text-muted-foreground">
              {fmtBRL(sub.plan.preco_cents, sub.plan.moeda)}/
              {sub.plan.intervalo === "month" ? "mês" : "ano"}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Nenhum plano vinculado ainda.</div>
        )}

        {isTrial && (
          <div
            className={`rounded-md p-3 text-sm flex items-start gap-2 ${
              isExpired
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}
          >
            {isExpired ? (
              <AlertTriangle className="size-4 mt-0.5" />
            ) : (
              <Sparkles className="size-4 mt-0.5" />
            )}
            <div>
              {isExpired ? (
                <>Seu período de teste terminou. Cadastre o cartão para continuar usando.</>
              ) : (
                <>
                  Restam{" "}
                  <b>
                    {days} {days === 1 ? "dia" : "dias"}
                  </b>{" "}
                  de teste. Cadastre o cartão antes do fim do prazo para não interromper.
                </>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Gerenciar pagamento</h2>
        <p className="text-sm text-muted-foreground">
          {isActive
            ? "Você pode trocar de plano ou atualizar o cartão a qualquer momento."
            : "Cadastre seu cartão para ativar o plano. Pode cancelar quando quiser."}
        </p>
        {sub?.payment_method_brand && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CreditCard className="size-3.5" /> {sub.payment_method_brand} ••••{" "}
            {sub.payment_method_last4}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild>
            <Link to="/app/checkout" search={{ plano: sub?.plan?.nome?.toLowerCase() } as any}>
              <CreditCard className="size-4 mr-1.5" />
              {isActive ? "Trocar de plano" : "Cadastrar cartão e ativar"}
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
