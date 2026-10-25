import { useState } from "react";
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  CalendarDays,
  Home,
  LayoutGrid,
  LogIn,
  Menu,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MobileBottomNav, type MobileNavItem } from "@/components/mobile-bottom-nav";
import { useBrand } from "@/contexts/brand-context";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/demo")({ component: DemoLayout });

type DemoPath =
  | "/demo/dashboard"
  | "/demo/movimentacoes"
  | "/demo/planejamento"
  | "/demo/marcia"
  | "/demo/configuracoes";

type DemoNavItem = {
  to: DemoPath;
  label: string;
  icon: LucideIcon;
  badge?: string;
  featured?: boolean;
  matches?: string[];
};

// Mesma navegação do painel real: cinco áreas, sem contas/cartões.
const navigation: Array<{ label: string; items: DemoNavItem[] }> = [
  {
    label: "Seu financeiro",
    items: [
      { to: "/demo/dashboard", label: "Visão do mês", icon: Home },
      { to: "/demo/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
      { to: "/demo/planejamento", label: "Planejamento e calendário", icon: CalendarDays },
      { to: "/demo/marcia", label: "Falar com a MárcIA", icon: Sparkles, featured: true },
    ],
  },
];

const mobileItems: MobileNavItem[] = [
  { to: "/demo/dashboard", label: "Mês", icon: Home },
  { to: "/demo/movimentacoes", label: "Extrato", icon: ArrowLeftRight },
  { to: "/demo/marcia", label: "MárcIA", icon: Sparkles },
  { to: "/demo/planejamento", label: "Calendário", icon: CalendarDays },
  { to: "/demo/configuracoes", label: "Ajustes", icon: Settings2 },
];

function isDemoItemActive(pathname: string, item: DemoNavItem) {
  return pathname === item.to || Boolean(item.matches?.some((path) => pathname === path));
}

function DemoLayout() {
  const branding = useBrand();
  const loc = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const brandedNavigation = navigation;
  const allItems = brandedNavigation.flatMap((group) => group.items);
  const currentItem = allItems.find((item) => isDemoItemActive(loc.pathname, item));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="sticky top-0 z-[60] flex h-11 items-center justify-center gap-2 border-b border-violet-500/30 px-3 text-center text-[10px] font-bold text-white sm:text-[11px]"
        style={{
          background: `linear-gradient(90deg, color-mix(in srgb, ${branding.primary} 68%, black), ${branding.primary} 48%, #a21caf)`,
        }}
      >
        <Sparkles className="size-3.5 shrink-0" />
        <span>
          <strong>Demonstração ao vivo</strong> · dados fictícios, navegação completa
        </span>
        <Link
          to="/"
          hash="planos"
          className="ml-2 hidden rounded-lg bg-white/15 px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-white/20 transition hover:bg-white/25 sm:inline-flex"
        >
          Criar meu acesso
        </Link>
      </div>

      <div className="flex min-h-[calc(100vh-44px)]">
        <aside className="sticky top-11 hidden h-[calc(100vh-44px)] w-[286px] shrink-0 flex-col border-r border-border bg-white md:flex">
          <div className="flex h-[78px] items-center gap-3 border-b border-border px-5">
            <BrandLogo />
            <div className="min-w-0">
              <div className="truncate font-display text-[17px] font-black tracking-[-.04em]">
                {branding.name}
              </div>
              <div className="truncate text-[9px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                Demo · Família Aurora
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-2.5 pb-3" aria-label="Navegação da demonstração">
            {brandedNavigation.map((group, groupIndex) => (
              <div key={group.label} className={groupIndex ? "mt-2" : "mt-1"}>
                <div className="mb-1 px-3 text-[9px] font-extrabold uppercase tracking-[.17em] text-muted-foreground/70">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <DesktopNavItem
                      key={item.to}
                      item={item}
                      active={isDemoItemActive(loc.pathname, item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-border p-2.5">
            <Link
              to="/demo/configuracoes"
              className={`mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12.5px] font-bold transition ${loc.pathname === "/demo/configuracoes" ? "bg-violet-100 text-violet-900 ring-1 ring-violet-200" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <Settings2 className="size-[17px] text-violet-700" /> Configurações
            </Link>
            <Link
              to="/entrar"
              className="flex items-center gap-3 rounded-2xl border border-border bg-muted/70 p-2.5 text-sm font-bold transition hover:border-violet-200 hover:bg-violet-50"
            >
              <div className="grid size-9 place-items-center rounded-xl bg-violet-100 text-violet-700">
                V
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-extrabold">Visitante</span>
                <span className="block text-[9px] font-normal text-muted-foreground">
                  Entre para usar de verdade
                </span>
              </span>
              <LogIn className="size-4 text-violet-600" />
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="sticky top-11 z-40 flex h-[64px] items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur-xl md:hidden">
            <BrandLogo compact />
            <div className="min-w-0">
              <div className="truncate text-sm font-black">
                {currentItem?.label ?? branding.name}
              </div>
              <div className="text-[9px] uppercase tracking-[.12em] text-muted-foreground">
                Família Aurora · demo
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu completo"}
              className="ml-auto grid size-10 place-items-center rounded-xl bg-violet-700 text-white shadow-md transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 top-[108px] z-30 bg-[#1d1530]/30 backdrop-blur-[2px] md:hidden"
              />
              <div className="fixed inset-x-3 top-[116px] z-40 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-[24px] border border-violet-200 bg-white p-3 shadow-[0_24px_80px_-20px_rgba(29,21,48,.45)] md:hidden">
                <div className="mb-3 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-fuchsia-600 p-3 text-white">
                  <div className="grid size-9 place-items-center rounded-xl bg-white/15">
                    <LayoutGrid className="size-[18px]" />
                  </div>
                  <div>
                    <div className="text-xs font-black">Explore o painel completo</div>
                    <div className="text-[9px] text-violet-100">
                      5 áreas essenciais nesta prévia
                    </div>
                  </div>
                </div>
                {brandedNavigation.map((group) => (
                  <div key={group.label} className="mb-3 last:mb-0">
                    <div className="mb-1 px-2 text-[9px] font-extrabold uppercase tracking-[.15em] text-muted-foreground">
                      {group.label}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isDemoItemActive(loc.pathname, item);
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex min-h-11 items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-extrabold ${active ? "bg-violet-700 text-white" : item.featured ? "bg-fuchsia-50 text-fuchsia-800 ring-1 ring-fuchsia-200" : "bg-muted/70 text-foreground"}`}
                          >
                            <Icon className="size-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span
                                className={`ml-auto rounded-full px-1.5 py-0.5 text-[8px] ${active ? "bg-white/20" : "bg-violet-100 text-violet-700"}`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <Link
                  to="/demo/configuracoes"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`mt-2 flex min-h-11 items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-extrabold ${loc.pathname === "/demo/configuracoes" ? "bg-violet-700 text-white" : "bg-muted/70 text-foreground"}`}
                >
                  <Settings2 className="size-4" /> Configurações
                </Link>
              </div>
            </>
          )}

          <div className="mx-auto max-w-[1460px] px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-7 lg:px-8 xl:px-10">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileBottomNav items={mobileItems} accent={branding.primary} />
    </div>
  );
}

function DesktopNavItem({ item, active }: { item: DemoNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-1.5 text-[12.5px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
        active
          ? "bg-violet-100 text-violet-900 ring-1 ring-violet-200"
          : item.featured
            ? "bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-800 ring-1 ring-violet-100 hover:ring-violet-200"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-violet-700" />}
      <Icon
        className={`size-[17px] shrink-0 ${active || item.featured ? "text-violet-700" : "text-muted-foreground group-hover:text-violet-600"}`}
      />
      <span className="truncate">{item.label}</span>
      {item.badge && (
        <span
          className={`ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[9px] font-black ${active ? "bg-violet-700 text-white" : "bg-violet-100 text-violet-700"}`}
        >
          {item.badge}
        </span>
      )}
      {item.featured && !item.badge && <Sparkles className="ml-auto size-3.5 text-fuchsia-500" />}
    </Link>
  );
}
