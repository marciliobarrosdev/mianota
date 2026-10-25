import { createMiddleware } from "@tanstack/react-start";
import { getRealmSupabase } from "@/lib/auth/realm-supabase";

/**
 * Anexa às chamadas de servidor o token da sessão do domínio da aba atual:
 * telas do Master enviam o token administrativo; telas do assinante enviam o
 * token do assinante. O servidor revalida o token e a permissão em cada chamada.
 */
export const attachRealmSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await getRealmSupabase().auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
