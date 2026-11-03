const COMPANY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CompanyAdminAccess = {
  companyId: string;
  isSuperAdmin: boolean;
  membershipRole: "owner" | "admin" | null;
};

export type CompanyMemberAccess = {
  companyId: string;
  isSuperAdmin: boolean;
  membershipRole: string | null;
};

export async function assertUserPasswordReady(supabase: any): Promise<void> {
  const { data, error } = await supabase.rpc("current_user_requires_password_change");
  if (error) throw new Error(error.message);
  if (data === true) {
    throw new Error("Troque a senha temporária antes de usar a operação.");
  }
}

/** Autoriza leitura/ação operacional em um tenant explícito. */
export async function requireCompanyMemberAccess(
  supabase: any,
  userId: string,
  companyId: string,
): Promise<CompanyMemberAccess> {
  if (!COMPANY_ID_PATTERN.test(companyId)) throw new Error("Empresa inválida.");
  await assertUserPasswordReady(supabase);

  const [superResult, membershipResult] = await Promise.all([
    supabase.rpc("is_super_admin"),
    supabase
      .from("company_user")
      .select("role,forcar_troca_senha")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle(),
  ]);
  if (superResult.error) throw new Error(superResult.error.message);
  if (membershipResult.error) throw new Error(membershipResult.error.message);

  const isSuperAdmin = superResult.data === true;
  const membershipRole = membershipResult.data?.role as string | undefined;
  if (!isSuperAdmin && !membershipRole) throw new Error("Você não tem acesso a esta empresa.");
  if (membershipResult.data?.forcar_troca_senha) {
    throw new Error("Troque a senha temporária antes de usar a operação.");
  }

  const { data: company, error } = await supabase
    .from("company")
    .select("id")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!company) throw new Error("Empresa não encontrada.");

  return { companyId, isSuperAdmin, membershipRole: membershipRole ?? null };
}

/**
 * Autoriza uma ação administrativa contra uma empresa explícita.
 *
 * O companyId nunca é inferido pela primeira associação do usuário. Isso é
 * importante para o super admin, que pode estar implantando qualquer tenant,
 * e evita que uma ação aberta durante a impersonação caia na empresa errada.
 */
export async function requireCompanyAdminAccess(
  supabase: any,
  userId: string,
  companyId: string,
): Promise<CompanyAdminAccess> {
  if (!COMPANY_ID_PATTERN.test(companyId)) throw new Error("Empresa inválida.");
  await assertUserPasswordReady(supabase);

  const [superResult, membershipResult] = await Promise.all([
    supabase.rpc("is_super_admin"),
    supabase
      .from("company_user")
      .select("role,forcar_troca_senha")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("ativo", true)
      .in("role", ["owner", "admin"])
      .limit(1)
      .maybeSingle(),
  ]);

  if (superResult.error) throw new Error(superResult.error.message);
  if (membershipResult.error) throw new Error(membershipResult.error.message);

  const isSuperAdmin = superResult.data === true;
  const membershipRole = membershipResult.data?.role as "owner" | "admin" | undefined;
  if (!isSuperAdmin && !membershipRole) {
    throw new Error("Apenas owner, administrador ou super admin pode alterar esta conexão.");
  }
  if (membershipResult.data?.forcar_troca_senha) {
    throw new Error("Troque a senha temporária antes de usar a operação.");
  }

  // Confirma o alvo inclusive para super admins antes de qualquer efeito externo.
  const { data: company, error: companyError } = await supabase
    .from("company")
    .select("id")
    .eq("id", companyId)
    .maybeSingle();
  if (companyError) throw new Error(companyError.message);
  if (!company) throw new Error("Empresa não encontrada.");

  return {
    companyId,
    isSuperAdmin,
    membershipRole: membershipRole ?? null,
  };
}

/**
 * A tabela legada whatsapp_instances ainda exige um user_id único. Quando o
 * super admin configura um tenant, vinculamos a instância a um administrador
 * real da empresa, e não à conta global da plataforma.
 */
export async function resolveWhatsappInstanceUserId(
  supabase: any,
  currentUserId: string,
  access: CompanyAdminAccess,
): Promise<string> {
  if (!access.isSuperAdmin) return currentUserId;

  const { data, error } = await supabase
    .from("company_user")
    .select("user_id,role,created_at")
    .eq("company_id", access.companyId)
    .eq("ativo", true)
    .in("role", ["owner", "admin"])
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) throw new Error(error.message);

  const members = data ?? [];
  const tenantAdmin = members.find((member: any) => member.role === "owner") ?? members[0];
  if (!tenantAdmin?.user_id) {
    throw new Error(
      "A empresa precisa ter um owner ou administrador ativo antes de conectar o WhatsApp.",
    );
  }
  return tenantAdmin.user_id as string;
}
