import { createFileRoute, redirect, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
// /entrar usa SOMENTE a sessão do assinante (cliente padrão). A sessão do
// proprietário vive em outro cliente/armazenamento e é ignorada aqui.
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Mic,
  Gauge,
  ReceiptText,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import fallbackAvatarUrl from "@/assets/marcia-avatar-640.png";
import { useBrand } from "@/contexts/brand-context";
import { BrandLogo } from "@/components/brand-logo";
import { clearAppAccessCache } from "@/lib/app-access-cache";
import { clearImpersonation } from "@/lib/auth/realm-supabase";
import { EMAIL_INPUT_PROPS, emailError, normalizeEmail } from "@/lib/masks";
import { formatCentsBRL } from "@/lib/money";
import { normalizePlanSlug, resolveSignupPlan } from "@/lib/plan-selection";

type Search = { modo?: "login" | "signup"; plano?: string };

type PlanInfo = { slug: string; nome: string; preco: string; trialDays: number };

const PLAN_FALLBACK: Record<string, Omit<PlanInfo, "slug">> = {
  starter: { nome: "Basic", preco: "R$ 49,00/mês", trialDays: 3 },
  pro: { nome: "Pro", preco: "R$ 69,00/mês", trialDays: 3 },
};

/**
 * Confirma no banco que o plano pedido existe e está ativo. Plano ausente,
 * inválido ou inativo devolve null — e o cadastro não é exibido.
 */
async function loadSelectedPlan(requested: string | undefined): Promise<PlanInfo | null> {
  const slug = normalizePlanSlug(requested);
  if (!slug) return null;
  const { data, error } = await supabase
    .from("plan")
    .select("slug,nome,preco_cents,trial_days,ativo")
    .eq("slug", slug)
    .eq("ativo", true)
    .limit(1);
  if (error) {
    // Sem conexão: só os slugs conhecidos seguem; o servidor confirma depois.
    const fallback = PLAN_FALLBACK[slug];
    return fallback ? { slug, ...fallback } : null;
  }
  const resolved = resolveSignupPlan(slug, data ?? []);
  const row = data?.[0];
  if (!resolved.ok || !row) return null;
  return {
    slug: row.slug,
    nome: row.nome,
    preco: `${formatCentsBRL(row.preco_cents)}/mês`,
    trialDays: row.trial_days,
  };
}

export const Route = createFileRoute("/entrar")({
  ssr: false,
  head: brandedRouteHead("Começar"),
  validateSearch: (s: Record<string, unknown>): Search => ({
    // Sem modo explícito, a tela é de login. Cadastro só com ?modo=signup + plano.
    modo: s.modo === "signup" ? "signup" : "login",
    plano: typeof s.plano === "string" ? s.plano : undefined,
  }),
  beforeLoad: async ({ search }) => {
    // Uma impersonação do Master não pode vazar para a sessão do assinante.
    clearImpersonation();
    const selectedPlan = await loadSelectedPlan(search.plano);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: isSuperAdmin, error: roleError } = await supabase.rpc("is_super_admin");
      if (roleError) throw new Error(`Não foi possível validar o acesso: ${roleError.message}`);
      if (isSuperAdmin === true) {
        await supabase.auth.signOut({ scope: "local" });
        clearAppAccessCache();
        if (search.modo === "signup" && !selectedPlan) {
          throw redirect({ to: "/", hash: "planos", search: { escolher: "plano" } });
        }
        return { selectedPlan };
      }

      if (selectedPlan) {
        throw redirect({
          to: "/app/checkout",
          search: { plano: selectedPlan.slug },
        });
      }

      const { data: membership } = await supabase
        .from("company_user")
        .select("company:company(onboarding_completed)")
        .eq("user_id", data.user.id)
        .eq("ativo", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const company = Array.isArray(membership?.company)
        ? membership.company[0]
        : membership?.company;
      throw redirect({
        to: company
          ? company.onboarding_completed
            ? "/app/inicio"
            : "/app/onboarding"
          : "/app/checkout",
      });
    }

    // Cadastro sem plano válido e ativo não é exibido: volta para os planos.
    if (search.modo === "signup" && !selectedPlan) {
      throw redirect({ to: "/", hash: "planos", search: { escolher: "plano" } });
    }
    return { selectedPlan };
  },
  component: EntrarPage,
});

function newPasswordError(value: string): string | null {
  if (value.length < 10) return "Crie uma senha com pelo menos 10 caracteres.";
  if (
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/\d/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  ) {
    return "Use letra maiúscula, minúscula, número e símbolo.";
  }
  return null;
}

function friendlySignupError(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("weak") ||
    normalized.includes("easy to guess") ||
    normalized.includes("password_strength")
  ) {
    return "Essa senha é muito fácil de adivinhar. Escolha outra, sem nomes ou sequências comuns.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";
  }
  return "Não foi possível criar sua conta agora. Revise os dados e tente novamente.";
}

function EntrarPage() {
  const branding = useBrand();
  const navigate = useNavigate();
  const search = useSearch({ from: "/entrar" }) as Search;
  const { selectedPlan } = Route.useRouteContext();
  const planInfo = selectedPlan ?? null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(search.modo !== "signup" || !planInfo);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNeedsPassword(search.modo !== "signup" || !planInfo);
  }, [search.modo, planInfo]);

  function goChoosePlan() {
    navigate({ to: "/", hash: "planos", search: { escolher: "plano" } });
  }

  async function routeAfterAuth() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: isSuperAdmin, error: roleError } = await supabase.rpc("is_super_admin");
    if (roleError) {
      toast.error("Não foi possível validar o acesso desta conta.");
      return;
    }
    if (isSuperAdmin === true) {
      await supabase.auth.signOut({ scope: "local" });
      clearAppAccessCache();
      toast.error("Este acesso é exclusivo para assinantes.", {
        description: "Para administrar o sistema, entre em /superadmin.",
        duration: 9000,
      });
      return;
    }
    if (planInfo) {
      navigate({ to: "/app/checkout", search: { plano: planInfo.slug }, replace: true });
      return;
    }
    const { data: cu } = await supabase
      .from("company_user")
      .select("company:company(onboarding_completed)")
      .eq("user_id", u.user.id)
      .eq("ativo", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const company = Array.isArray(cu?.company) ? cu.company[0] : cu?.company;
    navigate({
      to: company
        ? company.onboarding_completed
          ? "/app/inicio"
          : "/app/onboarding"
        : "/app/checkout",
      replace: true,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const invalidEmail = emailError(email);
    if (invalidEmail) return toast.error(invalidEmail);
    const cleanEmail = normalizeEmail(email);
    setEmail(cleanEmail);
    if (!needsPassword && !planInfo) return goChoosePlan();
    setLoading(true);

    if (needsPassword) {
      if (password.length < 8) {
        setLoading(false);
        return toast.error("A senha precisa ter pelo menos 8 caracteres.");
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      setLoading(false);
      if (error) return toast.error("Senha incorreta. Tente novamente ou recupere sua senha.");
      toast.success("Bem-vindo de volta!");
      return routeAfterAuth();
    }

    if (!planInfo) {
      setLoading(false);
      return goChoosePlan();
    }
    const passwordError = newPasswordError(password);
    if (passwordError) {
      setLoading(false);
      return toast.error(passwordError);
    }
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app/checkout?plano=${encodeURIComponent(planInfo.slug)}`,
      },
    });

    if (signUpErr) {
      const msg = (signUpErr.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        setNeedsPassword(true);
        setLoading(false);
        toast.message("Já existe uma conta com esse e-mail.", {
          description: "Digite sua senha para continuar.",
        });
        return;
      }
      if (
        msg.includes("signups not allowed") ||
        msg.includes("signup_disabled") ||
        msg.includes("signup is disabled")
      ) {
        setNeedsPassword(true);
        setLoading(false);
        toast.message("Cadastros novos estão desativados.", {
          description: "Se você já tem conta, digite sua senha para entrar.",
        });
        return;
      }
      setLoading(false);
      return toast.error(friendlySignupError(signUpErr.message || ""));
    }

    if (signUpData.session) {
      setLoading(false);
      toast.success("Conta criada! Ativando seu teste…");
      return routeAfterAuth();
    }

    setLoading(false);
    toast.success("Enviamos um link de confirmação para o seu e-mail.", {
      description: "Depois de confirmar, entre usando a senha que você acabou de criar.",
    });
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-background text-foreground">
      {/* Ambient glows — same vibe as LP */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 60%)" }}
        />
        <div
          className="absolute top-[30%] -right-40 h-[700px] w-[700px] rounded-full blur-3xl opacity-25"
          style={{ background: "radial-gradient(circle, #d946ef 0%, transparent 65%)" }}
        />
        <div
          className="absolute bottom-[-200px] left-1/3 h-[500px] w-[500px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #6d28d9 0%, transparent 60%)" }}
        />
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
        {/* LEFT — brand pane (hidden on mobile) */}
        <aside className="relative hidden overflow-hidden border-r border-[color:var(--hairline)] bg-[linear-gradient(155deg,rgba(109,40,217,.15),rgba(217,70,239,.05)_52%,transparent)] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
          <img
            src={branding.avatarUrl || fallbackAvatarUrl}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -right-20 h-[70vh] max-h-[760px] opacity-[.22] saturate-[.9]"
          />
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              voltar ao site
            </Link>
          </div>

          <div className="relative z-10 max-w-lg space-y-8">
            <div className="flex items-center gap-3">
              <BrandLogo />
              <div>
                <div className="font-display font-extrabold text-2xl text-gradient-brand leading-none">
                  {branding.name}
                </div>
                <div className="text-[12px] text-muted-foreground mt-1">{branding.tagline}</div>
              </div>
            </div>

            <h1 className="font-display text-4xl xl:text-5xl font-extrabold leading-[1.05] tracking-tight">
              Sua assessora com IA
              <br />
              <span className="text-gradient-brand">ouve, entende</span> e<br />
              organiza o dinheiro.
            </h1>

            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Fale um gasto, uma receita ou uma meta. A {branding.assistantName} pergunta o que
              faltar e só registra depois da sua confirmação.
            </p>

            <div className="grid gap-3">
              <Feature
                icon={<Mic className="size-4" />}
                title="Voz que vira controle"
                desc={`A ${branding.assistantName} transforma sua fala em uma ação financeira pronta.`}
              />
              <Feature
                icon={<Gauge className="size-4" />}
                title="Dashboard que explica"
                desc="Entradas, saídas, projeções e alertas em uma leitura simples."
              />
              <Feature
                icon={<ReceiptText className="size-4" />}
                title="Financeiro sem formulário"
                desc="Movimentações, contas, cartões, metas e orçamentos no mesmo lugar."
              />
            </div>

            <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-[color:var(--brand)]" /> Dados por conta
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-[color:var(--brand)]" /> Sem cartão p/ testar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-[color:var(--brand)]" /> Confirma antes de
                salvar
              </span>
            </div>
          </div>

          <div className="text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} {branding.name}. Todos os direitos reservados.
          </div>
        </aside>

        {/* RIGHT — form */}
        <main className="flex flex-col items-center justify-center px-5 py-10 sm:px-10">
          {/* Mobile brand header */}
          <div className="lg:hidden w-full max-w-md mb-6 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> voltar
            </Link>
            <div className="flex items-center gap-2">
              <BrandLogo compact />
              <div className="font-display font-bold text-[15px] text-gradient-brand">
                {branding.name}
              </div>
            </div>
          </div>

          <div className="w-full max-w-md">
            <div className="relative panel p-7 sm:p-8 glow-brand overflow-hidden">
              {/* corner accent */}
              <div
                aria-hidden
                className="absolute -top-24 -right-24 size-56 rounded-full blur-3xl opacity-50"
                style={{
                  background: "radial-gradient(circle, rgba(124,58,237,.35) 0%, transparent 70%)",
                }}
              />

              <div className="relative">
                {planInfo && (
                  <div className="mb-5 rounded-xl border border-[color:var(--brand)]/30 bg-[color:var(--brand-soft)] p-4">
                    <div className="flex items-center gap-2 text-[11px] uppercase font-bold tracking-[0.14em] text-[color:var(--brand-text)]">
                      <Sparkles className="size-3.5" /> Plano escolhido
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <div className="font-display text-lg font-bold">{planInfo.nome}</div>
                      <div className="text-sm font-semibold">{planInfo.preco}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {planInfo.trialDays > 0
                        ? `${planInfo.trialDays} ${planInfo.trialDays === 1 ? "dia" : "dias"} grátis • cancele antes e não paga nada`
                        : "Confira as condições e conclua a ativação na próxima etapa"}
                    </div>
                  </div>
                )}

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[color:var(--brand-soft)] border border-[color:var(--brand)]/20 text-[11px] font-semibold text-[color:var(--brand-text)] mb-3">
                  <span className="size-1.5 rounded-full bg-[color:var(--brand)] dot-pulse" />
                  {needsPassword ? "Acesso à conta" : "Cadastro em 1 clique"}
                </div>

                <h1 className="font-display text-[26px] sm:text-[28px] font-extrabold leading-tight tracking-tight">
                  {needsPassword ? "Bem-vindo de volta" : "Comece em 1 clique"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5 mb-6">
                  {needsPassword
                    ? "Você já tem conta — informe sua senha pra continuar."
                    : "Informe seu e-mail e crie uma senha para acessar sua conta depois."}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {
                    <div className="space-y-1.5">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        {...EMAIL_INPUT_PROPS}
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setEmail((current) => normalizeEmail(current))}
                        required
                        autoFocus
                        placeholder="voce@empresa.com"
                        className="h-11"
                      />
                    </div>
                  }

                  {
                    <>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="pwd">{needsPassword ? "Senha" : "Crie sua senha"}</Label>
                          {needsPassword && (
                            <Link
                              to="/esqueci-senha"
                              className="text-xs font-medium text-muted-foreground transition-colors hover:text-[color:var(--brand-text)]"
                            >
                              Esqueci minha senha
                            </Link>
                          )}
                        </div>
                        <Input
                          id="pwd"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          minLength={needsPassword ? 8 : 10}
                          autoComplete={needsPassword ? "current-password" : "new-password"}
                          required
                          className="h-11"
                          placeholder={needsPassword ? "Sua senha" : "Crie uma senha forte"}
                        />
                        {!needsPassword && (
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            10+ caracteres com maiúscula, minúscula, número e símbolo. Evite senhas
                            comuns.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // Criar conta exige um plano válido escolhido na página inicial.
                          if (needsPassword && !planInfo) return goChoosePlan();
                          setNeedsPassword((current) => !current);
                          setPassword("");
                        }}
                        className="mx-auto block text-xs font-semibold text-[color:var(--brand-text)] underline decoration-[color:var(--brand)]/30 underline-offset-4 hover:decoration-[color:var(--brand)]"
                      >
                        {needsPassword
                          ? planInfo
                            ? "Ainda não tenho conta"
                            : "Ainda não tenho conta · escolher plano"
                          : "Já tenho conta"}
                      </button>
                    </>
                  }

                  <Button
                    type="submit"
                    disabled={loading}
                    size="lg"
                    className="w-full h-12 bg-gradient-brand text-primary-foreground hover:opacity-95 font-semibold text-[14.5px] shadow-[0_8px_24px_-10px_rgba(109,40,217,.72)]"
                  >
                    {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
                    {needsPassword
                      ? "Entrar e continuar"
                      : `Criar conta e testar ${planInfo?.nome ?? "o plano"}`}
                  </Button>

                  {!needsPassword && (
                    <p className="text-[11.5px] text-muted-foreground text-center pt-1 leading-relaxed">
                      {`Cadastro sem cartão. Seu teste do ${planInfo?.nome ?? "plano"} será ativado automaticamente.`}
                    </p>
                  )}
                </form>
              </div>
            </div>

            <p className="text-[11.5px] text-muted-foreground text-center mt-5">
              Ao continuar, você concorda com nossos{" "}
              <Link to="/termos" className="underline underline-offset-2 hover:text-foreground">
                Termos
              </Link>{" "}
              e{" "}
              <Link
                to="/privacidade"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Política de privacidade
              </Link>
              .
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)]/60 backdrop-blur-sm p-3.5">
      <div className="size-9 rounded-lg grid place-items-center bg-[color:var(--brand-soft)] text-[color:var(--brand-text)] shrink-0 ring-1 ring-[color:var(--brand)]/15">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-[13.5px] leading-tight">{title}</div>
        <div className="text-[12px] text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
