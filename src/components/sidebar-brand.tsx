/**
 * Marca exclusiva das barras laterais (Master e Assinante).
 * Regra do produto: esta logo/ícone NÃO deve ser usada em outras páginas.
 */
import { useEffect, useState } from "react";
import { setPreference } from "@/lib/common/consent";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import logo from "@/assets/mianota-sidebar-logo.webp.asset.json";
import icon from "@/assets/mianota-sidebar-icon.webp.asset.json";

/** Estado recolhido lembrado no navegador; lido após hidratar para evitar divergência. */
export function useSidebarCollapsed(key: string) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(localStorage.getItem(key) === "1");
  }, [key]);
  const toggle = () =>
    setCollapsed((v) => {
      setPreference(key, v ? "0" : "1");
      return !v;
    });
  return { collapsed, toggle };
}

export function SidebarBrand({ collapsed, small }: { collapsed: boolean; small?: boolean }) {
  return collapsed ? (
    <img src={icon.url} alt="MIAnota" width={40} height={40} className="size-10 object-contain" />
  ) : (
    // Fundo claro no tema escuro: as letras da logo são roxo-escuras.
    <span className="inline-flex rounded-xl dark:bg-white/95 dark:px-2.5 dark:py-1.5">
      <img src={logo.url} alt="MIAnota" width={187} height={58} className={`${small ? "h-8" : "h-11"} w-auto object-contain`} />
    </span>
  );
}

export function SidebarCollapseButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <button
      type="button"
      onClick={onToggle}
      title={collapsed ? "Abrir menu" : "Recolher menu"}
      aria-label={collapsed ? "Abrir menu" : "Recolher menu"}
      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-[color:var(--panel-2)] hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  );
}
