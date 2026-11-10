/**
 * Regras puras de consentimento de cookies (LGPD).
 * O registro guarda apenas categorias, data, versão e validade — nunca dados pessoais,
 * financeiros, mensagens, senhas ou chaves.
 */
export const CONSENT_STORAGE_KEY = "mia-cookie-consent";
/** Suba a versão quando a Política de Cookies mudar de forma relevante: pede nova escolha. */
export const CONSENT_POLICY_VERSION = "2026-11-10";
/** Validade da escolha, em dias (ajustável). */
export const CONSENT_VALIDITY_DAYS = 365;

export type OptionalCategory = "preferences" | "analytics" | "marketing";
export type ConsentCategory = "essential" | OptionalCategory;

export interface ConsentRecord {
  version: string;
  decidedAt: string; // ISO
  expiresAt: string; // ISO
  categories: Record<OptionalCategory, boolean>;
}

export const DEFAULT_CATEGORIES: Record<OptionalCategory, boolean> = {
  preferences: false,
  analytics: false,
  marketing: false,
};

/** Itens do navegador que só podem ficar salvos com a categoria "preferências". */
export const PREFERENCE_STORAGE_KEYS = [
  "theme",
  "conv:filter",
  "mianota:sidebar-master",
  "mianota:sidebar-app",
  "marcia:pwa-install-dismissed-at",
];
export const PREFERENCE_COOKIE_NAMES = ["sidebar_state"];

export function buildConsent(
  categories: Partial<Record<OptionalCategory, boolean>>,
  now: Date = new Date(),
  validityDays = CONSENT_VALIDITY_DAYS,
): ConsentRecord {
  const expires = new Date(now.getTime() + validityDays * 86_400_000);
  return {
    version: CONSENT_POLICY_VERSION,
    decidedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    categories: {
      preferences: categories.preferences === true,
      analytics: categories.analytics === true,
      marketing: categories.marketing === true,
    },
  };
}

/** Lê o registro salvo; devolve null se ausente, malformado, de outra versão ou vencido. */
export function parseConsent(raw: string | null, now: Date = new Date()): ConsentRecord | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as ConsentRecord;
    if (!v || v.version !== CONSENT_POLICY_VERSION || !v.categories) return null;
    const exp = Date.parse(v.expiresAt);
    if (!Number.isFinite(exp) || exp <= now.getTime()) return null;
    return buildConsentFrom(v);
  } catch {
    return null;
  }
}

function buildConsentFrom(v: ConsentRecord): ConsentRecord {
  return {
    version: v.version,
    decidedAt: v.decidedAt,
    expiresAt: v.expiresAt,
    categories: {
      preferences: v.categories.preferences === true,
      analytics: v.categories.analytics === true,
      marketing: v.categories.marketing === true,
    },
  };
}

export function isAllowed(record: ConsentRecord | null, category: ConsentCategory): boolean {
  if (category === "essential") return true;
  return record?.categories[category] === true;
}
