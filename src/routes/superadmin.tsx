import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EMAIL_INPUT_PROPS, normalizeEmail } from "@/lib/common/masks";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { superadminSupabase } from "@/lib/auth/superadmin-client";
import { signOutRealm } from "@/lib/auth/realm-supabase";
import { BrandWordmark } from "@/components/brand-wordmark";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { ensureRemixBootstrap } from "@/lib/common/remix-bootstrap";
import { clearMasterAccessCache } from "@/lib/master/master-access-cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readRemixInstallationClaimed } from "@/lib/common/remix-installation-client";

const emailSchema = z.string().email("Informe um e-mail válido.");

function passwordError(password: string): string | null {
  if (password.length < 10) return "Use pelo menos 10 caracteres.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Use letra maiúscula, minúscula e número.";
  }
  return null;
}

export const Route = createFileRoute("/superadmin")({
  ssr: false,
  head: brandedRouteHead("Super admin"),
  component: SuperAdminAccessPage,
});

function SuperAdminAccessPage() {
  const branding = useBrand();
  const navigate = useNavigate();
  const [setupMode, setSetupMode] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    // O formulário precisa abrir imediatamente. A verificação da sessão roda em
    // segundo plano para que uma falha de rede ou token antigo nunca prenda o
    // proprietário na tela global de carregamento.
    void (async () => {
      const claimPromise = readRemixInstallationClaimed();
      const sessionPromise = superadminSupabase.auth.getSession();

      const { data: claimed, error: claimError } = await claimPromise;
      if (!active) return;
      if (claimError) {
        toast.error("Não foi possível conferir a instalação.");
        setSetupMode(false);
      } else {
        setSetupMode(claimed === false);
      }

      try {
        const { data: sessionData } = await sessionPromise;
        if (!active || !sessionData.session?.user) return;

        if (claimed === false) await ensureRemixBootstrap();

        const { data: verified, error: userError } = await superadminSupabase.auth.getUser();
        const { data: isSuper, error: roleError } = verified.user
          ? await superadminSupabase.rpc("is_super_admin")
          : { data: false, error: null };

        if (!active) return;
        if (!userError && !roleError && verified.user && isSuper === true) {
          clearMasterAccessCache();
          navigate({ to: "/master/painel", replace: true });
          return;
        }

        clearMasterAccessCache();
        await signOutRealm("superadmin");
      } catch {
        // A tela de acesso continua utilizável. O submit exibirá uma mensagem
        // específica caso o backend ainda esteja indisponível.
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function finishAccess() {
    // Valida a sessão administrativa recém-criada e a autorização real no banco.
    const { data: verified, error: userError } = await superadminSupabase.auth.getUser();
    const { data: isSuper, error } = verified.user
      ? await superadminSupabase.rpc("is_super_admin")
      : { data: false, error: null };
    if (userError || !verified.user || error || isSuper !== true) {
      await signOutRealm("superadmin");
      clearMasterAccessCache();
      throw new Error("Esta conta não possui acesso de super admin.");
    }
    clearMasterAccessCache();
    navigate({ to: "/master/painel", replace: true });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsedEmail = emailSchema.safeParse(email.trim().toLowerCase());
    if (!parsedEmail.success) return toast.error(parsedEmail.error.issues[0].message);
    if (setupMode && passwordError(password)) return toast.error(passwordError(password)!);
    if (!setupMode && password.length < 8) return toast.error("Informe sua senha.");

    setLoading(true);
    try {
      if (setupMode) {
        const { data, error } = await superadminSupabase.auth.signUp({
          email: parsedEmail.data,
          password,
          options: { emailRedirectTo: `${window.location.origin}/superadmin` },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Confirme seu e-mail para assumir este clone.", {
            description: "Depois da confirmação, volte para /superadmin.",
            duration: 12000,
          });
          return;
        }
        await ensureRemixBootstrap();
        toast.success("Proprietário confirmado. Abrindo a central de comando.");
      } else {
        const { error } = await superadminSupabase.auth.signInWithPassword({
          email: parsedEmail.data,
          password,
        });
        if (error) throw new Error("E-mail ou senha incorretos.");
      }
      await finishAccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ln-theme relative min-h-screen overflow-hidden bg-ln-bg font-sans text-ln-ink">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden"><div className="ln-blob absolute -left-40 -top-40 size-[560px] rounded-full bg-ln-violet/30 blur-3xl" /><div className="ln-blob absolute -right-40 top-[40%] size-[620px] rounded-full bg-ln-magenta/20 blur-3xl" /><div className="absolute bottom-[-220px] left-1/3 size-[480px] rounded-full bg-ln-lime/10 blur-3xl" /></div>
      <div aria-hidden className="ln-grid-bg pointer-events-none absolute inset-0" />

      <main className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-5 py-12 lg:grid-cols-[1.05fr_.75fr] lg:px-10">
        <section className="hidden lg:block">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-ln-muted transition hover:text-ln-ink"
          >
            <ArrowLeft className="size-4" /> voltar ao site
          </a>
          <BrandWordmark className="mt-10 h-12" />
          <div className="mt-10 flex w-fit items-center gap-2 rounded-full border ln-glass px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-ln-lime">
            <ShieldCheck className="size-3.5" /> acesso exclusivo do proprietário
          </div>
          <h1 className="mt-6 max-w-2xl font-sora text-5xl font-extrabold leading-[1.02] tracking-tight xl:text-6xl">
            Seu SaaS por inteiro, <span className="ln-gradient-text">em uma central.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-ln-muted">
            Assinantes, assinaturas, trials, créditos, planos e integrações globais ficam aqui. O
            painel dos assinantes continua totalmente separado.
          </p>
          <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
            {[
              { t: "Gestão do SaaS", d: "Planos, assinantes e cobranças", I: Sparkles },
              { t: "Dados protegidos", d: "Acesso criptografado e auditado", I: ShieldCheck },
              { t: "Acesso separado", d: "Painel do cliente intocado", I: KeyRound },
            ].map(({ t, d, I }) => (
              <div key={t} className="ln-glass group rounded-2xl p-4 transition duration-300 hover:-translate-y-1 hover:border-ln-violet/50">
                <div className="mb-3 grid size-9 place-items-center rounded-xl ln-gradient transition group-hover:scale-110"><I className="size-4" /></div>
                <div className="text-sm font-bold">{t}</div>
                <div className="mt-1 text-[11px] leading-4 text-ln-muted">{d}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-6 flex justify-center lg:hidden"><BrandWordmark className="h-10" /></div>
          <a
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-ln-muted lg:hidden"
          >
            <ArrowLeft className="size-4" /> voltar ao site
          </a>
          <div className="ln-glass ln-glow relative overflow-hidden rounded-[28px] p-6 sm:p-8">
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-ln-lime">
              {setupMode === null
                ? "Validando instalação"
                : setupMode
                  ? "Primeiro acesso do clone"
                  : "Super admin"}
            </div>
            <h2 className="mt-2 font-sora text-3xl font-extrabold tracking-tight">
              {setupMode ? "Assuma o seu sistema" : "Entre na central"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ln-muted">
              {setupMode
                ? "Esta conta será a única proprietária inicial do clone."
                : `Use o acesso administrativo de ${branding.name}.`}
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="superadmin-email" className="text-ln-ink/80">
                  E-mail do proprietário
                </Label>
                <Input
                  id="superadmin-email"
                  {...EMAIL_INPUT_PROPS}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setEmail((current) => normalizeEmail(current))}
                  autoComplete="username"
                  required
                  disabled={setupMode === null || loading}
                  className="h-12 border-ln-line bg-ln-glass text-ln-ink placeholder:text-ln-muted/50"
                  placeholder="voce@empresa.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="superadmin-password" className="text-ln-ink/80">
                  {setupMode ? "Crie sua senha" : "Senha"}
                </Label>
                <div className="relative">
                  <Input
                    id="superadmin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={setupMode ? "new-password" : "current-password"}
                    required
                    disabled={setupMode === null || loading}
                    className="h-12 border-ln-line bg-ln-glass pr-11 text-ln-ink placeholder:text-ln-muted/50"
                    placeholder={setupMode ? "10+ caracteres" : "Sua senha"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ln-muted hover:text-ln-ink"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={setupMode === null || loading}
                className="h-12 w-full rounded-full bg-ln-lime font-bold text-ln-bg hover:bg-ln-lime/90"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                {setupMode ? "Criar acesso de proprietário" : "Entrar no super admin"}
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-ln-line bg-ln-glass px-4 py-3 text-[11px] leading-5 text-ln-muted">
              Esta entrada não cria conta de assinante e não abre o painel financeiro do cliente.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
