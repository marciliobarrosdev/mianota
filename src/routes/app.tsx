import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import type { CompanyRow, Membership } from "@/lib/tenant";
import {
  clearAppAccessCache,
  getCachedAppAccess,
  type AppAccessContext,
} from "@/lib/app-access-cache";
import { readRemixInstallationClaimed } from "@/lib/remix-installation-client";
import {
  clearImpersonation,
  getRealmClient,
  readImpersonationCompanyId,
  signOutRealm,
  type AuthRealm,
} from "@/lib/auth/realm-supabase";

type Ctx = AppAccessContext;

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async ({ location }): Promise<Ctx> => {
    // /app usa a sessão do assinante. A única exceção é uma impersonação aberta
    // pelo Master nesta aba: aí a sessão usada é a do proprietário.
    const impersonateId = readImpersonationCompanyId();
    const realm: AuthRealm = impersonateId ? "superadmin" : "subscriber";
    const client = getRealmClient(realm);

    const { data: sessionData } = await client.auth.getSession();
    const sessionUser = sessionData.session?.user;
    if (!sessionUser) {
      if (realm === "superadmin") {
        // Impersonação sem sessão administrativa: descarta e segue como assinante.
        clearImpersonation();
        clearAppAccessCache();
        throw redirect({ href: location.href, replace: true });
      }
      throw redirect({ to: "/entrar", search: { modo: "login" } });
    }

    const ctx = await getCachedAppAccess(
      `${realm}:${sessionUser.id}:${impersonateId || "self"}`,
      async () => loadAppAccess(realm, sessionUser.id, impersonateId),
    );

    if (ctx.membership?.forcar_troca_senha && location.pathname !== "/trocar-senha") {
      throw redirect({ to: "/trocar-senha" });
    }

    if (realm === "superadmin" && !ctx.impersonating) {
      // Empresa da impersonação inválida/inexistente: volta ao Master.
      clearImpersonation();
      clearAppAccessCache();
      throw redirect({ to: "/master/assinantes" });
    }

    if (realm === "subscriber" && ctx.isSuperAdmin) {
      // Conta de proprietário não usa o painel do assinante: encerra apenas a
      // sessão de assinante desta conta e mostra o login administrativo.
      clearAppAccessCache();
      await signOutRealm("subscriber");
      throw redirect({ to: "/superadmin" });
    }

    if (!ctx.company) {
      if (location.pathname !== "/app/checkout") throw redirect({ to: "/app/checkout" });
      return ctx;
    }

    const company = ctx.company;

    // Trial expirado ou status que exige pagamento → trava no checkout
    const trialExpired =
      company.status_cobranca === "trial" && new Date(company.trial_ate).getTime() <= Date.now();
    const needsPayment =
      company.status_cobranca === "checkout_pending" ||
      company.status_cobranca === "suspenso" ||
      company.status_cobranca === "pendente" ||
      trialExpired;

    if (needsPayment && location.pathname !== "/app/checkout") {
      throw redirect({ to: "/app/checkout" });
    }

    // Empresa criada mas onboarding não finalizado → força wizard (apenas se já tem acesso)
    if (
      !needsPayment &&
      !company.onboarding_completed &&
      location.pathname !== "/app/onboarding" &&
      location.pathname !== "/app/checkout"
    ) {
      throw redirect({ to: "/app/onboarding" });
    }

    return ctx;
  },
  component: AppLayout,
});

async function loadAppAccess(
  realm: AuthRealm,
  userId: string,
  impersonateId: string | null,
): Promise<Ctx> {
  const supabase = getRealmClient(realm);
  const { data: u, error } = await supabase.auth.getUser();
  if (error || !u.user || u.user.id !== userId) {
    if (realm === "superadmin") {
      clearImpersonation();
      throw redirect({ to: "/superadmin" });
    }
    throw redirect({ to: "/entrar", search: { modo: "login" } });
  }

  const [passwordResult, superAdminResult] = await Promise.all([
    supabase.rpc("current_user_requires_password_change"),
    supabase.rpc("is_super_admin"),
  ]);
  if (passwordResult.error) {
    throw new Error(`Não foi possível validar a senha: ${passwordResult.error.message}`);
  }
  if (passwordResult.data === true) throw redirect({ to: "/trocar-senha" });
  if (superAdminResult.error) {
    throw new Error(`Não foi possível validar o acesso: ${superAdminResult.error.message}`);
  }

  const isSuperAdmin = superAdminResult.data === true;
  const noCompany = {
    user: { id: u.user.id, email: u.user.email },
    company: null,
    membership: null,
    isSuperAdmin,
    impersonating: false,
  };

  if (realm === "superadmin") {
    // Impersonação só vale com a sessão administrativa autorizada de verdade.
    if (!isSuperAdmin || !impersonateId) return noCompany;
    const { data: comp } = await supabase
      .from("company")
      .select("*")
      .eq("id", impersonateId)
      .maybeSingle();
    if (!comp) return noCompany;
    return {
      user: { id: u.user.id, email: u.user.email },
      company: comp as unknown as CompanyRow,
      membership: { company_id: comp.id, role: "owner", forcar_troca_senha: false },
      isSuperAdmin,
      impersonating: true,
    };
  }

  if (isSuperAdmin) return noCompany;

  const { data: cu } = await supabase
    .from("company_user")
    .select("company_id, role, forcar_troca_senha, ativo, created_at, company:company(*)")
    .eq("user_id", u.user.id)
    .eq("ativo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!cu) {
    const { data: installationClaimed, error: installationError } =
      await readRemixInstallationClaimed();
    if (installationError) {
      throw new Error(`Não foi possível validar a ativação do clone: ${installationError.message}`);
    }
    if (installationClaimed !== true) {
      throw new Error(
        "Este sistema ainda está sendo configurado pelo proprietário. Tente novamente em instantes.",
      );
    }
    return {
      user: { id: u.user.id, email: u.user.email },
      company: null,
      membership: null,
      isSuperAdmin,
      impersonating: false,
    };
  }

  return {
    user: { id: u.user.id, email: u.user.email },
    company: cu.company as unknown as CompanyRow,
    membership: {
      company_id: cu.company_id,
      role: cu.role as Membership["role"],
      forcar_troca_senha: cu.forcar_troca_senha,
    },
    isSuperAdmin,
    impersonating: false,
  };
}

function AppLayout() {
  const ctx = Route.useRouteContext();
  if (ctx.company?.status_cobranca === "suspenso" && !ctx.impersonating) {
    return (
      <div className="min-h-screen grid place-items-center p-6 bg-background">
        <div className="max-w-md text-center space-y-3">
          <div className="text-3xl">⛔</div>
          <h1 className="text-2xl font-bold">Conta suspensa</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta foi suspensa por inadimplência. Regularize o pagamento para voltar a usar o{" "}
            {ctx.company.nome}.
          </p>
          <Button
            onClick={async () => {
              clearAppAccessCache();
              await signOutRealm("subscriber");
              window.location.href = "/entrar";
            }}
            variant="outline"
          >
            Sair
          </Button>
        </div>
      </div>
    );
  }
  return (
    <>
      {ctx.impersonating && (
        <div className="bg-destructive text-destructive-foreground text-sm px-4 py-2 flex items-center justify-between">
          <span>
            🛡️ Você está visualizando como <b>{ctx.company?.nome}</b> (impersonação).
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 bg-transparent border-white/30 text-white hover:bg-white/10"
            onClick={() => {
              clearImpersonation();
              clearAppAccessCache();
              window.location.href = "/master/assinantes";
            }}
          >
            Sair da impersonação
          </Button>
        </div>
      )}
      <AppShell
        company={ctx.company}
        membership={ctx.membership}
        email={ctx.user.email}
        isSuperAdmin={ctx.isSuperAdmin}
      >
        <Outlet />
      </AppShell>
    </>
  );
}
