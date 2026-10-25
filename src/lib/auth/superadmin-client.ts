import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { brokeredPreviewStorage } from "@/integrations/supabase/previewAuthStorage";
import type { supabase as subscriberClient } from "@/integrations/supabase/client";

/**
 * Sessão EXCLUSIVA do proprietário (super admin).
 *
 * Este cliente nunca compartilha armazenamento com a sessão do assinante:
 * - storageKey próprio → token, refresh token e usuário ficam em outra chave;
 * - o lock interno, o canal entre abas e o auto-refresh do Auth são derivados
 *   do storageKey, então renovar/sair aqui não toca na sessão do assinante;
 * - só lê confirmação de e-mail da URL quando a página é /superadmin.
 *
 * Use apenas em /superadmin e /master/* (diretamente ou via realm-supabase).
 */
export const SUPERADMIN_AUTH_STORAGE_KEY = "sb-marcia-superadmin-auth-token";

type Client = typeof subscriberClient;

function isOpaqueKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSuperadminClient(): Client {
  if (typeof window === "undefined") {
    throw new Error("A sessão administrativa só existe no navegador.");
  }
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Configuração do backend indisponível neste ambiente.");

  const fetchWithKey: typeof fetch = (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    if (isOpaqueKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };

  return createClient<Database>(url, key, {
    global: { fetch: fetchWithKey },
    auth: {
      storageKey: SUPERADMIN_AUTH_STORAGE_KEY,
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: (current) => current.pathname.startsWith("/superadmin"),
    },
  }) as unknown as Client;
}

let instance: Client | undefined;

export function getSuperadminSupabase(): Client {
  if (!instance) instance = createSuperadminClient();
  return instance;
}

/** Cliente administrativo (lazy: só é criado no navegador, no primeiro uso). */
export const superadminSupabase = new Proxy({} as Client, {
  get(_, prop) {
    const client = getSuperadminSupabase();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
