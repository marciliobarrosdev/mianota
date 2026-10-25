import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

import {
  brand as fallbackBrand,
  cloneBrandCssVariables,
  normalizeCloneBrand,
  type CloneBrand,
} from "@/config/brand";
import { BrandContext } from "@/contexts/brand-context";
import { supabase } from "@/lib/auth/realm-supabase";

type PublicBrandRow = {
  product_name?: string | null;
  short_name?: string | null;
  assistant_name?: string | null;
  tagline?: string | null;
  description?: string | null;
  primary_color?: string | null;
  logo_url?: string | null;
  icon_url?: string | null;
  avatar_url?: string | null;
  legal_name?: string | null;
  legal_document?: string | null;
  contact_email?: string | null;
  contact_address?: string | null;
};

function fromPublicRow(row?: PublicBrandRow | null): CloneBrand {
  return normalizeCloneBrand({
    name: row?.product_name || undefined,
    shortName: row?.short_name || undefined,
    assistantName: row?.assistant_name || undefined,
    tagline: row?.tagline || undefined,
    description: row?.description || undefined,
    primary: row?.primary_color || undefined,
    logoUrl: row?.logo_url || undefined,
    iconUrl: row?.icon_url || undefined,
    avatarUrl: row?.avatar_url || undefined,
    legalName: row?.legal_name || undefined,
    legalDocument: row?.legal_document || undefined,
    contactEmail: row?.contact_email || undefined,
    contactAddress: row?.contact_address || undefined,
  });
}

function setMeta(selector: string, attribute: "content" | "href", value: string) {
  const element = document.head.querySelector<HTMLElement>(selector);
  element?.setAttribute(attribute, value);
}

function applyBrandToDocument(value: CloneBrand, pathname: string) {
  const root = document.documentElement;
  Object.entries(cloneBrandCssVariables(value)).forEach(([property, next]) =>
    root.style.setProperty(property, next),
  );

  const title =
    pathname === "/"
      ? `${value.name} — ${value.tagline}`
      : `${value.name} — ${
          document.title.includes(" — ")
            ? document.title.split(" — ").slice(1).join(" — ")
            : document.title
        }`;
  if (title) document.title = title;

  setMeta('meta[name="theme-color"]', "content", value.primary);
  setMeta('meta[name="application-name"]', "content", value.shortName);
  setMeta('meta[name="apple-mobile-web-app-title"]', "content", value.shortName);
  setMeta('meta[name="description"]', "content", value.description);
  setMeta('meta[name="author"]', "content", value.name);
  setMeta('meta[property="og:title"]', "content", `${value.name} — ${value.tagline}`);
  setMeta('meta[property="og:description"]', "content", value.description);
  setMeta('meta[name="twitter:title"]', "content", `${value.name} — ${value.tagline}`);
  setMeta('meta[name="twitter:description"]', "content", value.description);

  const icon = value.iconUrl || value.logoUrl || "/icons/marcia-app.svg";
  setMeta('link[rel="icon"]', "href", icon);
  setMeta(
    'link[rel="apple-touch-icon"]',
    "href",
    value.iconUrl || value.logoUrl || "/icons/apple-touch-icon.png",
  );

  try {
    localStorage.setItem("clone-brand-cache", JSON.stringify(value));
  } catch {
    // Branding remains applied even when storage is disabled by the browser.
  }

  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.ready
      .then((registration) => {
        registration.active?.postMessage({ type: "clone-brand:update", brand: value });
      })
      .catch(() => undefined);
  }
}

export function BrandProvider({
  children,
  initialBrand = fallbackBrand,
}: {
  children: ReactNode;
  initialBrand?: CloneBrand;
}) {
  const location = useLocation();
  const [value, setValue] = useState<CloneBrand>(() => normalizeCloneBrand(initialBrand));

  useEffect(() => {
    let active = true;
    const canReadCloud = Boolean(
      import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    );

    if (canReadCloud) {
      void (async () => {
        try {
          const { data } = await supabase.rpc("get_public_clone_brand");
          if (!active) return;
          const row = Array.isArray(data) ? data[0] : data;
          setValue(fromPublicRow(row));
        } catch {
          // Clones antigos continuam com a marca padrão até a migration ser aplicada.
        }
      })();
    }

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<PublicBrandRow>).detail;
      setValue(fromPublicRow(detail));
    };
    window.addEventListener("clone-brand:updated", handleUpdate);
    return () => {
      active = false;
      window.removeEventListener("clone-brand:updated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => applyBrandToDocument(value, location.pathname), 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname, value]);

  const stableValue = useMemo(() => value, [value]);
  return <BrandContext.Provider value={stableValue}>{children}</BrandContext.Provider>;
}
