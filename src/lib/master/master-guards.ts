/**
 * Checagem compartilhada pelas funções do Master: confirma no banco (RPC `is_super_admin`)
 * que quem chama é o Super Administrador. Nunca confie em dados do navegador para isso.
 */
export async function assertSuper(supabase: any, _userId: string) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error) throw new Error(`Não foi possível validar o acesso: ${error.message}`);
  if (data !== true) throw new Error("Acesso negado");
}
