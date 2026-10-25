import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPlanUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId?: string }) => {
    const companyId = String(input?.companyId || "").trim();
    if (!companyId) throw new Error("Empresa não informada.");
    return { companyId };
  })
  .handler(async ({ context, data }) => {
    const { requireCompanyMemberAccess } = await import("./company-admin-access.server");
    const { companyId } = await requireCompanyMemberAccess(context.supabase, context.userId, data.companyId);
    const { getCompanyPlanUsage } = await import("./plan-limits.server");
    return getCompanyPlanUsage(companyId);
  });
