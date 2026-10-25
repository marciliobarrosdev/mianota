import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SubscriberSetupProgress = {
  companyId: string;
  services: { total: number; described: number; ready: boolean };
  team: { professionals: number; schedules: number; ready: boolean };
  ai: { ready: boolean };
  whatsapp: { ready: boolean; status: string; number: string | null };
  google: { ready: boolean; email: string | null };
  firstTest: { ready: boolean };
  completedCore: number;
  totalCore: number;
};

function validateInput(input: { companyId?: string }) {
  const companyId = String(input?.companyId || "").trim();
  if (!companyId) throw new Error("Empresa não informada.");
  return { companyId };
}

export const getSubscriberSetupProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateInput)
  .handler(async ({ context, data }): Promise<SubscriberSetupProgress> => {
    const { companyId } = await (
      await import("./company-admin-access.server")
    ).requireCompanyAdminAccess(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      servicesResult,
      professionalsResult,
      schedulesResult,
      aiResult,
      whatsappResult,
      googleResult,
      appointmentResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("marcia_service")
        .select("id,description")
        .eq("company_id", companyId)
        .eq("active", true),
      supabaseAdmin
        .from("marcia_professional")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("active", true),
      supabaseAdmin
        .from("marcia_availability_rule")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("active", true),
      supabaseAdmin
        .from("agent_config")
        .select("sobre_empresa,papel_objetivo")
        .eq("company_id", companyId)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("whatsapp_instances")
        .select("status,numero")
        .eq("company_id", companyId)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("google_integration")
        .select("conectado,email")
        .eq("company_id", companyId)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("marcia_appointment")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId),
    ]);

    const services = servicesResult.error ? [] : servicesResult.data || [];
    const described = services.filter(
      (service) => String(service.description || "").trim().length >= 10,
    ).length;
    const professionals = professionalsResult.error ? 0 : professionalsResult.count || 0;
    const schedules = schedulesResult.error ? 0 : schedulesResult.count || 0;
    const ai = aiResult.error ? null : aiResult.data;
    const whatsapp = whatsappResult.error ? null : whatsappResult.data;
    const google = googleResult.error ? null : googleResult.data;

    const serviceReady = services.length > 0 && described === services.length;
    const teamReady = professionals > 0 && schedules > 0;
    const aiReady = Boolean(
      String(ai?.sobre_empresa || "").trim() && String(ai?.papel_objetivo || "").trim(),
    );
    const whatsappReady = whatsapp?.status === "connected";
    const firstTestReady = !appointmentResult.error && (appointmentResult.count || 0) > 0;
    const completedCore = [
      serviceReady,
      teamReady,
      aiReady,
      whatsappReady,
      firstTestReady,
    ].filter(Boolean).length;

    return {
      companyId,
      services: { total: services.length, described, ready: serviceReady },
      team: { professionals, schedules, ready: teamReady },
      ai: { ready: aiReady },
      whatsapp: {
        ready: whatsappReady,
        status: whatsapp?.status || "disconnected",
        number: whatsapp?.numero || null,
      },
      google: {
        ready: google?.conectado === true,
        email: google?.email || null,
      },
      firstTest: { ready: firstTestReady },
      completedCore,
      totalCore: 5,
    };
  });
