export type CloneBrand = {
  name: string;
  shortName: string;
  assistantName: string;
  tagline: string;
  description: string;
  primary: string;
  primaryOklch: string;
  accent: string;
  logoUrl: string | null;
  iconUrl: string | null;
  avatarUrl: string | null;
  legalName: string;
  legalDocument: string;
  contactEmail: string;
  contactAddress: string;
};

// Fallback que mantém o clone utilizável antes mesmo da configuração inicial.
// A identidade salva pelo dono do clone é carregada em BrandProvider.
export const brand: CloneBrand = {
  name: "MárcIA",
  shortName: "MárcIA",
  assistantName: "Márcia",
  tagline: "Sua assessora financeira pessoal com inteligência artificial",
  description: "Registre, organize e entenda sua vida financeira por voz, texto, foto ou banco.",
  primary: "#7C3AED",
  primaryOklch: "0.56 0.25 292",
  accent: "#C084FC",
  logoUrl: null,
  iconUrl: null,
  avatarUrl: null,
  legalName: "",
  legalDocument: "",
  contactEmail: "",
  contactAddress: "",
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string): number {
  const light = Math.max(relativeLuminance(first), relativeLuminance(second));
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (light + 0.05) / (dark + 0.05);
}

/** Selects the higher-contrast foreground for any valid brand color. */
export function brandForeground(primary: string): "#FFFFFF" | "#170D28" {
  const safePrimary = HEX_COLOR.test(primary) ? primary : brand.primary;
  return contrastRatio(safePrimary, "#FFFFFF") >= contrastRatio(safePrimary, "#170D28")
    ? "#FFFFFF"
    : "#170D28";
}

export function isSafeBrandAssetUrl(candidate: unknown): candidate is string {
  if (typeof candidate !== "string") return false;
  const clean = candidate.trim();
  if (!clean || clean.length > 2048) return false;
  if (/^\/(?!\/)/.test(clean)) return true;
  try {
    return new URL(clean).protocol === "https:";
  } catch {
    return false;
  }
}

export function personalizeAssistantText(value: string, assistantName: string): string {
  return value.replaceAll("MárcIA", assistantName).replaceAll("Márcia", assistantName);
}

const GENERATED_ASSISTANT_INTRO_PREFIXES = [
  "Olá! Sou ",
  "Oi! Sou ",
  "Olá, sou ",
  "Oi, sou ",
  "Olá! Eu sou ",
  "Oi! Eu sou ",
  "Olá, eu sou ",
  "Oi, eu sou ",
] as const;

/**
 * Renames only the identity slot in a generated/preset introduction.
 * Business-authored free text is deliberately left untouched.
 */
export function migrateGeneratedAssistantPresentation(
  value: string,
  previousName: string,
  assistantName: string,
): string {
  const oldName = previousName.trim();
  const nextName = assistantName.trim();
  if (!value || !oldName || !nextName || oldName === nextName) return value;

  for (const prefix of GENERATED_ASSISTANT_INTRO_PREFIXES) {
    const identity = `${prefix}${oldName}`;
    const delimiter = value.slice(identity.length, identity.length + 1);
    if (value.startsWith(identity) && (!delimiter || /[\s,.!—-]/u.test(delimiter))) {
      return `${prefix}${nextName}${value.slice(identity.length)}`;
    }
  }

  return value;
}

export function applyAssistantBrand<T extends Record<string, unknown>>(
  config: T | null | undefined,
  assistantName: string,
): T & { nome_agente: string } {
  const next = { ...(config ?? {}) } as T & {
    nome_agente?: unknown;
    apresentacao?: unknown;
  };
  const previousName = typeof next.nome_agente === "string" ? next.nome_agente : "";
  if (typeof next.apresentacao === "string") {
    next.apresentacao = migrateGeneratedAssistantPresentation(
      next.apresentacao,
      previousName,
      assistantName,
    );
  }
  return { ...next, nome_agente: assistantName };
}

export function normalizeCloneBrand(value?: Partial<CloneBrand> | null): CloneBrand {
  const read = (candidate: unknown, fallback: string, max: number) => {
    const clean = typeof candidate === "string" ? candidate.trim().slice(0, max) : "";
    return clean || fallback;
  };
  const readUrl = (candidate: unknown) => {
    const clean = typeof candidate === "string" ? candidate.trim().slice(0, 2048) : "";
    return isSafeBrandAssetUrl(clean) ? clean : null;
  };
  const primary =
    typeof value?.primary === "string" && HEX_COLOR.test(value.primary)
      ? value.primary.toUpperCase()
      : brand.primary;

  return {
    name: read(value?.name, brand.name, 60),
    shortName: read(value?.shortName, value?.name || brand.shortName, 20),
    assistantName: read(value?.assistantName, brand.assistantName, 40),
    tagline: read(value?.tagline, brand.tagline, 120),
    description: read(value?.description, brand.description, 240),
    primary,
    primaryOklch: brand.primaryOklch,
    accent: read(value?.accent, brand.accent, 7),
    logoUrl: readUrl(value?.logoUrl),
    iconUrl: readUrl(value?.iconUrl),
    avatarUrl: readUrl(value?.avatarUrl),
    legalName: read(value?.legalName, "", 120),
    legalDocument: read(value?.legalDocument, "", 32),
    contactEmail: read(value?.contactEmail, "", 160),
    contactAddress: read(value?.contactAddress, "", 240),
  };
}

export function cloneBrandCssVariables(value: CloneBrand): Record<`--${string}`, string> {
  const foreground = brandForeground(value.primary);
  return {
    "--brand": value.primary,
    "--primary": value.primary,
    "--ring": value.primary,
    "--sidebar-primary": value.primary,
    "--primary-foreground": foreground,
    "--sidebar-primary-foreground": foreground,
    "--brand-strong": `color-mix(in srgb, ${value.primary} 76%, black)`,
    "--brand-master": `color-mix(in srgb, ${value.primary} 62%, black)`,
    "--brand-soft": `color-mix(in srgb, ${value.primary} 10%, transparent)`,
    "--brand-soft-strong": `color-mix(in srgb, ${value.primary} 19%, transparent)`,
    "--brand-text": `color-mix(in srgb, ${value.primary} 72%, var(--foreground))`,
    "--chart-1": value.primary,
    "--chart-2": `color-mix(in srgb, ${value.primary} 72%, #ec4899)`,
    "--shadow-glow": `0 0 0 1px color-mix(in srgb, ${value.primary} 18%, transparent), 0 18px 42px -20px color-mix(in srgb, ${value.primary} 46%, transparent)`,
  };
}

type RouteHeadMatch = { loaderData?: unknown };

/** Builds a page title from the brand already loaded by the root SSR loader. */
export function brandedRouteHead(
  pageTitle: string,
  description?: string | ((branding: CloneBrand) => string),
) {
  return ({ matches }: { matches: Array<RouteHeadMatch> }) => {
    const rootData = matches[0]?.loaderData;
    const branding = normalizeCloneBrand(
      rootData && typeof rootData === "object" ? (rootData as Partial<CloneBrand>) : brand,
    );
    return {
      meta: [
        { title: `${branding.name} — ${pageTitle}` },
        ...(description
          ? [
              {
                name: "description",
                content: typeof description === "function" ? description(branding) : description,
              },
            ]
          : []),
      ],
    };
  };
}

// Cada clone configura o próprio suporte sem herdar o número do projeto original.
export const supportWhatsapp = String(import.meta.env.VITE_SUPPORT_WHATSAPP || "").replace(
  /\D/g,
  "",
);
export const supportConfigured = supportWhatsapp.length >= 10;
export const supportWhatsappUrl = supportConfigured ? `https://wa.me/${supportWhatsapp}` : "/";
export const supportWhatsappDisplay = supportConfigured
  ? String(import.meta.env.VITE_SUPPORT_WHATSAPP_DISPLAY || supportWhatsapp)
  : "";

// Dados públicos e opcionais do responsável comercial desta instalação.
// Mantemos vazio por padrão para nenhum Remix publicar CNPJ, e-mail ou endereço inventado.
const publicLegalValue = (value: unknown, max: number) =>
  String(value || "")
    .trim()
    .slice(0, max);

export const legalProfile = {
  name: publicLegalValue(import.meta.env.VITE_LEGAL_NAME, 120),
  document: publicLegalValue(import.meta.env.VITE_LEGAL_DOCUMENT, 32),
  email: publicLegalValue(import.meta.env.VITE_LEGAL_EMAIL, 160),
  address: publicLegalValue(import.meta.env.VITE_LEGAL_ADDRESS, 240),
};
