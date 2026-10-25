import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  ReceiptText,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/lib/auth/realm-supabase";
import { supportConfigured, supportWhatsappDisplay, supportWhatsappUrl } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { BrandLogo } from "@/components/brand-logo";
import { TrialBanner } from "@/components/trial-banner";
import { CreditsBadge } from "@/components/credits-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileBottomNav, type MobileNavItem } from "@/components/mobile-bottom-nav";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import type { CompanyRow, Membership } from "@/lib/tenant";
import { useWhatsappStatus } from "@/hooks/use-whatsapp-status";
import { clearAppAccessCache } from "@/lib/app-access-cache";
import { clearImpersonation, currentAuthRealm, signOutRealm } from "@/lib/auth/realm-supabase";
import { syncFinanceReminders } from "@/lib/finance-reminders.functions";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  featured?: boolean;
  matches?: string[];
};

// Menu principal do assinante: exatamente as cinco áreas do produto.
const getMainItems = (assistantName: string): NavItem[] => [
  {
    to: "/app/inicio",
    label: "Visão do mês",
    icon: LayoutDashboard,
    matches: ["/app/relatorios"],
  },
  {
    to: "/app/movimentacoes",
    label: "Movimentações",
    icon: ReceiptText,
    matches: ["/app/contas", "/app/cartoes"],
  },
  {
    to: "/app/planejamento",
    label: "Planejamento e calendário",
    icon: CalendarDays,
    matches: ["/app/calendario", "/app/orcamentos", "/app/recorrencias"],
  },
  { to: "/app/marcia", label: `Falar com ${assistantName}`, icon: Sparkles, featured: true },
  {
    to: "/app/configuracoes",
    label: "Configurações",
    icon: Settings,
    adminOnly: true,
    matches: ["/app/integracoes", "/app/conexao", "/app/agente"],
  },
];

const getManageItems = (): NavItem[] => [
  { to: "/app/guia", label: "Comece aqui", icon: Sparkles, adminOnly: true },
];

function isItemActive(pathname: string, item: NavItem) {
  return (
    pathname.startsWith(item.to) || Boolean(item.matches?.some((path) => pathname.startsWith(path)))
  );
}

export function AppShell({
  children,
  company,
  membership,
  email,
  isSuperAdmin,
}: {
  children: ReactNode;
  company: CompanyRow | null;
  membership?: Membership | null;
  email?: string | null;
  isSuperAdmin?: boolean;
}) {
  const branding = useBrand();
  const syncReminders = useServerFn(syncFinanceReminders);
  const loc = useLocation();
  const navigate = useNavigate();
  const primary = branding.primary;
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const mainItems = getMainItems(branding.assistantName);
  const userName = (email || "Você").split("@")[0];
  const roleLabel =
    membership?.role === "owner"
      ? "Dono"
      : membership?.role === "admin"
        ? "Administrador"
        : "Equipe";

  useEffect(() => {
    if (!company?.id) return;
    const run = () =>
      void syncReminders({ data: { companyId: company.id } }).catch(() => undefined);
    run();
    const interval = window.setInterval(run, 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [company?.id, syncReminders]);

  async function signOut() {
    clearAppAccessCache();
    // Durante uma impersonação o painel usa a sessão do proprietário: "Sair"
    // encerra a impersonação e volta ao Master sem tocar no assinante.
    if (currentAuthRealm() === "superadmin") {
      clearImpersonation();
      window.location.href = "/master/assinantes";
      return;
    }
    await signOutRealm("subscriber");
    toast.success("Sessão encerrada");
    navigate({ to: "/entrar", replace: true });
  }

  const mobileOrder = [
    "/app/inicio",
    "/app/movimentacoes",
    "/app/marcia",
    "/app/planejamento",
    "/app/configuracoes",
  ];
  const mobileItems: MobileNavItem[] = mobileOrder
    .flatMap((path) => mainItems.filter((item) => item.to === path))
    .filter((item) => !item.adminOnly || isAdmin)
    .map(({ to, label, icon }) => ({
      to,
      label:
        label === "Movimentações"
          ? "Extrato"
          : label === "Planejamento e calendário"
            ? "Calendário"
            : label === "Configurações"
              ? "Ajustes"
              : label === "Visão do mês"
                ? "Mês"
                : label.startsWith("Falar com ")
                  ? branding.assistantName
                  : label,
      icon,
    }));

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ "--brand": primary } as CSSProperties}
    >
      {company && <TrialBanner company={company} />}
      <MobileHeader
        company={company}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        signOut={signOut}
      />
      <div className="flex min-h-screen">
        <Sidebar
          loc={loc}
          company={company}
          email={email}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          primary={primary}
          roleLabel={roleLabel}
          signOut={signOut}
          userName={userName}
        />
        <main className="min-w-0 flex-1">
          <div className="hidden h-[68px] items-center border-b border-[color:var(--hairline)] bg-white/65 px-6 backdrop-blur-xl dark:bg-[color:var(--panel)]/70 md:flex">
            {isAdmin && <WhatsappStatusPill companyId={company?.id} />}
            <div className="ml-auto flex items-center gap-2">
              {company && <CreditsBadge companyId={company.id} />}
              <Link
                to="/app/notificacoes"
                className="grid size-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
                title="Notificações"
                aria-label="Abrir notificações"
              >
                <Bell className="size-[17px]" />
              </Link>
              <ThemeToggle />
              <div className="grid size-9 place-items-center rounded-xl bg-[color:var(--brand-soft)] text-sm font-extrabold text-[color:var(--brand-text)] ring-1 ring-[color:var(--brand-soft-strong)]">
                {userName.slice(0, 1).toUpperCase()}
              </div>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-7 lg:px-9">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav items={mobileItems} accent={primary} />
    </div>
  );
}

function MobileHeader({
  company,
  isAdmin,
  isSuperAdmin,
  signOut,
}: {
  company: CompanyRow | null;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  signOut: () => void;
}) {
  const branding = useBrand();
  const loc = useLocation();
  const menuItems = getManageItems().filter((item) => !item.adminOnly || isAdmin);

  return (
    <header className="sticky top-0 z-40 flex h-[62px] items-center gap-3 border-b border-[color:var(--hairline)] bg-white/80 px-4 backdrop-blur-xl dark:bg-[color:var(--panel)]/80 md:hidden">
      <BrandLogo compact />
      <div className="min-w-0">
        <div className="truncate font-display text-[15px] font-extrabold leading-none">
          {branding.name}
        </div>
        <div className="mt-1 truncate text-[10px] text-muted-foreground">
          {company?.nome || "Sua empresa"}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Link
          to="/app/notificacoes"
          className="grid size-9 place-items-center rounded-xl text-muted-foreground"
          aria-label="Abrir notificações"
        >
          <Bell className="size-[17px]" />
        </Link>
        <ThemeToggle />
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-xl text-muted-foreground"
              aria-label="Abrir menu"
            >
              <Menu className="size-[19px]" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[min(88vw,360px)] overflow-y-auto border-l border-[color:var(--hairline)] bg-[color:var(--panel)] p-5"
          >
            <SheetHeader className="pr-8 text-left">
              <div className="flex items-center gap-3">
                <BrandLogo />
                <div className="min-w-0">
                  <SheetTitle className="truncate font-display text-lg font-extrabold">
                    {branding.name}
                  </SheetTitle>
                  <SheetDescription className="truncate text-xs">
                    {company?.nome || "Sua empresa"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <nav className="mt-7 space-y-1" aria-label="Mais opções">
              <div className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.17em] text-muted-foreground/70">
                Mais opções
              </div>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SheetClose asChild key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={isItemActive(loc.pathname, item) ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isItemActive(loc.pathname, item) ? "bg-[color:var(--brand-soft)] text-foreground" : "text-muted-foreground hover:bg-[color:var(--panel-2)] hover:text-foreground"}`}
                    >
                      <Icon className="size-[18px]" />
                      <span>{item.label}</span>
                      <ChevronRight className="ml-auto size-4" />
                    </Link>
                  </SheetClose>
                );
              })}
              {isSuperAdmin && (
                <SheetClose asChild>
                  <Link
                    to="/master/implantacao"
                    className="mt-3 flex items-center gap-3 rounded-xl bg-violet-50 px-3 py-3 text-sm font-bold text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"
                  >
                    <Shield className="size-[18px]" /> Implantação guiada{" "}
                    <ChevronRight className="ml-auto size-4" />
                  </Link>
                </SheetClose>
              )}
            </nav>
            <div className="mt-6 border-t border-[color:var(--hairline)] pt-4">
              <SheetClose asChild>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-[color:var(--panel-2)] hover:text-foreground"
                >
                  <LogOut className="size-[18px]" /> Sair
                </button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function Sidebar({
  loc,
  company,
  email,
  isAdmin,
  isSuperAdmin,
  primary,
  roleLabel,
  signOut,
  userName,
}: {
  loc: { pathname: string };
  company: CompanyRow | null;
  email?: string | null;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  primary: string;
  roleLabel: string;
  signOut: () => void;
  userName: string;
}) {
  const branding = useBrand();
  const mainItems = getMainItems(branding.assistantName);
  const manageItems = getManageItems();
  return (
    <aside className="sticky top-0 hidden h-screen w-[276px] shrink-0 flex-col border-r border-[color:var(--hairline)] bg-white/84 backdrop-blur-2xl dark:bg-[color:var(--sidebar-bg)]/92 md:flex">
      <div className="flex h-[86px] items-center gap-3 border-b border-[color:var(--hairline)] px-5">
        <BrandLogo />
        <div className="min-w-0">
          <div className="truncate font-display text-[17px] font-extrabold tracking-[-.03em]">
            {branding.name}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {company?.nome || "Sua empresa"}
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.17em] text-muted-foreground/70">
          Seu financeiro
        </div>
        <div className="space-y-1">
          {mainItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => (
              <NavLink
                key={item.to}
                item={item}
                active={isItemActive(loc.pathname, item)}
                primary={primary}
              />
            ))}
        </div>
      </nav>
      <div className="space-y-2 border-t border-[color:var(--hairline)] p-3">
        {isSuperAdmin && (
          <Link
            to="/master/implantacao"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-50"
          >
            <Shield className="size-4" /> Implantação guiada{" "}
            <ChevronRight className="ml-auto size-4" />
          </Link>
        )}
        {manageItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavLink
              key={item.to}
              item={item}
              active={isItemActive(loc.pathname, item)}
              primary={primary}
            />
          ))}
        <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--panel-2)] p-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[color:var(--brand-soft)] text-sm font-extrabold text-[color:var(--brand-text)]">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-bold">{userName}</div>
            <div className="truncate text-[10px] text-muted-foreground" title={email ?? undefined}>
              {roleLabel}
            </div>
          </div>
          <button
            onClick={signOut}
            title="Sair"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
        {supportConfigured && (
          <a
            href={supportWhatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <MessageCircle className="size-3" /> Suporte {supportWhatsappDisplay}
          </a>
        )}
      </div>
    </aside>
  );
}

function NavLink({ item, active, primary }: { item: NavItem; active: boolean; primary: string }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition ${active ? "text-foreground" : item.featured ? "bg-gradient-to-r from-[color:var(--brand-soft)] to-fuchsia-50 text-[color:var(--brand-text)] ring-1 ring-[color:var(--brand-soft-strong)] hover:-translate-y-0.5" : "text-muted-foreground hover:bg-[color:var(--panel-2)] hover:text-foreground"}`}
      style={
        active
          ? {
              background: "var(--brand-soft)",
              boxShadow: "inset 0 0 0 1px var(--brand-soft-strong)",
            }
          : undefined
      }
    >
      <Icon
        className="size-[18px]"
        style={active ? { color: primary } : undefined}
        strokeWidth={active ? 2.35 : 1.9}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function WhatsappStatusPill({ companyId }: { companyId?: string }) {
  const status = useWhatsappStatus(companyId);
  const connected = status === "connected";
  const connecting = status === "connecting";
  const unknown = status === "unknown";
  const label = connected
    ? "WhatsApp ativado"
    : connecting
      ? "Ativando WhatsApp"
      : unknown
        ? "Verificando WhatsApp"
        : "Ativar WhatsApp";
  const color = connected ? "#16a34a" : connecting ? "#f59e0b" : unknown ? "#64748b" : "#7c3aed";
  return (
    <Link
      to="/app/conexao"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold"
      style={{ color }}
      title="Ativar o WhatsApp financeiro"
    >
      <span className="relative size-2 rounded-full" style={{ background: color }} />
      {label}
    </Link>
  );
}
