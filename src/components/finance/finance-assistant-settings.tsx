/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { BellRing, Bot, Check, Loader2, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import fallbackAvatarUrl from "@/assets/marcia-avatar-640.png";
import { PageHeader } from "@/components/marcia/page-kit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBrand } from "@/contexts/brand-context";
import { supabase } from "@/lib/auth/realm-supabase";

type Profile = {
  preferred_name: string;
  primary_goal: string;
  assistant_style: "direta" | "didatica" | "motivadora";
  alert_budget_percent: number;
  ask_before_save: boolean;
  weekly_summary: boolean;
  proactive_insights: boolean;
};

const DEFAULTS: Profile = {
  preferred_name: "",
  primary_goal: "control",
  assistant_style: "direta",
  alert_budget_percent: 80,
  ask_before_save: true,
  weekly_summary: true,
  proactive_insights: true,
};

export function FinanceAssistantSettings({ companyId }: { companyId?: string | null }) {
  const branding = useBrand();
  const [profile, setProfile] = useState<Profile>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    void (supabase as any)
      .from("company")
      .select("finance_profile")
      .eq("id", companyId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (active) setProfile({ ...DEFAULTS, ...(data?.finance_profile || {}) });
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [companyId]);

  async function save() {
    if (!companyId) return;
    setSaving(true);
    try {
      const result = await (supabase as any)
        .from("company")
        .update({ finance_profile: profile })
        .eq("id", companyId);
      if (result.error) throw result.error;
      toast.success(`${branding.assistantName} aprendeu suas preferências.`);
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível salvar agora.");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="grid min-h-[420px] place-items-center">
        <Loader2 className="size-7 animate-spin text-violet-600" />
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <PageHeader
        eyebrow="Personalidade e regras"
        title={`Ensine a ${branding.assistantName} a cuidar do seu dinheiro.`}
        description="Escolha como ela fala, quando alerta e o que sempre precisa confirmar. Sem escrever prompt."
      />
      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="rounded-[28px] border-violet-100 p-6 shadow-[var(--shadow-card)] sm:p-7">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                <Bot className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-black">Como ela conversa</h2>
                <p className="text-sm text-muted-foreground">Duas escolhas e está pronto.</p>
              </div>
            </div>
            <label className="mt-6 block text-sm font-bold">
              Como você quer ser chamado?
              <input
                value={profile.preferred_name}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    preferred_name: event.target.value.slice(0, 80),
                  }))
                }
                className="mt-2 h-12 w-full rounded-xl border border-border bg-muted/25 px-4 outline-none focus:border-violet-500"
                placeholder="Ex.: Luis"
              />
            </label>
            <div className="mt-6">
              <div className="text-sm font-bold">Estilo das respostas</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  ["direta", "Direta", "Resposta curta e objetiva"],
                  ["didatica", "Didática", "Explica o raciocínio"],
                  ["motivadora", "Motivadora", "Incentiva bons hábitos"],
                ].map(([value, label, text]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setProfile((current) => ({
                        ...current,
                        assistant_style: value as Profile["assistant_style"],
                      }))
                    }
                    className={`rounded-2xl border p-4 text-left transition ${profile.assistant_style === value ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100" : "border-border hover:border-violet-200"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black">{label}</span>
                      {profile.assistant_style === value && (
                        <Check className="size-4 text-violet-600" />
                      )}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{text}</div>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px] border-violet-100 p-6 shadow-[var(--shadow-card)] sm:p-7">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                <BellRing className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-black">Alertas inteligentes</h2>
                <p className="text-sm text-muted-foreground">Só o que ajuda a tomar decisão.</p>
              </div>
            </div>
            <label className="mt-6 block text-sm font-bold">
              Avisar ao usar quanto do orçamento?
              <div className="mt-3 flex items-center gap-4">
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={profile.alert_budget_percent}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      alert_budget_percent: Number(event.target.value),
                    }))
                  }
                  className="flex-1 accent-violet-600"
                />
                <span className="min-w-14 rounded-xl bg-violet-50 px-3 py-2 text-center font-black text-violet-700">
                  {profile.alert_budget_percent}%
                </span>
              </div>
            </label>
            <div className="mt-6 space-y-3">
              <Toggle
                checked={profile.weekly_summary}
                onChange={(checked) =>
                  setProfile((current) => ({ ...current, weekly_summary: checked }))
                }
                title="Resumo semanal"
                text="Uma leitura curta do que mudou na semana."
              />
              <Toggle
                checked={profile.proactive_insights}
                onChange={(checked) =>
                  setProfile((current) => ({ ...current, proactive_insights: checked }))
                }
                title="Insights proativos"
                text="Destacar aumentos, riscos e oportunidades."
              />
              <Toggle
                checked={profile.ask_before_save}
                onChange={(checked) =>
                  setProfile((current) => ({ ...current, ask_before_save: checked }))
                }
                title="Confirmar antes de salvar"
                text="Recomendado para evitar lançamentos incorretos."
                locked
              />
            </div>
          </Card>
          <Button
            onClick={save}
            disabled={saving}
            className="h-12 w-full rounded-xl bg-violet-700 text-sm font-black hover:bg-violet-800"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Sparkles />} Salvar e ensinar a{" "}
            {branding.assistantName}
          </Button>
        </div>

        <aside className="space-y-4">
          <Card className="relative overflow-hidden rounded-[28px] border-violet-200 bg-[#1d102a] p-6 text-white shadow-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,.35),transparent_38%)]" />
            <div className="relative">
              <div className="relative mx-auto size-36 overflow-hidden rounded-full border border-white/10 bg-violet-500/15">
                <img
                  src={branding.avatarUrl || fallbackAvatarUrl}
                  alt={branding.assistantName}
                  className="absolute inset-x-0 top-0 h-52 w-full object-cover object-top"
                />
              </div>
              <div className="mt-5 text-center">
                <div className="font-display text-2xl font-black">{branding.assistantName}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[.14em] text-violet-300">
                  Assessora ativa
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-white p-4 text-[#2b1c36]">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.1em] text-violet-600">
                  <MessageCircle className="size-3.5" /> Exemplo de resposta
                </div>
                <p className="mt-3 text-sm font-bold leading-6">
                  {profile.preferred_name ? `${profile.preferred_name}, ` : ""}seu gasto com
                  alimentação chegou a {profile.alert_budget_percent}% do limite. Quer ver o que
                  mais pesou?
                </p>
              </div>
            </div>
          </Card>
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs leading-5 text-emerald-950">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
            <span>
              A assistente nunca deve inventar valores. A confirmação continua sendo a última
              palavra.
            </span>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  text,
  locked = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  text: string;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-4 rounded-2xl border border-border p-4 text-left disabled:cursor-not-allowed disabled:opacity-80"
    >
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-violet-600" : "bg-muted"}`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`}
        />
      </span>
      <span>
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}
