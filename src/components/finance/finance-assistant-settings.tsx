/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  BellRing,
  Bot,
  Check,
  ChevronRight,
  Lock,
  MessageCircle,
  PiggyBank,
  Plus,
  ShieldCheck,
  Sparkles,
  Tags,
  Target,
  Trash2,
  Wallet,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import fallbackAvatarUrl from "@/assets/marcia-avatar-640.png";
import { PageHeader, LoadingBlocks } from "@/components/marcia/page-kit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/money-input";
import { useBrand } from "@/contexts/brand-context";
import { supabase } from "@/lib/auth/realm-supabase";
import { getAssistantKnowledge, saveAssistantProfile } from "@/lib/assistant-profile.functions";
import {
  DEFAULT_ASSISTANT_PROFILE,
  GOAL_LABEL,
  MAX_CATEGORY_RULES,
  MAX_CUSTOM_RULES,
  normalizeAssistantProfile,
  personalizeReply,
  type AssistantProfile,
  type PrimaryGoal,
} from "@/lib/assistant-profile-rules";

type Knowledge = {
  transactions: number;
  topCategories: { name: string; count: number }[];
  whatsappLinked: boolean;
  categories: { id: string; name: string; type: string }[];
};

const STYLES: [AssistantProfile["assistant_style"], string, string][] = [
  ["direta", "Direta", "Resposta curta e objetiva"],
  ["didatica", "Didática", "Explica o raciocínio"],
  ["motivadora", "Motivadora", "Incentiva bons hábitos"],
];

export function FinanceAssistantSettings({ companyId }: { companyId?: string | null }) {
  const branding = useBrand();
  const save = useServerFn(saveAssistantProfile);
  const loadKnowledge = useServerFn(getAssistantKnowledge);
  const [profile, setProfile] = useState<AssistantProfile>(DEFAULT_ASSISTANT_PROFILE);
  const [saved, setSaved] = useState<string>(JSON.stringify(DEFAULT_ASSISTANT_PROFILE));
  const [knowledge, setKnowledge] = useState<Knowledge | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState("");
  const [kw, setKw] = useState("");
  const [kwCat, setKwCat] = useState("");

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    void (supabase as any)
      .from("company")
      .select("finance_profile")
      .eq("id", companyId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!active) return;
        const p = normalizeAssistantProfile(data?.finance_profile);
        setProfile(p);
        setSaved(JSON.stringify(p));
        setLoading(false);
      });
    loadKnowledge({ data: { companyId } })
      .then((k: any) => active && setKnowledge(k as Knowledge))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [companyId, loadKnowledge]);

  const dirty = JSON.stringify(profile) !== saved;
  const set = <K extends keyof AssistantProfile>(k: K, v: AssistantProfile[K]) =>
    setProfile((c) => ({ ...c, [k]: v }));
  const catName = useMemo(
    () => new Map<string, string>((knowledge?.categories || []).map((c) => [c.id, c.name])),
    [knowledge],
  );

  const preview = useMemo(() => {
    const base =
      profile.response_length === "detalhada"
        ? `Seu gasto com alimentação chegou a ${profile.alert_budget_percent}% do limite 📊. O que mais pesou foram 3 pedidos de delivery. Quer ver os detalhes?`
        : `Alimentação chegou a ${profile.alert_budget_percent}% do limite 📊. Quer ver o que mais pesou?`;
    return personalizeReply(base, profile);
  }, [profile]);

  async function onSave() {
    if (!companyId) return;
    setSaving(true);
    try {
      const r = await save({ data: { companyId, profile } });
      setProfile(r.profile);
      setSaved(JSON.stringify(r.profile));
      toast.success(`${branding.assistantName} aprendeu suas preferências.`);
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível salvar agora.");
    } finally {
      setSaving(false);
    }
  }

  function addRule() {
    const t = newRule.replace(/\s+/g, " ").trim();
    if (!t) return;
    if (profile.custom_rules.length >= MAX_CUSTOM_RULES) return toast.error(`Máximo de ${MAX_CUSTOM_RULES} regras.`);
    set("custom_rules", [...profile.custom_rules, t.slice(0, 160)]);
    setNewRule("");
  }

  function addCategoryRule() {
    const keyword = kw.trim().toLowerCase();
    if (!keyword || !kwCat) return;
    if (profile.category_rules.length >= MAX_CATEGORY_RULES) return toast.error(`Máximo de ${MAX_CATEGORY_RULES} regras.`);
    if (profile.category_rules.some((r) => r.keyword === keyword)) return toast.error("Essa palavra já tem uma categoria.");
    set("category_rules", [...profile.category_rules, { keyword, categoryId: kwCat }]);
    setKw("");
    setKwCat("");
  }

  if (loading)
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <LoadingBlocks count={3} />
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-28 lg:pb-10">
      <PageHeader
        eyebrow="Personalidade e regras"
        title={`Ensine a ${branding.assistantName} a cuidar do seu dinheiro.`}
        description="Escolha como ela fala, quando alerta e o que sempre precisa confirmar. Sem escrever prompt."
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/app/marcia">
              <MessageCircle /> Testar a {branding.assistantName}
            </Link>
          </Button>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Tabs defaultValue="conversa" className="min-w-0">
          <TabsList className="mb-4 h-auto w-full flex-wrap justify-start gap-1 rounded-2xl p-1">
            <TabsTrigger value="conversa" className="rounded-xl"><Bot className="size-4" /> Conversa</TabsTrigger>
            <TabsTrigger value="regras" className="rounded-xl"><Wand2 className="size-4" /> Regras</TabsTrigger>
            <TabsTrigger value="alertas" className="rounded-xl"><BellRing className="size-4" /> Alertas</TabsTrigger>
            <TabsTrigger value="integracoes" className="rounded-xl"><Sparkles className="size-4" /> Integrações</TabsTrigger>
          </TabsList>

          <TabsContent value="conversa" className="space-y-5">
            <Section icon={<Bot className="size-5" />} title="Como ela conversa" text="A prévia ao lado muda enquanto você escolhe.">
              <div className="space-y-2">
                <Label htmlFor="preferred-name">Como você quer ser chamado?</Label>
                <Input id="preferred-name" value={profile.preferred_name} maxLength={80} onChange={(e) => set("preferred_name", e.target.value)} placeholder="Ex.: Luis" className="h-12 rounded-xl" />
              </div>
              <div>
                <Label>Estilo das respostas</Label>
                <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup">
                  {STYLES.map(([value, label, text]) => (
                    <Choice key={value} active={profile.assistant_style === value} onClick={() => set("assistant_style", value)} label={label} text={text} />
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Tamanho das respostas</Label>
                  <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup">
                    <Choice active={profile.response_length === "curta"} onClick={() => set("response_length", "curta")} label="Curta" />
                    <Choice active={profile.response_length === "detalhada"} onClick={() => set("response_length", "detalhada")} label="Detalhada" />
                  </div>
                </div>
                <ToggleRow checked={profile.use_emojis} onChange={(v) => set("use_emojis", v)} title="Usar emojis" text="Deixa as mensagens mais leves." />
              </div>
            </Section>

            <Section icon={<Target className="size-5" />} title="Seu foco principal" text="Muda o tipo de dica que ela dá.">
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
                {(Object.keys(GOAL_LABEL) as PrimaryGoal[]).map((g) => (
                  <Choice key={g} active={profile.primary_goal === g} onClick={() => set("primary_goal", g)} label={GOAL_LABEL[g]} />
                ))}
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="regras" className="space-y-5">
            <Section icon={<Wand2 className="size-5" />} title="Regras personalizadas" text={`Frases curtas que ela segue. Até ${MAX_CUSTOM_RULES}.`}>
              <div className="flex gap-2">
                <Input value={newRule} maxLength={160} onChange={(e) => setNewRule(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRule())} placeholder='Ex.: "Não me mande dica de investimento"' className="h-11 rounded-xl" />
                <Button type="button" onClick={addRule} className="h-11 rounded-xl" aria-label="Adicionar regra"><Plus /></Button>
              </div>
              {profile.custom_rules.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Nenhuma regra ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {profile.custom_rules.map((r, i) => (
                    <li key={`${r}-${i}`} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
                      <Check className="size-4 shrink-0 text-primary" />
                      <span className="flex-1">{r}</span>
                      <Button variant="ghost" size="icon" aria-label="Remover regra" onClick={() => set("custom_rules", profile.custom_rules.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section icon={<Tags className="size-5" />} title="Categorias automáticas" text="Quando a palavra aparecer, ela usa sempre essa categoria.">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input value={kw} maxLength={60} onChange={(e) => setKw(e.target.value)} placeholder="Palavra ou loja (ex.: mercado)" className="h-11 rounded-xl" />
                <Select value={kwCat} onValueChange={setKwCat}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    {(knowledge?.categories || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addCategoryRule} disabled={!kw.trim() || !kwCat} className="h-11 rounded-xl"><Plus /> Adicionar</Button>
              </div>
              {profile.category_rules.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profile.category_rules.map((r) => (
                    <span key={r.keyword} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-3 pr-1 text-xs font-bold">
                      “{r.keyword}” <ChevronRight className="size-3" /> {catName.get(r.categoryId) || "Categoria removida"}
                      <button type="button" aria-label={`Remover ${r.keyword}`} onClick={() => set("category_rules", profile.category_rules.filter((x) => x.keyword !== r.keyword))} className="grid size-6 place-items-center rounded-full hover:bg-background"><X className="size-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </Section>

            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
              <Lock className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-bold">Confirmar antes de salvar: sempre ligado</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Ela mostra o lançamento e espera seu “confirmar”. Assim um áudio mal entendido ou uma foto borrada nunca viram um valor errado.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="alertas" className="space-y-5">
            <Section icon={<BellRing className="size-5" />} title="Alertas inteligentes" text="Só o que ajuda a tomar decisão.">
              <div>
                <div className="flex items-center justify-between">
                  <Label>Avisar ao usar quanto do orçamento?</Label>
                  <span className="rounded-xl bg-primary/10 px-3 py-1 font-black text-primary">{profile.alert_budget_percent}%</span>
                </div>
                <Slider className="mt-4" min={50} max={100} step={5} value={[profile.alert_budget_percent]} onValueChange={([v]) => set("alert_budget_percent", v)} aria-label="Percentual de alerta do orçamento" />
                <p className="mt-2 text-xs text-muted-foreground">Vale para todas as categorias. Se um orçamento tiver um percentual próprio, vale o dele.</p>
              </div>
              <div className="space-y-2">
                <Label>Avisar quando um único gasto passar de</Label>
                <MoneyInput cents={profile.large_expense_cents} onChange={(c: number | null) => set("large_expense_cents", c || 0)} allowZero className="h-11 rounded-xl" />
                <p className="text-xs text-muted-foreground">Deixe R$ 0,00 para não avisar.</p>
              </div>
              <ToggleRow checked={profile.weekly_summary} onChange={(v) => set("weekly_summary", v)} title="Resumo semanal" text="Toda segunda: quanto gastou, o que mais pesou e as contas da semana." />
              <ToggleRow checked={profile.proactive_insights} onChange={(v) => set("proactive_insights", v)} title="Insights proativos" text="Avisos de gasto alto e riscos no orçamento." />
            </Section>
          </TabsContent>

          <TabsContent value="integracoes" className="space-y-5">
            <Section icon={<Sparkles className="size-5" />} title={`O que a ${branding.assistantName} já sabe`} text="Dados reais da sua conta.">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Lançamentos" value={knowledge ? String(knowledge.transactions) : "—"} />
                <Stat label="Mais usadas (90 dias)" value={knowledge?.topCategories.length ? knowledge.topCategories.map((c) => c.name).join(", ") : "—"} />
                <Stat label="WhatsApp" value={knowledge ? (knowledge.whatsappLinked ? "Conectado" : "Não conectado") : "—"} />
              </div>
            </Section>
            <div className="grid gap-3 sm:grid-cols-2">
              <Shortcut to="/app/orcamentos" icon={<Wallet className="size-5" />} title="Orçamentos" text="Limites por categoria" />
              <Shortcut to="/app/planejamento" icon={<PiggyBank className="size-5" />} title="Metas e planejamento" text="Ligadas ao seu foco" />
              <Shortcut to="/app/configuracoes" icon={<Tags className="size-5" />} title="Categorias e conta" text="Ajuste suas categorias" />
              <Shortcut to="/app/notificacoes" icon={<Bell className="size-5" />} title="Notificações" text="Silêncio e onde receber" />
              <Shortcut to="/app/conexao" icon={<MessageCircle className="size-5" />} title="WhatsApp" text="Fale com ela pelo celular" />
            </div>
          </TabsContent>
        </Tabs>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="overflow-hidden rounded-[28px] border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="relative mx-auto size-32 overflow-hidden rounded-full border border-border bg-primary/10">
              <img src={branding.avatarUrl || fallbackAvatarUrl} alt={branding.assistantName} className="absolute inset-x-0 top-0 h-48 w-full object-cover object-top" />
            </div>
            <div className="mt-4 text-center">
              <div className="font-display text-2xl font-black">{branding.assistantName}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-[.14em] text-primary">{GOAL_LABEL[profile.primary_goal]}</div>
            </div>
            <div className="mt-5 rounded-2xl bg-muted/60 p-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.1em] text-primary">
                <MessageCircle className="size-3.5" /> Prévia ao vivo
              </div>
              <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6">{preview}</p>
            </div>
          </Card>
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-xs leading-5">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>A assistente nunca inventa valores. Suas regras ajustam o jeito dela, nunca a segurança.</span>
          </div>
          <Button onClick={onSave} disabled={saving || !dirty} className="hidden h-12 w-full rounded-xl text-sm font-black lg:flex">
            {saving ? <Sparkles className="animate-pulse" /> : <Sparkles />} {dirty ? `Salvar e ensinar a ${branding.assistantName}` : "Tudo salvo"}
          </Button>
        </aside>
      </section>

      <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden ${dirty ? "" : "hidden"}`}>
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <span className="flex-1 text-xs font-bold text-muted-foreground">Alterações não salvas</span>
          <Button onClick={onSave} disabled={saving} className="h-11 rounded-xl font-black"><Sparkles /> Salvar</Button>
        </div>
      </div>
      {dirty && <p className="hidden text-right text-xs font-bold text-muted-foreground lg:block">Alterações não salvas</p>}
    </div>
  );
}

function Section({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-5 rounded-[28px] border-border p-6 shadow-[var(--shadow-card)] sm:p-7">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
        <div>
          <h2 className="font-display text-xl font-black">{title}</h2>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function Choice({ active, onClick, label, text }: { active: boolean; onClick: () => void; label: string; text?: string }) {
  return (
    <button type="button" role="radio" aria-checked={active} onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${active ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}>
      <div className="flex items-center justify-between">
        <span className="font-black">{label}</span>
        {active && <Check className="size-4 text-primary" />}
      </div>
      {text && <div className="mt-1 text-xs leading-5 text-muted-foreground">{text}</div>}
    </button>
  );
}

function ToggleRow({ checked, onChange, title, text }: { checked: boolean; onChange: (v: boolean) => void; title: string; text: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-border p-4">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span>
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{text}</span>
      </span>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-extrabold leading-tight">{value}</div>
    </div>
  );
}

function Shortcut({ to, icon, title, text }: { to: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link to={to as any} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40">
      <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-black">{title}</div>
        <div className="text-xs text-muted-foreground">{text}</div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
