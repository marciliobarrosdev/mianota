import { supabase } from "@/lib/auth/realm-supabase";

const TRANSIENT_NETWORK_ERROR = /failed to fetch|network|load failed/i;

/**
 * A leitura acontece logo no primeiro carregamento do clone. Em previews recém
 * acordados, a primeira conexão pode falhar antes de o serviço ficar pronto.
 * Repetimos somente falhas transitórias; erros reais continuam visíveis.
 */
export async function readRemixInstallationClaimed() {
  let result = await supabase.rpc("is_remix_installation_claimed");

  if (result.error && TRANSIENT_NETWORK_ERROR.test(result.error.message)) {
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    result = await supabase.rpc("is_remix_installation_claimed");
  }

  return result;
}
