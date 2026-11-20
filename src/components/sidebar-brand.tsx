/**
 * Marca exclusiva das barras laterais (Master e Assinante).
 * Regra do produto: esta logo/ícone NÃO deve ser usada em outras páginas.
 */
import { useEffect, useState } from "react";
import { setPreference } from "@/lib/common/consent";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
    <img src="/mianota-icon.png" alt="MIAnota" width={40} height={40} className="size-10 object-contain" />
  ) : (
    <span className="inline-flex items-center">
      <img
        src="/mianota-logo-dark.png"
        alt="MIAnota"
        width={944}
        height={250}
        className={`${small ? "h-8" : "h-9"} w-auto object-contain dark:hidden`}
      />
      <img
        src="/mianota-logo-light.png"
        alt="MIAnota"
        width={944}
        height={250}
        className={`${small ? "h-8" : "h-9"} hidden w-auto object-contain dark:block`}
      />
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
