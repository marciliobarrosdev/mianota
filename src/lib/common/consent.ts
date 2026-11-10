/**
 * Consentimento no navegador: leitura, gravação, revogação e bloqueio real.
 * Todas as funções são seguras no SSR (não fazem nada sem `window`).
 */
import {
  CONSENT_STORAGE_KEY,
  PREFERENCE_COOKIE_NAMES,
  PREFERENCE_STORAGE_KEYS,
  buildConsent,
  isAllowed,
  parseConsent,
  type ConsentCategory,
  type ConsentRecord,
  type OptionalCategory,
} from "./consent-rules";

export const CONSENT_EVENT = "mia:consent-changed";
export const OPEN_PREFERENCES_EVENT = "mia:open-cookie-preferences";

export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  return isAllowed(readConsent(), category);
}

/** Remove itens opcionais acessíveis (nunca sessão de login, nem o próprio registro). */
function purgeOptional(record: ConsentRecord) {
  if (!record.categories.preferences) {
    for (const k of PREFERENCE_STORAGE_KEYS) {
      try { window.localStorage.removeItem(k); } catch {}
    }
    for (const c of PREFERENCE_COOKIE_NAMES) {
      document.cookie = `${c}=; path=/; max-age=0`;
    }
  }
  // Análise/marketing: nenhuma ferramenta instalada hoje. Se alguma for adicionada,
  // remova aqui os cookies dela (ex.: _ga, _fbp) quando a categoria estiver desligada.
  if (!record.categories.analytics || !record.categories.marketing) {
    for (const part of document.cookie.split(";")) {
      const name = part.split("=")[0]?.trim();
      if (!name) continue;
      if ((!record.categories.analytics && /^(_ga|_gid|_gat|_clck|_clsk)/.test(name)) ||
          (!record.categories.marketing && /^(_fbp|_fbc|_gcl)/.test(name))) {
        document.cookie = `${name}=; path=/; max-age=0`;
      }
    }
  }
}

export function saveConsent(categories: Partial<Record<OptionalCategory, boolean>>): ConsentRecord {
  const record = buildConsent(categories);
  try { window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record)); } catch {}
  purgeOptional(record);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: record }));
  return record;
}

export function openCookiePreferences() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}

/** Grava uma preferência só se a categoria "preferências" estiver autorizada. */
export function setPreference(key: string, value: string) {
  if (typeof window === "undefined" || !hasConsent("preferences")) return;
  try { window.localStorage.setItem(key, value); } catch {}
}

/**
 * Carrega um script opcional (análise/marketing) somente após consentimento.
 * Se o consentimento chegar depois, carrega no momento da autorização.
 */
export function loadOptionalScript(category: Exclude<OptionalCategory, "preferences">, src: string) {
  if (typeof window === "undefined") return;
  const inject = () => {
    if (document.querySelector(`script[data-consent-src="${src}"]`)) return;
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.consentSrc = src;
    document.head.appendChild(s);
  };
  if (hasConsent(category)) return inject();
  const onChange = () => {
    if (hasConsent(category)) {
      window.removeEventListener(CONSENT_EVENT, onChange);
      inject();
    }
  };
  window.addEventListener(CONSENT_EVENT, onChange);
}
