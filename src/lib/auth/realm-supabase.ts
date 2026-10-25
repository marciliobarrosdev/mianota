import { supabase as subscriberSupabase } from "@/integrations/supabase/client";
import { getSuperadminSupabase } from "@/lib/auth/superadmin-client";

/**
 * Cada aba pertence a um "domínio de sessão":
 * - superadmin: /superadmin, /master/* e /app/* somente durante uma impersonação
 *   aberta pelo Master NESTA aba (sessionStorage é por aba);
 * - subscriber: todo o resto (/entrar, /app/*, páginas públicas).
 *
 * Componentes compartilhados importam `supabase` daqui e recebem
 * automaticamente o cliente certo, sem nunca misturar as duas sessões.
 */
export type AuthRealm = "superadmin" | "subscriber";

export const IMPERSONATION_STORAGE_KEY = "master_impersonate_company";

type Client = typeof subscriberSupabase;

export function isSuperadminPath(pathname: string): boolean {
  return (
    pathname === "/superadmin" ||
    pathname.startsWith("/superadmin/") ||
    pathname === "/master" ||
    pathname.startsWith("/master/")
  );
}

function isAppPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export function readImpersonationCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearImpersonation(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function currentAuthRealm(pathname?: string): AuthRealm {
  if (typeof window === "undefined") return "subscriber";
  const path = pathname ?? window.location.pathname;
  if (isSuperadminPath(path)) return "superadmin";
  if (isAppPath(path) && readImpersonationCompanyId()) return "superadmin";
  return "subscriber";
}

export function getRealmClient(realm: AuthRealm): Client {
  return realm === "superadmin" ? getSuperadminSupabase() : subscriberSupabase;
}

export function getRealmSupabase(): Client {
  return getRealmClient(currentAuthRealm());
}

/** Encerra SOMENTE a sessão do domínio informado (escopo local). */
export async function signOutRealm(realm: AuthRealm): Promise<void> {
  await getRealmClient(realm).auth.signOut({ scope: "local" });
}

/** Cliente do domínio da aba atual. */
export const supabase = new Proxy({} as Client, {
  get(_, prop) {
    const client = getRealmSupabase();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
