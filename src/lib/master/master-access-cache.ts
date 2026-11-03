export type MasterAccessContext = {
  user: { id: string; email?: string | null };
};

type MasterAccessCache = {
  key: string;
  expiresAt: number;
  value?: MasterAccessContext;
  pending?: Promise<MasterAccessContext>;
};

const MASTER_ACCESS_CACHE_MS = 5 * 60_000;
let cache: MasterAccessCache | null = null;

export async function getCachedMasterAccess(
  key: string,
  load: () => Promise<MasterAccessContext>,
): Promise<MasterAccessContext> {
  if (cache?.key === key && cache.value && cache.expiresAt > Date.now()) return cache.value;
  if (cache?.key === key && cache.pending) return cache.pending;

  const pending = load()
    .then((value) => {
      cache = { key, value, expiresAt: Date.now() + MASTER_ACCESS_CACHE_MS };
      return value;
    })
    .catch((error) => {
      if (cache?.key === key) cache = null;
      throw error;
    });

  cache = { key, pending, expiresAt: Date.now() + MASTER_ACCESS_CACHE_MS };
  return pending;
}

export function clearMasterAccessCache(): void {
  cache = null;
}
