/* eslint-disable @typescript-eslint/no-explicit-any -- recebe o cliente autenticado do middleware */
/**
 * Única checagem de Super Admin usada pelas funções do servidor.
 * Confirma no banco (RPC `is_super_admin`) que quem chama é o proprietário da instalação;
 * nunca confie em dados do navegador para isso. Detalhes de erro do banco ficam no log do
 * servidor e não são mostrados ao usuário.
 */
export const SUPER_ADMIN_DENIED = "Acesso restrito ao proprietário da instalação.";

export async function assertSuperAdmin(supabase: any, _userId?: string): Promise<void> {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error) {
    console.error("[master-guards] is_super_admin falhou:", error.message);
    throw new Error("Não foi possível validar o acesso. Tente novamente.");
  }
  if (data !== true) throw new Error(SUPER_ADMIN_DENIED);
}

/** Nome antigo mantido para as funções do Master que já o usam. */
export const assertSuper = assertSuperAdmin;
