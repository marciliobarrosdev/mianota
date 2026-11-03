/** Name shown for the signed-in subscriber: responsible person, then company, then e-mail prefix. */
export function subscriberDisplayName(
  company: { nome_responsavel?: string | null; nome?: string | null } | null | undefined,
  email?: string | null,
): string {
  const responsavel = company?.nome_responsavel?.trim();
  if (responsavel) return responsavel;
  const nome = company?.nome?.trim();
  if (nome) return nome;
  const prefix = (email || "").split("@")[0]?.trim();
  return prefix || "Você";
}
