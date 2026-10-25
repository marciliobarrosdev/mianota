import { createFileRoute, Outlet, redirect, Link, useLocation } from "@tanstack/react-router";
import { superadminSupabase } from "@/lib/auth/superadmin-client";
import { signOutRealm } from "@/lib/auth/realm-supabase";
import {
  Cloud,
  Shield,
  LogOut,
  BarChart3,
  Building2,
  Settings,
  Package,
  CreditCard,
  ListChecks,
  Plug,
  Headphones,
  MessagesSquare,
  Rocket,
  WalletCards,
  Sparkles,
  Inbox,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileBottomNav, type MobileNavItem } from "@/components/mobile-bottom-nav";
import { useBrand } from "@/contexts/brand-context";
import {
  clearMasterAccessCache,
  getCachedMasterAccess,
  type MasterAccessContext,
} from "@/lib/master-access-cache";
import { readRemixInstallationClaimed } from "@/lib/remix-installation-client";

export const Route = createFileRoute("/master")({
  ssr: false,
  beforeLoad: async () => {
    // /master usa SOMENTE a sessão administrativa (cliente e storage próprios).
    const { data: sessionData } = await superadminSupabase.auth.getSession();
    const sessionUser = sessionData.session?.user;
    if (!sessionUser) throw redirect({ to: "/superadmin" });

    return getCachedMasterAccess(sessionUser.id, async (): Promise<MasterAccessContext> => {
      const { data: claimed, error: claimError } = await readRemixInstallationClaimed();
      if (claimError) {
        throw new Error(`Não foi possível validar esta instalação: ${claimError.message}`);
      }
      if (claimed !== true) throw redirect({ to: "/superadmin" });

      // Revalida o token com o Auth e a permissão real no banco.
      const { data: verified, error: userError } = await superadminSupabase.auth.getUser();
      if (userError || !verified.user || verified.user.id !== sessionUser.id) {
        clearMasterAccessCache();
        await signOutRealm("superadmin");
        throw redirect({ to: "/superadmin" });
      }

      const { data: isSuper, error: roleError } = await superadminSupabase.rpc("is_super_admin");
      if (roleError) throw new Error(`Não foi possível validar o acesso: ${roleError.message}`);
      if (!isSuper) {
        clearMasterAccessCache();
        await signOutRealm("superadmin");
        throw redirect({ to: "/superadmin" });
      }

      return { user: { id: verified.user.id, email: verified.user.email } };
    });
  },
  component: MasterLayout,
});

const sections = [
  {
    label: "Implantação",
    items: [
      { to: "/master/checklist", label: "Comece aqui", icon: Rocket },
      { to: "/master/implantacao", label: "Personalizar o clone", icon: ListChecks },
    ],
  },
  {
    label: "Operação",
    items: [
      { to: "/master/painel", label: "Visão geral", icon: BarChart3 },
      { to: "/master/assinantes", label: "Assinantes", icon: Building2 },
      { to: "/master/assinaturas", label: "Assinaturas", icon: CreditCard },
      { to: "/master/onboarding", label: "Ativação pós-compra", icon: Inbox },
    ],
  },
  {
    label: "Oferta e cobrança",
    items: [
      { to: "/master/planos", label: "Planos", icon: Package },
      { to: "/master/pagamentos", label: "Pagamentos", icon: WalletCards },
      { to: "/master/ia-creditos", label: "IA e créditos", icon: Sparkles },
    ],
  },
  {
    label: "WhatsApp central",
    items: [
      { to: "/master/whatsapp-qr", label: "WhatsApp QR Code", icon: Headphones },
      { to: "/master/whatsapp-meta", label: "API oficial Meta", icon: Cloud },
      { to: "/master/conversas", label: "Conversas", icon: MessagesSquare },
    ],
  },
  {
    label: "Administração",
    items: [{ to: "/master/configuracoes", label: "Acesso e segurança", icon: Settings }],
  },
];

const RED = "var(--brand-master)";
const RED_SOFT = "rgba(124,58,237,.12)";
const RED_SOFT_STRONG = "rgba(124,58,237,.22)";

const mobileItems: MobileNavItem[] = [
  { to: "/master/checklist", label: "Comece", icon: Rocket },
  { to: "/master/painel", label: "Visão", icon: BarChart3 },
  { to: "/master/assinantes", label: "Assinantes", icon: Building2 },
  { to: "/master/conversas", label: "Conversas", icon: MessagesSquare },
  { to: "/master/whatsapp-qr", label: "WhatsApp", icon: Headphones },
];

function MasterLayout() {
  const branding = useBrand();
  const loc = useLocation();
  const ctx = Route.useRouteContext();
  const email: string | null = ctx?.user?.email ?? null;
  const userName = (email || "Master").split("@")[0];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
      {/* Master ambient glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full blur-3xl opacity-25"
          style={{ background: `radial-gradient(circle, ${RED} 0%, transparent 60%)` }}
        />
        <div
          className="absolute top-[40%] -left-40 h-[480px] w-[480px] rounded-full blur-3xl opacity-15"
          style={{ background: `radial-gradient(circle, ${RED} 0%, transparent 65%)` }}
        />
      </div>
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-[color:var(--panel)]/80 backdrop-blur-xl border-b border-[color:var(--hairline)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="size-8 rounded-lg grid place-items-center text-primary-foreground shrink-0"
              style={{ background: `linear-gradient(135deg, ${RED}, #C026D3)` }}
            >
              <Shield className="size-4" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div
                className="font-display font-bold tracking-tight text-[14.5px] leading-none truncate"
                style={{ color: RED }}
              >
                Master
              </div>
              <div className="text-[10.5px] text-muted-foreground truncate mt-0.5">
                {branding.name} · admin
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle />
            <button
              onClick={async () => {
                clearMasterAccessCache();
                await signOutRealm("superadmin");
                window.location.href = "/superadmin";
              }}
              title="Sair"
              className="size-9 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col md:flex-row">
          <aside className="hidden md:flex w-[260px] min-h-screen border-r border-[color:var(--hairline)] bg-[color:var(--sidebar-bg)] flex-col">
            <div className="px-5 py-5 flex items-center gap-3 border-b border-[color:var(--hairline)]">
              <div
                className="size-10 rounded-xl grid place-items-center text-primary-foreground shadow-md ring-1 ring-[color:var(--hairline)]"
                style={{ background: `linear-gradient(135deg, ${RED}, #C026D3)` }}
              >
                <Shield className="size-5" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div
                  className="font-display font-extrabold tracking-tight truncate text-[16px]"
                  style={{ color: RED }}
                >
                  Master
                </div>
                <div className="text-[11.5px] text-muted-foreground truncate -mt-0.5">
                  {branding.name} · admin
                </div>
              </div>
            </div>

            <nav className="p-3 flex-1 overflow-y-auto space-y-5">
              {sections.map((sec) => (
                <div key={sec.label}>
                  <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                    {sec.label}
                  </div>
                  <div className="flex flex-col gap-1">
                    {sec.items.map((it) => {
                      const active = loc.pathname.startsWith(it.to);
                      const Icon = it.icon;
                      return (
                        <Link
                          key={it.to}
                          to={it.to}
                          className={`relative flex items-center gap-3 px-3 py-[11px] rounded-lg text-[14.5px] font-medium whitespace-nowrap transition-all ${
                            active
                              ? "text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-[color:var(--panel-2)]"
                          }`}
                          style={
                            active
                              ? {
                                  background: RED_SOFT,
                                  boxShadow: `inset 0 0 0 1px ${RED_SOFT_STRONG}, 0 0 22px -10px ${RED}`,
                                }
                              : undefined
                          }
                        >
                          {active && (
                            <span
                              className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
                              style={{ background: RED, boxShadow: `0 0 12px ${RED}` }}
                            />
                          )}
                          <Icon
                            className="size-[18px] shrink-0"
                            style={active ? { color: RED } : undefined}
                          />
                          <span className="flex-1 truncate">{it.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="p-3 border-t border-[color:var(--hairline)]">
              <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-[color:var(--panel-2)] border border-[color:var(--hairline)]">
                <div
                  className="size-9 rounded-full grid place-items-center text-[13px] font-bold ring-1 shrink-0"
                  style={{
                    background: RED_SOFT,
                    color: RED,
                    boxShadow: `inset 0 0 0 1px ${RED_SOFT_STRONG}`,
                  }}
                >
                  {userName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold truncate">{userName}</div>
                  <div className="text-[11px] truncate" style={{ color: RED }}>
                    Super admin
                  </div>
                </div>
                <button
                  onClick={async () => {
                    clearMasterAccessCache();
                    await signOutRealm("superadmin");
                    window.location.href = "/superadmin";
                  }}
                  title="Sair"
                  className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[color:var(--panel)]"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          </aside>
          <main className="flex-1 px-4 pt-4 pb-28 md:p-8 md:pb-8 max-w-7xl w-full mx-auto">
            <div className="hidden md:flex items-center justify-between gap-3 mb-6">
              <div
                className="flex items-center gap-2 text-[13.5px] font-medium px-3 py-1.5 rounded-full bg-[color:var(--panel)] border border-[color:var(--hairline)]"
                style={{ color: RED }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: RED, boxShadow: `0 0 10px ${RED}` }}
                />
                Modo super admin
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <ThemeToggle />
                <div
                  className="size-9 rounded-full grid place-items-center text-[13px] font-bold ring-1"
                  style={{
                    background: RED_SOFT,
                    color: RED,
                    boxShadow: `inset 0 0 0 1px ${RED_SOFT_STRONG}`,
                  }}
                  title={email || ""}
                >
                  {userName.slice(0, 1).toUpperCase()}
                </div>
              </div>
            </div>
            <Outlet />
          </main>
        </div>

        <MobileBottomNav items={mobileItems} accent={RED} />
      </div>
    </div>
  );
}
