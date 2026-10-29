/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { createFileRoute, redirect, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase, signOutRealm } from "@/lib/auth/realm-supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Bell,
  CalendarDays,
  Check,
  CircleCheck,
  CircleAlert,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Loader2,
  LogOut,
  MessageCircle,
  Save,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { listAuditLog, exportLgpd } from "@/lib/security.functions";
import { patchCachedAppCompany } from "@/lib/app-access-cache";
import { PageHeader } from "@/components/marcia/page-kit";
import { useBrand } from "@/contexts/brand-context";
import { saveSubscriberContact } from "@/lib/subscriber-profile.functions";
import { saveAssistantProfile } from "@/lib/assistant-profile.functions";
import { downloadMonthlyReport } from "@/lib/monthly-report.functions";
import { sendTestPush } from "@/lib/push.functions";
import {
  getAccountOverview,
  getChannelStatus,
  getDeletionRequest,
  requestAccountDeletion,
  cancelAccountDeletion,
  exportTransactionsCsv,
} from "@/lib/settings.functions";
import { useMarciaNotifications } from "@/hooks/use-marcia-notifications";
import { normalizeAssistantProfile, type AssistantProfile } from "@/lib/assistant-profile-rules";
import {
  auditGroup,
  auditLabel,
  maskPhone,
  parseSettingsTab,
  passwordStrength,
  planValidity,
  type SettingsTab,
} from "@/lib/settings-rules";
import { PHONE_INPUT_PROPS, brazilianPhoneError, maskBrazilianPhoneInput } from "@/lib/phone";

export const Route = createFileRoute("/app/configuracoes")({
  head: brandedRouteHead("Configurações"),
  validateSearch: (s: Record<string, unknown>): { aba?: SettingsTab } => ({
    aba: s.aba ? parseSettingsTab(s.aba) : undefined,
  }),
  beforeLoad: ({ context }: any) => {
    const r = context?.membership?.role;
    if (r === "atendente") throw redirect({ to: "/app/inicio" });
  },
  component: ConfigPage,
});

function money(cents: number, moeda = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(cents / 100);
}
const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

function SectionTitle({ icon: Icon, title, text, action }: { icon: ComponentType<{ className?: string }>; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <h2 className="font-display text-lg font-extrabold">{title}</h2>
          {text && <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

const cardCls = "space-y-5 rounded-[24px] border-border p-5 shadow-[var(--shadow-card)] sm:p-6";

function ConfigPage() {
  const ctx = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const tab = search.aba ?? "experiencia";
  const companyId = ctx.company?.id as string | undefined;

  const tabs: { key: SettingsTab; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { key: "experiencia", label: "Minha experiência", icon: SlidersHorizontal },
    { key: "canais", label: "Canais", icon: MessageCircle },
    { key: "conta", label: "Conta e plano", icon: Wallet },
    { key: "privacidade", label: "Privacidade", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Configurações" title="Seu MIAnota do seu jeito" description="Preferências da MIA, canais, plano e privacidade em um só lugar." />
      <Tabs value={tab} onValueChange={(v) => void navigate({ to: "/app/configuracoes", search: { aba: v as SettingsTab }, replace: true })}>
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="h-auto w-max gap-1 rounded-2xl p-1">
            {tabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="gap-2 rounded-xl px-3 py-2">
                <t.icon className="size-4" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="experiencia" className="mt-5">{companyId && <ExperienceTab companyId={companyId} />}</TabsContent>
        <TabsContent value="canais" className="mt-5">{companyId && <ChannelsTab companyId={companyId} userId={ctx.user.id} />}</TabsContent>
        <TabsContent value="conta" className="mt-5">{companyId && <AccountTab companyId={companyId} />}</TabsContent>
        <TabsContent value="privacidade" className="mt-5">{companyId && <PrivacyTab companyId={companyId} />}</TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Minha experiência ---------------- */

function ExperienceTab({ companyId }: { companyId: string }) {
  const branding = useBrand();
  const save = useServerFn(saveAssistantProfile);
  const [profile, setProfile] = useState<AssistantProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [topCat, setTopCat] = useState<{ name: string; pct: number } | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await (supabase as any).from("company").select("finance_profile").eq("id", companyId).maybeSingle();
      setProfile(normalizeAssistantProfile(data?.finance_profile));
      const comp = new Date().toISOString().slice(0, 7);
      const [{ data: budgets }, { data: spent }, { data: cats }] = await Promise.all([
        (supabase as any).from("fin_orcamento").select("categoria_id,limite_cents").eq("company_id", companyId).gte("competencia", `${comp}-01`).lte("competencia", `${comp}-31`),
        (supabase as any).from("fin_lancamento").select("categoria_id,valor_cents").eq("company_id", companyId).eq("tipo", "despesa").gte("competencia", `${comp}-01`).lte("competencia", `${comp}-31`).limit(2000),
        (supabase as any).from("fin_categoria").select("id,nome").eq("company_id", companyId),
      ]);
      const totals = new Map<string, number>();
      for (const r of spent || []) if (r.categoria_id) totals.set(r.categoria_id, (totals.get(r.categoria_id) || 0) + Number(r.valor_cents || 0));
      let best: { name: string; pct: number } | null = null;
      for (const b of budgets || []) {
        if (!b.limite_cents) continue;
        const pct = Math.round(((totals.get(b.categoria_id) || 0) / b.limite_cents) * 100);
        const name = (cats || []).find((c: any) => c.id === b.categoria_id)?.nome || "uma categoria";
        if (!best || pct > best.pct) best = { name, pct };
      }
      setTopCat(best);
    })();
  }, [companyId]);

  if (!profile) return <div className="grid h-40 place-items-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  const set = (patch: Partial<AssistantProfile>) => setProfile((p) => (p ? { ...p, ...patch } : p));

  async function onSave() {
    setSaving(true);
    try {
      const r = await save({ data: { companyId, profile } });
      setProfile(r.profile);
      toast.success(`${branding.assistantName} aprendeu suas preferências.`);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível salvar agora.");
    } finally {
      setSaving(false);
    }
  }

  const name = profile.preferred_name?.trim();
  const preview = topCat
    ? `${name ? `${name}, ` : ""}você já usou ${topCat.pct}% do orçamento de ${topCat.name}.`
    : `${name ? `${name}, ` : ""}quando você usar ${profile.alert_budget_percent}% de um orçamento, eu te aviso.`;
  const tail =
    profile.assistant_style === "didatica"
      ? "Quer que eu explique, passo a passo, o que mais pesou e como ajustar?"
      : profile.assistant_style === "motivadora"
        ? "Você está indo bem! Bora fazer um pequeno ajuste esta semana?"
        : "Quer ver o que mais pesou?";

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <Card className={cardCls}>
        <SectionTitle icon={SlidersHorizontal} title="Que ajuda você quer receber?" text={`${branding.assistantName} adapta prioridades, alertas e linguagem no app e no WhatsApp.`} />
        <div>
          <Label htmlFor="pref-name">Como você quer ser chamado?</Label>
          <Input id="pref-name" className="mt-2 h-11 rounded-xl" value={profile.preferred_name || ""} maxLength={80} onChange={(e) => set({ preferred_name: e.target.value })} placeholder="Ex.: Luis" />
        </div>
        <div>
          <Label>Seu foco principal agora</Label>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {([
              ["control", "Controlar gastos", "Entender para onde o dinheiro vai"],
              ["save", "Economizar", "Criar sobra e formar reserva"],
              ["debt", "Sair das dívidas", "Priorizar contas e reduzir juros"],
              ["plan", "Realizar planos", "Transformar metas em valor mensal"],
            ] as const).map(([value, title, text]) => {
              const on = profile.primary_goal === value;
              return (
                <button key={value} type="button" onClick={() => set({ primary_goal: value })} aria-pressed={on}
                  className={`rounded-2xl border p-4 text-left transition ${on ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}>
                  <span className="flex items-center justify-between font-bold">{title}{on && <Check className="size-4 text-primary" />}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{text}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Label>Jeito de conversar</Label>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {([["direta", "Direta"], ["didatica", "Didática"], ["motivadora", "Motivadora"]] as const).map(([value, title]) => (
              <button key={value} type="button" onClick={() => set({ assistant_style: value })} aria-pressed={profile.assistant_style === value}
                className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${profile.assistant_style === value ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}>
                {title}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="flex items-center justify-between text-sm font-bold">
            Avisar quando usar o orçamento <b className="text-primary">{profile.alert_budget_percent}%</b>
          </span>
          <input type="range" min="50" max="100" step="5" value={profile.alert_budget_percent} onChange={(e) => set({ alert_budget_percent: Number(e.target.value) })} className="mt-3 w-full accent-primary" />
          <span className="mt-1 block text-xs text-muted-foreground">Vale para categorias sem um percentual próprio definido no orçamento.</span>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            ["weekly_summary", "Resumo semanal", "Uma leitura curta do que mudou"],
            ["proactive_insights", "Alertas proativos", "Riscos e oportunidades sem precisar perguntar"],
          ] as const).map(([field, title, text]) => (
            <label key={field} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border p-4">
              <Switch checked={Boolean(profile[field])} onCheckedChange={(v) => set({ [field]: v } as any)} />
              <span><b className="block text-sm">{title}</b><span className="mt-0.5 block text-xs text-muted-foreground">{text}</span></span>
            </label>
          ))}
        </div>
        <Button onClick={onSave} disabled={saving} className="h-11 w-full rounded-xl">
          {saving ? <Loader2 className="animate-spin" /> : <Sparkles />} Salvar minhas preferências
        </Button>
      </Card>
      <div className="space-y-4">
        <Card className="rounded-[24px] border-primary/20 bg-primary p-5 text-primary-foreground shadow-xl">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] opacity-80"><Sparkles className="size-4" /> Prévia da resposta</div>
          <p className="mt-5 font-display text-xl font-black leading-snug">{preview}</p>
          <p className="mt-3 text-sm leading-6 opacity-80">{tail}{profile.use_emojis ? " 💜" : ""}</p>
        </Card>
        <Button asChild variant="outline" className="h-12 w-full rounded-xl">
          <Link to="/app/agente"><Target /> Regras avançadas da {branding.assistantName}</Link>
        </Button>
        <p className="px-1 text-xs text-muted-foreground">Regras próprias, categorias automáticas e tamanho das respostas ficam em “Personalidade e regras”.</p>
      </div>
    </div>
  );
}

/* ---------------- Canais ---------------- */

function ChannelsTab({ companyId, userId }: { companyId: string; userId: string }) {
  const fetchStatus = useServerFn(getChannelStatus);
  const report = useServerFn(downloadMonthlyReport);
  const testPush = useServerFn(sendTestPush);
  const push = useMarciaNotifications({ companyId, userId });
  const [st, setSt] = useState<Awaited<ReturnType<typeof getChannelStatus>> | null>(null);
  const [busy, setBusy] = useState("");

  const load = () => void fetchStatus({ data: { companyId } }).then(setSt).catch(() => setSt(null));
  useEffect(load, [companyId, push.isSubscribed]);

  async function savePref(patch: Record<string, boolean>) {
    const { error } = await (supabase as any).from("notification_preference").upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) return toast.error("Não foi possível salvar.");
    setSt((s) => (s ? { ...s, ...(patch.whatsapp_enabled !== undefined ? { whatsappNotices: patch.whatsapp_enabled } : {}), ...(patch.monthly_report !== undefined ? { monthlyReport: patch.monthly_report } : {}) } : s));
    toast.success("Preferência salva.");
  }

  async function downloadReport() {
    setBusy("report");
    try {
      const r: any = await report({ data: { companyId } as any });
      const bin = atob(r.base64 || r.pdf || "");
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename || "relatorio-mensal.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível gerar o relatório.");
    } finally {
      setBusy("");
    }
  }

  const missing: string[] = [];
  if (st && !st.whatsappPhone) missing.push("vincular seu WhatsApp");
  if (st && st.pushDevices === 0) missing.push("ativar avisos no celular");

  return (
    <div className="space-y-5">
      {st && (
        <div className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${missing.length ? "border-warning/40 bg-warning/10" : "border-primary/30 bg-primary/5"}`}>
          {missing.length ? <CircleAlert className="size-5 shrink-0" /> : <CircleCheck className="size-5 shrink-0 text-primary" />}
          <span>{missing.length ? `Falta ${missing.join(" e ")} para aproveitar tudo.` : "Tudo conectado. A MIA fala com você por todos os canais."}</span>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Channel icon={Smartphone} title="Neste aplicativo" ok status="Pronto" text="Envie texto, áudio ou comprovante direto para a MIA.">
          <Button asChild variant="outline" size="sm"><Link to="/app/marcia">Abrir conversa</Link></Button>
        </Channel>
        <Channel icon={MessageCircle} title="WhatsApp" ok={Boolean(st?.whatsappPhone)} status={st ? (st.whatsappPhone ? `Vinculado ${maskPhone(st.whatsappPhone)}` : "Não vinculado") : "…"}
          text={st && !st.centralConnected ? "O canal do WhatsApp está temporariamente indisponível." : "Registre despesas e faça perguntas sem abrir o app."}>
          <Button asChild variant="outline" size="sm"><Link to="/app/conexao">{st?.whatsappPhone ? "Gerenciar" : "Vincular meu celular"}</Link></Button>
        </Channel>
        <Channel icon={Bell} title="Avisos no celular" ok={(st?.pushDevices || 0) > 0} status={st ? (st.pushDevices ? `${st.pushDevices} ${st.pushDevices === 1 ? "aparelho" : "aparelhos"}` : "Nenhum aparelho") : "…"} text="Contas a vencer, orçamento e novidades na tela do celular.">
          {push.isSubscribed ? (
            <Button variant="outline" size="sm" disabled={busy === "push"} onClick={async () => { setBusy("push"); const r = await testPush({ data: { companyId } }); setBusy(""); if (r.ok) toast.success("Teste enviado."); else toast.error(r.error); }}>Enviar teste</Button>
          ) : (
            <Button size="sm" disabled={busy === "push"} onClick={async () => { setBusy("push"); const r = await push.activate(); setBusy(""); if (r.ok) { toast.success("Aparelho cadastrado!"); load(); } else toast.error(r.error); }}>Ativar neste aparelho</Button>
          )}
        </Channel>
        <Channel icon={MessageCircle} title="Avisos pelo WhatsApp" ok={Boolean(st?.whatsappNotices && st?.whatsappPhone)} status={st?.whatsappNotices ? "Ligado" : "Desligado"} text="Receba também os avisos no seu WhatsApp vinculado.">
          <Switch checked={Boolean(st?.whatsappNotices)} disabled={!st} onCheckedChange={(v) => void savePref({ whatsapp_enabled: v })} aria-label="Avisos pelo WhatsApp" />
        </Channel>
        <Channel icon={FileText} title="Relatório mensal em PDF" ok={Boolean(st?.monthlyReport)} status={st?.monthlyReport ? "Envio automático ligado" : "Envio automático desligado"} text="Resumo do mês com entradas, saídas e categorias.">
          <div className="flex items-center gap-2">
            <Switch checked={Boolean(st?.monthlyReport)} disabled={!st} onCheckedChange={(v) => void savePref({ monthly_report: v })} aria-label="Relatório mensal automático" />
            <Button variant="outline" size="sm" disabled={busy === "report"} onClick={() => void downloadReport()}>{busy === "report" ? <Loader2 className="animate-spin" /> : <Download />} Baixar</Button>
          </div>
        </Channel>
        <Channel icon={CalendarDays} title="Calendário e lembretes" ok status="Pronto" text="Agende contas futuras e recorrentes. A MIA avisa antes do vencimento.">
          <Button asChild variant="outline" size="sm"><Link to="/app/planejamento">Abrir calendário</Link></Button>
        </Channel>
      </div>
    </div>
  );
}

function Channel({ icon: Icon, title, status, text, ok, children }: { icon: ComponentType<{ className?: string }>; title: string; status: string; text: string; ok?: boolean; children?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-4 rounded-[22px] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-5" /></div>
        <Badge variant={ok ? "default" : "secondary"} className="rounded-full">{status}</Badge>
      </div>
      <div className="flex-1">
        <h3 className="font-display font-extrabold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
      <div>{children}</div>
    </Card>
  );
}

/* ---------------- Conta e plano ---------------- */

function AccountTab({ companyId }: { companyId: string }) {
  const ctx = Route.useRouteContext();
  const router = useRouter();
  const fetchOverview = useServerFn(getAccountOverview);
  const saveContact = useServerFn(saveSubscriberContact);
  const [ov, setOv] = useState<Awaited<ReturnType<typeof getAccountOverview>> | null>(null);
  const [compare, setCompare] = useState(false);
  const [empresa, setEmpresa] = useState({ nome: ctx.company?.nome ?? "", telefone: maskBrazilianPhoneInput(ctx.company?.telefone ?? "") });
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchOverview({ data: { companyId } }).then(setOv).catch((e) => toast.error(e?.message || "Erro ao carregar o plano."));
    void supabase.from("profiles").select("nome").eq("user_id", ctx.user.id).maybeSingle().then(({ data }) => setNome(data?.nome ?? ""));
  }, [companyId]);

  async function saveData() {
    if (empresa.nome.trim().length < 2) return toast.error("Informe o nome do espaço.");
    const phoneError = brazilianPhoneError(empresa.telefone, { required: false });
    if (phoneError) return toast.error(phoneError);
    setSaving(true);
    try {
      const saved = await saveContact({ data: { companyId, nome: empresa.nome, telefone: empresa.telefone || null } });
      patchCachedAppCompany(companyId, saved);
      const { error } = await supabase.from("profiles").update({ nome: nome || null }).eq("user_id", ctx.user.id);
      if (error) throw error;
      await router.invalidate();
      toast.success("Dados salvos.");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível salvar agora.");
    } finally {
      setSaving(false);
    }
  }

  const sub = ov?.subscription;
  const plan = sub?.plan as any;
  const validity = planValidity(sub?.periodEnd);
  const isTrial = sub?.status === "trialing" || ov?.billingStatus === "trial";
  const isActive = !validity.expired && (sub?.status === "active" || ov?.billingStatus === "ativo" || isTrial);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card className={cardCls}>
          <SectionTitle icon={CreditCard} title="Seu plano" action={ov && <Badge variant={isActive ? "default" : "destructive"} className="rounded-full">{validity.expired ? "Vencido" : isTrial ? "Em teste" : isActive ? "Ativo" : "Inativo"}</Badge>} />
          {!ov ? <Loader2 className="animate-spin text-muted-foreground" /> : (
            <>
              <div>
                <p className="font-display text-3xl font-black">{plan?.nome || "Sem plano"}</p>
                {plan && <p className="text-sm text-muted-foreground">{plan.is_free ? "Gratuito" : `${money(plan.preco_cents, plan.moeda)}/${plan.intervalo === "year" ? "ano" : "mês"}`}</p>}
              </div>
              {validity.daysLeft !== null && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>Válido até <b>{fmtDate(sub?.periodEnd)}</b></span><span className="text-muted-foreground">{validity.daysLeft} {validity.daysLeft === 1 ? "dia" : "dias"}</span></div>
                  <Progress value={validity.percentLeft} />
                </div>
              )}
              <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">O pagamento é pela InfinitePay, por Pix ou cartão. A renovação não é automática: cada pagamento libera mais 30 dias, e avisamos antes de vencer.</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild><Link to="/app/checkout" search={{ plano: plan?.slug } as any}><CreditCard /> {isActive && !isTrial ? "Renovar plano" : "Ativar plano"}</Link></Button>
                <Button variant="outline" onClick={() => setCompare(true)}>Comparar planos</Button>
              </div>
            </>
          )}
        </Card>
        <Card className={cardCls}>
          <SectionTitle icon={Sparkles} title="Uso do plano" />
          {!ov ? <Loader2 className="animate-spin text-muted-foreground" /> : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Créditos de IA disponíveis</p>
                <p className="font-display text-3xl font-black">{ov.credits.balance.toLocaleString("pt-BR")}</p>
                {plan?.creditos_mensais ? <Progress className="mt-2" value={Math.min(100, (ov.credits.balance / plan.creditos_mensais) * 100)} /> : null}
                <p className="mt-1 text-xs text-muted-foreground">{plan?.creditos_mensais ? `${plan.creditos_mensais.toLocaleString("pt-BR")} por mês` : ""}{ov.credits.resetsAt ? ` · renovam em ${fmtDate(ov.credits.resetsAt)}` : ""}</p>
              </div>
              {plan?.limite_usuarios ? <p className="text-sm">Até <b>{plan.limite_usuarios}</b> {plan.limite_usuarios === 1 ? "pessoa" : "pessoas"} no espaço</p> : null}
            </div>
          )}
        </Card>
      </div>

      <Card className={cardCls}>
        <SectionTitle icon={Wallet} title="Histórico de pagamentos" />
        {!ov ? null : ov.payments.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p> : (
          <div className="divide-y divide-border rounded-2xl border border-border">
            {ov.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div><p className="font-semibold">{p.provider === "infinitepay" ? "InfinitePay" : p.provider || "Pagamento"}</p><p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString("pt-BR")}</p></div>
                <div className="flex items-center gap-3">{p.amountCents > 0 && <b>{money(p.amountCents)}</b>}<Badge variant={p.ok ? "default" : "secondary"} className="rounded-full">{p.ok ? "Confirmado" : "Em análise"}</Badge></div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className={cardCls}>
          <SectionTitle icon={UserRound} title="Meus dados" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Seu nome</Label><Input className="mt-1.5" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><Label>E-mail</Label><Input className="mt-1.5" value={ctx.user.email ?? ""} disabled /></div>
            <div><Label>Nome do espaço</Label><Input className="mt-1.5" value={empresa.nome} onChange={(e) => setEmpresa({ ...empresa, nome: e.target.value })} /></div>
            <div>
              <Label htmlFor="company-phone">Telefone de contato</Label>
              <Input id="company-phone" className="mt-1.5" {...PHONE_INPUT_PROPS} value={empresa.telefone} onChange={(e) => setEmpresa({ ...empresa, telefone: maskBrazilianPhoneInput(e.target.value) })} />
            </div>
          </div>
          <Button onClick={saveData} disabled={saving} className="w-full">{saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar dados</Button>
        </Card>
        <PasswordCard />
      </div>

      <Dialog open={compare} onOpenChange={setCompare}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Planos disponíveis</DialogTitle><DialogDescription>Escolha um plano para ir ao pagamento.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(ov?.plans || []).map((p: any) => {
              const current = p.id === plan?.id;
              const feats: string[] = Array.isArray(p.features) ? p.features.map(String).slice(0, 5) : [];
              return (
                <div key={p.id} className={`flex flex-col rounded-2xl border p-4 ${current ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
                  <div className="flex items-center justify-between"><b>{p.nome}</b>{current && <Badge className="rounded-full">Atual</Badge>}</div>
                  <p className="mt-1 font-display text-xl font-black">{p.is_free ? "Grátis" : money(p.preco_cents, p.moeda)}<span className="text-xs font-normal text-muted-foreground">{p.is_free ? ` · ${p.free_days} dias` : "/mês"}</span></p>
                  {p.creditos_mensais ? <p className="text-xs text-muted-foreground">{p.creditos_mensais.toLocaleString("pt-BR")} créditos de IA/mês</p> : null}
                  <ul className="mt-3 flex-1 space-y-1 text-xs">{feats.map((f) => <li key={f} className="flex gap-1.5"><Check className="size-3.5 shrink-0 text-primary" />{f}</li>)}</ul>
                  {!p.is_free && <Button asChild size="sm" className="mt-3" variant={current ? "outline" : "default"}><Link to="/app/checkout" search={{ plano: p.slug } as any}>{current ? "Renovar" : "Escolher"}</Link></Button>}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PasswordCard() {
  const [pw, setPw] = useState({ nova: "", confirma: "" });
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const strength = passwordStrength(pw.nova);
  const labels = ["Muito curta", "Fraca", "Razoável", "Boa", "Forte"];

  async function save() {
    if (pw.nova.length < 8) return toast.error("Use pelo menos 8 caracteres.");
    if (pw.nova !== pw.confirma) return toast.error("As senhas não conferem.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw.nova });
    setSaving(false);
    if (error) return toast.error(error.message);
    setPw({ nova: "", confirma: "" });
    toast.success("Senha alterada.");
  }

  return (
    <Card className={cardCls}>
      <SectionTitle icon={Shield} title="Trocar senha" action={<Button variant="ghost" size="icon" onClick={() => setShow((s) => !s)} aria-label={show ? "Esconder senha" : "Mostrar senha"}>{show ? <EyeOff /> : <Eye />}</Button>} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Nova senha</Label><Input className="mt-1.5" type={show ? "text" : "password"} value={pw.nova} onChange={(e) => setPw({ ...pw, nova: e.target.value })} /></div>
        <div><Label>Confirmar</Label><Input className="mt-1.5" type={show ? "text" : "password"} value={pw.confirma} onChange={(e) => setPw({ ...pw, confirma: e.target.value })} /></div>
      </div>
      {pw.nova && (
        <div className="space-y-1">
          <div className="grid grid-cols-4 gap-1">{[1, 2, 3, 4].map((i) => <div key={i} className={`h-1.5 rounded-full ${strength >= i ? "bg-primary" : "bg-muted"}`} />)}</div>
          <p className="text-xs text-muted-foreground">{labels[strength]}</p>
        </div>
      )}
      <Button onClick={save} disabled={saving} className="w-full">{saving ? <Loader2 className="animate-spin" /> : <Save />} Trocar senha</Button>
    </Card>
  );
}

/* ---------------- Privacidade ---------------- */

function PrivacyTab({ companyId }: { companyId: string }) {
  const ctx = Route.useRouteContext();
  const fetchLog = useServerFn(listAuditLog);
  const fetchExport = useServerFn(exportLgpd);
  const fetchCsv = useServerFn(exportTransactionsCsv);
  const fetchStatus = useServerFn(getChannelStatus);
  const getDel = useServerFn(getDeletionRequest);
  const reqDel = useServerFn(requestAccountDeletion);
  const cancelDel = useServerFn(cancelAccountDeletion);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<"all" | "acesso" | "dados" | "conta">("all");
  const [limit, setLimit] = useState(20);
  const [busy, setBusy] = useState("");
  const [devices, setDevices] = useState<number | null>(null);
  const [pending, setPending] = useState<{ created_at: string } | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    void fetchLog().then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
    void fetchStatus({ data: { companyId } }).then((s) => setDevices(s.pushDevices)).catch(() => setDevices(null));
    void getDel().then(setPending).catch(() => setPending(null));
  }, [companyId]);

  const visible = useMemo(() => rows.filter((r) => group === "all" || auditGroup(r.acao) === group), [rows, group]);

  function download(content: string, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  const day = new Date().toISOString().slice(0, 10);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try { await fn(); } catch (e: any) { toast.error(e?.message || "Algo deu errado."); } finally { setBusy(""); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className={cardCls}>
        <SectionTitle icon={Bell} title="Avisos do aplicativo" text={devices === null ? "Carregando…" : devices ? `Ativos em ${devices} ${devices === 1 ? "aparelho" : "aparelhos"}.` : "Nenhum aparelho recebe avisos ainda."} action={<Button asChild variant="outline" size="sm"><Link to="/app/notificacoes">Gerenciar</Link></Button>} />
      </Card>
      <Card className={cardCls}>
        <SectionTitle icon={LogOut} title="Sair de todos os aparelhos" text="Encerra sua sessão em todos os celulares e computadores, inclusive neste." action={
          <Button variant="outline" size="sm" disabled={busy === "out"} onClick={() => void run("out", async () => { await supabase.auth.signOut({ scope: "global" }); await signOutRealm("subscriber" as any); window.location.href = "/entrar"; })}>Sair de tudo</Button>
        } />
      </Card>
      <Card className={`${cardCls} lg:col-span-2`}>
        <SectionTitle icon={Download} title="Exportar meus dados" text="Baixe uma cópia do que está guardado no MIAnota." />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy === "json"} onClick={() => void run("json", async () => { download(JSON.stringify(await fetchExport(), null, 2), `mianota-dados-${day}.json`, "application/json"); toast.success("Exportação concluída."); })}>{busy === "json" ? <Loader2 className="animate-spin" /> : <Download />} Todos os dados (JSON)</Button>
          <Button variant="outline" disabled={busy === "csv"} onClick={() => void run("csv", async () => { const r = await fetchCsv({ data: { companyId } }); download(r.csv, `mianota-lancamentos-${day}.csv`, "text/csv;charset=utf-8"); toast.success("Planilha baixada."); })}>{busy === "csv" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Lançamentos (planilha)</Button>
        </div>
      </Card>
      <Card className={`${cardCls} lg:col-span-2`}>
        <SectionTitle icon={Shield} title="Histórico de atividades" text="O que foi feito na sua conta, do mais recente ao mais antigo." />
        <div className="flex flex-wrap gap-2">
          {([["all", "Tudo"], ["acesso", "Acessos"], ["dados", "Lançamentos e dados"], ["conta", "Conta e plano"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setGroup(k); setLimit(20); }} className={`rounded-full px-3 py-1.5 text-xs font-bold ${group === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        {loading ? <Loader2 className="animate-spin text-muted-foreground" /> : visible.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p> : (
          <div className="divide-y divide-border rounded-2xl border border-border">
            {visible.slice(0, limit).map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                <div className="min-w-0"><p className="truncate font-semibold">{auditLabel(r.acao, r.recurso)}</p><p className="truncate text-xs text-muted-foreground">{r.actor_email ?? "Sistema"}</p></div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        )}
        {visible.length > limit && <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 20)}>Ver mais</Button>}
      </Card>
      <Card className={`${cardCls} border-destructive/30 lg:col-span-2`}>
        <SectionTitle icon={Trash2} title="Excluir minha conta" text={pending ? `Pedido enviado em ${fmtDate(pending.created_at)}. Está em análise.` : "Pedido de exclusão dos seus dados (LGPD). A equipe confirma em até 15 dias."}
          action={pending ? <Button variant="outline" size="sm" disabled={busy === "cancel"} onClick={() => void run("cancel", async () => { await cancelDel(); setPending(null); toast.success("Pedido cancelado."); })}>Cancelar pedido</Button> : <Button variant="destructive" size="sm" onClick={() => setDelOpen(true)}>Pedir exclusão</Button>} />
      </Card>
      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pedir exclusão da conta</DialogTitle><DialogDescription>Para confirmar, digite o e-mail da sua conta: <b>{ctx.user.email}</b></DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="seu@email.com" />
            <Input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelOpen(false)}>Voltar</Button>
            <Button variant="destructive" disabled={busy === "del" || confirm.trim().toLowerCase() !== String(ctx.user.email || "").toLowerCase()}
              onClick={() => void run("del", async () => { await reqDel({ data: { companyId, confirmEmail: confirm, reason } }); setPending({ created_at: new Date().toISOString() }); setDelOpen(false); toast.success("Pedido enviado."); })}>Enviar pedido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
