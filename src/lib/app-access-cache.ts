import type { CompanyRow, Membership } from "@/lib/tenant";

export type AppAccessContext = {
  user: { id: string; email?: string | null };
  company: CompanyRow | null;
  membership: Membership | null;
  isSuperAdmin: boolean;
  impersonating: boolean;
};

type AccessCache = {
  key: string;
  expiresAt: number;
  value?: AppAccessContext;
  pending?: Promise<AppAccessContext>;
};

const ACCESS_CACHE_MS = 30_000;
let cache: AccessCache | null = null;

export async function getCachedAppAccess(
  key: string,
  load: () => Promise<AppAccessContext>,
): Promise<AppAccessContext> {
  if (cache?.key === key && cache.value && cache.expiresAt > Date.now()) return cache.value;
  if (cache?.key === key && cache.pending) return cache.pending;

  const pending = load()
    .then((value) => {
      cache = { key, value, expiresAt: Date.now() + ACCESS_CACHE_MS };
      return value;
    })
    .catch((error) => {
      if (cache?.key === key) cache = null;
      throw error;
    });
  cache = { key, pending, expiresAt: Date.now() + ACCESS_CACHE_MS };
  return pending;
}

export function patchCachedAppCompany(companyId: string, patch: Partial<CompanyRow>): void {
  if (!cache?.value?.company || cache.value.company.id !== companyId) return;
  cache = {
    ...cache,
    value: {
      ...cache.value,
      company: { ...cache.value.company, ...patch },
    },
    expiresAt: Date.now() + ACCESS_CACHE_MS,
  };
}

export function clearAppAccessCache(): void {
  cache = null;
}
