import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function buildOrigin() {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

function validateCompanyScope(data: { companyId?: string }) {
  const companyId = String(data?.companyId || "").trim();
  if (!companyId) throw new Error("Empresa não informada.");
  return { companyId };
}

export const startGoogleOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateCompanyScope)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { requireCompanyAdminAccess } = await import("./company-admin-access.server");
    const access = await requireCompanyAdminAccess(supabase, userId, data.companyId);
    const { companyId } = access;
    const { assertCompanyOperational } = await import("./plan-limits.server");
    await assertCompanyOperational(companyId, { superAdminBypass: access.isSuperAdmin });

    const { resolveIntegration } = await import("./integration-secrets.server");
    const googleCfg = await resolveIntegration("google");
    const clientId = googleCfg.client_id;
    if (!clientId || !googleCfg.client_secret) {
      return {
        ok: false as const,
        error:
          "Google Agenda ainda não configurado. O proprietário deve preenchê-lo em Master → Integrações.",
      };
    }

    const { getCompanyPlan } = await import("@/lib/plan-limits.server");
    const { featuresFor, PLAN_LABEL } = await import("@/lib/plan-features");
    const plan = await getCompanyPlan(companyId);
    if (!featuresFor(plan.slug).googleCalendar) {
      return {
        ok: false as const,
        error: `Google Agenda não está incluso no plano ${PLAN_LABEL[plan.slug]}. Faça upgrade para Pro.`,
      };
    }

    const origin = await buildOrigin();
    const redirectUri = `${origin}/api/public/google-callback`;
    const [{ generateOAuthStateToken }, { hashGoogleOAuthState }] = await Promise.all([
      import("@/lib/secure-random.server"),
      import("@/lib/google.server"),
    ]);
    const state = generateOAuthStateToken();
    const { error: stateError } = await (supabase as any).rpc("marcia_issue_google_oauth_state", {
      _company_id: companyId,
      _state_hash: hashGoogleOAuthState(state),
      _redirect_uri: redirectUri,
      _ttl_seconds: 600,
    });
    if (stateError) {
      throw new Error(
        `Não foi possível iniciar a conexão segura com o Google: ${stateError.message}`,
      );
    }
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.events.freebusy https://www.googleapis.com/auth/userinfo.email",
    );
    url.searchParams.set("state", state);
    return { ok: true as const, url: url.toString() };
  });

export const disconnectGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateCompanyScope)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { requireCompanyAdminAccess } = await import("./company-admin-access.server");
    const { companyId } = await requireCompanyAdminAccess(supabase, userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("marcia_disconnect_google", {
      p_company_id: companyId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const syncMarciaAppointmentToGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId?: string; appointmentId?: string }) => {
    const companyId = String(input?.companyId || "").trim();
    const appointmentId = String(input?.appointmentId || "").trim();
    if (!companyId || !appointmentId) throw new Error("Agendamento não informado.");
    return { companyId, appointmentId };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { requireCompanyMemberAccess } = await import("./company-admin-access.server");
    const access = await requireCompanyMemberAccess(supabase, userId, data.companyId);
    const { companyId } = access;
    const { assertCompanyOperational, assertCompanyPlanFeature } =
      await import("./plan-limits.server");
    await assertCompanyOperational(companyId, { superAdminBypass: access.isSuperAdmin });
    await assertCompanyPlanFeature(companyId, "googleCalendar", "Google Agenda exige o plano Pro.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("google_integration")
      .select("conectado")
      .eq("company_id", companyId)
      .maybeSingle();
    if (integrationError) throw new Error(integrationError.message);
    if (!integration?.conectado) return { ok: true as const, skipped: true as const };

    const { data: appointment, error } = await supabaseAdmin
      .from("marcia_appointment")
      .select(
        "id,title,starts_at,ends_at,status,notes,marcia_customer(name),marcia_professional(name),marcia_service(name)",
      )
      .eq("company_id", companyId)
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!appointment) throw new Error("Agendamento não encontrado.");

    const google = await import("./google.server");
    if (["cancelled", "no_show"].includes(appointment.status)) {
      await google.deleteCalendarEventForCompany(supabaseAdmin, companyId, appointment.id);
      return { ok: true as const, skipped: false as const, deleted: true as const };
    }

    const customer = Array.isArray(appointment.marcia_customer)
      ? appointment.marcia_customer[0]
      : appointment.marcia_customer;
    const professional = Array.isArray(appointment.marcia_professional)
      ? appointment.marcia_professional[0]
      : appointment.marcia_professional;
    const service = Array.isArray(appointment.marcia_service)
      ? appointment.marcia_service[0]
      : appointment.marcia_service;
    const detail = [
      customer?.name ? `Cliente: ${customer.name}` : null,
      service?.name ? `Serviço: ${service.name}` : null,
      professional?.name ? `Profissional: ${professional.name}` : null,
      appointment.notes || null,
    ]
      .filter(Boolean)
      .join("\n");

    const result = await google.createCalendarEventForCompany(supabaseAdmin, companyId, {
      appointmentId: appointment.id,
      titulo: appointment.title,
      inicio: appointment.starts_at,
      fim: appointment.ends_at,
      descricao: detail,
    });
    return { ok: true as const, skipped: false as const, eventId: result.eventId };
  });
