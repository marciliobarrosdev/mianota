import { superadminSupabase } from "@/lib/auth/superadmin-client";

export type RemixBootstrapResult = {
  company_id: string | null;
  claimed_super_admin: boolean;
  created_company: boolean;
  needs_onboarding: boolean;
};

export type RemixBootstrapOptions = {
  companyName?: string | null;
};

/**
 * Prepara os dados básicos da instalação e, se ela ainda não tiver dono,
 * conclui a ativação automática. O banco decide de forma atômica: somente a
 * primeira conta confirmada do Auth deste clone pode assumir, uma única vez.
 * Roda somente com a sessão administrativa (/superadmin).
 */
export async function ensureRemixBootstrap(
  input?: string | null | RemixBootstrapOptions,
): Promise<RemixBootstrapResult> {
  const options: RemixBootstrapOptions =
    typeof input === "string" || input == null ? { companyName: input } : input;

  const { data, error } = await superadminSupabase.rpc("bootstrap_remix_instance", {
    _company_name: options.companyName?.trim() || undefined,
  });

  if (error) throw new Error(error.message || "Não foi possível preparar seu acesso.");

  const result = data?.[0];
  if (!result) throw new Error("A preparação do sistema não retornou um estado válido.");
  return result;
}
