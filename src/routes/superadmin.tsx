import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EMAIL_INPUT_PROPS, normalizeEmail } from "@/lib/masks";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { superadminSupabase } from "@/lib/auth/superadmin-client";
import { signOutRealm } from "@/lib/auth/realm-supabase";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { ensureRemixBootstrap } from "@/lib/remix-bootstrap";
import { clearMasterAccessCache } from "@/lib/master-access-cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readRemixInstallationClaimed } from "@/lib/remix-installation-client";

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
    <div className="relative min-h-screen overflow-hidden bg-[#100817] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(124,58,237,.34),transparent_34%),radial-gradient(circle_at_85%_75%,rgba(217,70,239,.22),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[.045] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:44px_44px]" />

      <main className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-5 py-12 lg:grid-cols-[1.05fr_.75fr] lg:px-10">
        <section className="hidden lg:block">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/55 transition hover:text-white"
          >
            <ArrowLeft className="size-4" /> voltar ao site
          </a>
          <div className="mt-16 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-white/6 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-fuchsia-200">
            <ShieldCheck className="size-3.5" /> acesso exclusivo do proprietário
          </div>
          <h1 className="mt-6 max-w-2xl font-display text-5xl font-black leading-[.98] tracking-[-.055em] xl:text-6xl">
            Seu SaaS por inteiro, <span className="text-violet-400">em uma central.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/58">
            Assinantes, assinaturas, trials, créditos, planos e integrações globais ficam aqui. O
            painel dos assinantes continua totalmente separado.
          </p>
          <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
            {["Gestão do SaaS", "Dados protegidos", "Acesso separado"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-bold text-white/72"
              >
                <Sparkles className="mb-3 size-4 text-violet-400" /> {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <a
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/55 lg:hidden"
          >
            <ArrowLeft className="size-4" /> voltar ao site
          </a>
          <div className="rounded-[28px] border border-white/12 bg-white/[.075] p-6 shadow-[0_35px_90px_-38px_rgba(168,85,247,.8)] backdrop-blur-2xl sm:p-8">
            <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-950/40">
              <ShieldCheck className="size-6" />
            </div>
            <div className="mt-6 text-[10px] font-black uppercase tracking-[.16em] text-violet-300">
              {setupMode === null
                ? "Validando instalação"
                : setupMode
                  ? "Primeiro acesso do clone"
                  : "Super admin"}
            </div>
            <h2 className="mt-2 font-display text-3xl font-black tracking-[-.04em]">
              {setupMode ? "Assuma o seu sistema" : "Entre na central"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/52">
              {setupMode
                ? "Esta conta será a única proprietária inicial do clone."
                : `Use o acesso administrativo de ${branding.name}.`}
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="superadmin-email" className="text-white/78">
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
                  className="h-12 border-white/12 bg-black/20 text-white placeholder:text-white/25"
                  placeholder="voce@empresa.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="superadmin-password" className="text-white/78">
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
                    className="h-12 border-white/12 bg-black/20 pr-11 text-white placeholder:text-white/25"
                    placeholder={setupMode ? "10+ caracteres" : "Sua senha"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/42 hover:text-white"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={setupMode === null || loading}
                className="h-12 w-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:opacity-95"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                {setupMode ? "Criar acesso de proprietário" : "Entrar no super admin"}
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/8 bg-black/16 px-4 py-3 text-[11px] leading-5 text-white/42">
              Esta entrada não cria conta de assinante e não abre o painel financeiro do cliente.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
