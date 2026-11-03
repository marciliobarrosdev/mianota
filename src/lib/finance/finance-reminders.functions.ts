import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const syncFinanceReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => {
    const companyId = String(input?.companyId || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(companyId)) throw new Error("Empresa inválida.");
    return { companyId };
  })
  .handler(async ({ context, data }) => {
    const { requireCompanyMemberAccess } = await import("@/lib/common/company-admin-access.server");
    await requireCompanyMemberAccess(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runAllForUser } = await import("@/lib/finance/notification-jobs.server");
    const created = await runAllForUser(supabaseAdmin, data.companyId, context.userId);
    return { created, checkedAt: new Date().toISOString() };
  });
