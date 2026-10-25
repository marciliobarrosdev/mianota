import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getOwnedCompanyId(
  supabase: any,
  userId: string,
): Promise<{ companyId: string; role: string }> {
  const { assertUserPasswordReady } = await import("./company-admin-access.server");
  await assertUserPasswordReady(supabase);
  const { data, error } = await supabase
    .from("company_user")
    .select("company_id, role, forcar_troca_senha")
    .eq("user_id", userId)
    .eq("ativo", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Sem empresa.");
  if (data.forcar_troca_senha) {
    throw new Error("Troque a senha temporária antes de gerenciar a equipe.");
  }
  return { companyId: data.company_id as string, role: data.role as string };
}

function assertAdmin(role: string) {
  if (role !== "owner" && role !== "admin") {
    throw new Error("Apenas owner/admin podem gerenciar a equipe.");
  }
}

export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { companyId } = await getOwnedCompanyId(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: members, error } = await supabaseAdmin
      .from("company_user")
      .select("id, user_id, role, ativo, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const ids = (members ?? []).map((m: any) => m.user_id);
    let profilesById = new Map<string, { email: string | null; nome: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, nome")
        .in("user_id", ids);
      (profs ?? []).forEach((p: any) =>
        profilesById.set(p.user_id, { email: p.email, nome: p.nome }),
      );
    }
    return {
      members: (members ?? []).map((m: any) => ({
        ...m,
        email: profilesById.get(m.user_id)?.email ?? null,
        nome: profilesById.get(m.user_id)?.nome ?? null,
      })),
    };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; role: "admin" | "atendente" }) => {
    const email = String(d.email || "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email inválido");
    if (d.role !== "admin" && d.role !== "atendente") throw new Error("Role inválida");
    return { email, role: d.role };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { companyId, role } = await getOwnedCompanyId(supabase, userId);
    assertAdmin(role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    // Resolve direto em auth.users: o profile pode ter falhado numa tentativa
    // anterior, mas a conta criada nunca deve ficar impossível de recuperar.
    let targetUserId: string | null = null;
    const { data: existingAuthUserId, error: authLookupError } = await admin.rpc(
      "marcia_find_auth_user_by_email",
      { _email: data.email },
    );
    if (authLookupError) {
      throw new Error(`Não foi possível verificar a conta convidada: ${authLookupError.message}`);
    }
    if (existingAuthUserId) targetUserId = String(existingAuthUserId);

    let recovery: {
      id: string;
      status: "pending" | "linked";
      auth_created_here: boolean;
    } | null = null;
    if (targetUserId) {
      const { data: pending, error: pendingError } = await admin
        .from("team_invite_provision")
        .select("id,status,auth_created_here")
        .eq("company_id", companyId)
        .eq("email", data.email)
        .eq("user_id", targetUserId)
        .maybeSingle();
      if (pendingError) {
        throw new Error(`Não foi possível recuperar o convite anterior: ${pendingError.message}`);
      }
      recovery = pending;
    }

    let tempPassword: string | null = null;
    let createdHere = false;
    if (!targetUserId) {
      const { generateTemporaryPassword } = await import("./secure-random.server");
      tempPassword = generateTemporaryPassword();
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
      });
      if (created.user) {
        targetUserId = created.user.id;
        createdHere = true;
      } else {
        // createUser can lose its response after Auth committed. Reconcile by
        // email and preserve the account instead of attempting destructive cleanup.
        const { data: reconciledUserId, error: reconcileError } = await admin.rpc(
          "marcia_find_auth_user_by_email",
          { _email: data.email },
        );
        if (reconcileError || !reconciledUserId) {
          throw new Error(cErr?.message || "Falha ao criar usuário convidado");
        }
        targetUserId = String(reconciledUserId);
        tempPassword = null;
      }

      const { data: journal, error: journalError } = await admin
        .from("team_invite_provision")
        .upsert(
          {
            company_id: companyId,
            email: data.email,
            user_id: targetUserId,
            created_by: userId,
            auth_created_here: createdHere,
            status: "pending",
            last_error: cErr?.message || null,
            linked_at: null,
          },
          { onConflict: "company_id,email" },
        )
        .select("id,status,auth_created_here")
        .single();
      if (journalError || !journal) {
        throw new Error(
          "A conta de acesso foi preservada, mas o convite não pôde ser registrado. Tente novamente; se ela já existir, use ‘Esqueci minha senha’.",
        );
      }
      recovery = journal;
    } else if (recovery?.status === "pending" && recovery.auth_created_here) {
      // A primeira tentativa criou a conta mas não concluiu o vínculo. Somente
      // uma conta ainda sem qualquer empresa recebe uma nova senha temporária.
      const { count, error: membershipCountError } = await admin
        .from("company_user")
        .select("id", { count: "exact", head: true })
        .eq("user_id", targetUserId)
        .eq("ativo", true);
      if (membershipCountError) {
        throw new Error(`Não foi possível recuperar o convite: ${membershipCountError.message}`);
      }
      if ((count ?? 0) === 0) {
        const { generateTemporaryPassword } = await import("./secure-random.server");
        tempPassword = generateTemporaryPassword();
        const { error: credentialError } = await supabaseAdmin.auth.admin.updateUserById(
          targetUserId,
          { password: tempPassword, email_confirm: true },
        );
        if (credentialError) {
          await admin
            .from("team_invite_provision")
            .update({ last_error: credentialError.message })
            .eq("id", recovery.id);
          throw new Error(
            "A conta criada anteriormente foi preservada, mas a credencial não pôde ser recuperada. Tente novamente ou use ‘Esqueci minha senha’.",
          );
        }
      }
    }

    const { error: profileError } = await admin
      .from("profiles")
      .upsert({ user_id: targetUserId, email: data.email });
    if (profileError) {
      if (recovery) {
        await admin
          .from("team_invite_provision")
          .update({ last_error: profileError.message })
          .eq("id", recovery.id);
      }
      throw new Error(
        `A conta foi preservada, mas o perfil do convite não pôde ser salvo. Tente novamente: ${profileError.message}`,
      );
    }

    // Usa a sessão autenticada (nunca service_role) para o banco validar o ator
    // real. O banco também valida o plano sob lock, impedindo dois convites
    // concorrentes de ultrapassarem o limite de usuários.
    const { error: linkErr } = await supabase.rpc("upsert_company_member_secure", {
      _company_id: companyId,
      _target_user_id: targetUserId,
      _role: data.role,
      _force_password_change: !!tempPassword,
    });
    if (linkErr) {
      if (recovery) {
        await admin
          .from("team_invite_provision")
          .update({ last_error: linkErr.message })
          .eq("id", recovery.id);
        throw new Error(
          `A conta foi criada e preservada, mas o vínculo não foi concluído: ${linkErr.message}. Corrija a causa e repita o convite.`,
        );
      }
      throw linkErr;
    }

    let warning: string | null = null;
    if (recovery) {
      const { error: journalError } = await admin
        .from("team_invite_provision")
        .update({ status: "linked", linked_at: new Date().toISOString(), last_error: null })
        .eq("id", recovery.id);
      if (journalError) {
        warning =
          "Membro vinculado, mas o registro de recuperação não pôde ser finalizado. A conta e o acesso foram preservados.";
      }
    }
    return { ok: true, tempPassword, warning };
  });

export const setMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { memberId: string; ativo: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { companyId, role } = await getOwnedCompanyId(supabase, userId);
    assertAdmin(role);
    const { error } = await supabase.rpc("set_company_member_active_secure", {
      _company_id: companyId,
      _membership_id: data.memberId,
      _target_active: data.ativo,
    });
    if (error) throw error;
    return { ok: true };
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { memberId: string; role: "owner" | "admin" | "atendente" }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { companyId, role } = await getOwnedCompanyId(supabase, userId);
    if (role !== "owner") throw new Error("Apenas o owner pode alterar papéis.");
    const { error } = await supabase.rpc("set_company_member_role_secure", {
      _company_id: companyId,
      _membership_id: data.memberId,
      _target_role: data.role,
    });
    if (error) throw error;
    return { ok: true };
  });
