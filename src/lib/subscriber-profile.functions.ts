import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { brazilianPhoneError, normalizeValidBrazilianPhone } from "@/lib/phone";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Salva nome e telefone de contato do espaço do assinante. O telefone é
 * validado e normalizado aqui no servidor (+55…), nunca só na tela.
 * A gravação usa o cliente do próprio usuário, então o RLS continua valendo.
 */
export const saveSubscriberContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; nome: string; telefone?: string | null }) => {
    if (!UUID.test(String(d?.companyId || ""))) throw new Error("Conta inválida.");
    const nome = String(d?.nome || "").trim();
    if (nome.length < 2) throw new Error("Informe o nome do espaço.");
    if (nome.length > 120) throw new Error("Nome muito longo.");
    const rawPhone = String(d?.telefone ?? "").slice(0, 30);
    const phoneError = brazilianPhoneError(rawPhone, { required: false });
    if (phoneError) throw new Error(phoneError);
    return {
      companyId: d.companyId,
      nome,
      telefone: rawPhone.trim() ? normalizeValidBrazilianPhone(rawPhone) : null,
    };
  })
  .handler(async ({ context, data }) => {
    const { data: updated, error } = await context.supabase
      .from("company")
      .update({ nome: data.nome, telefone: data.telefone })
      .eq("id", data.companyId)
      .select("id")
      .maybeSingle();
    if (error || !updated) throw new Error("Não foi possível salvar os dados agora.");
    return { nome: data.nome, telefone: data.telefone };
  });
