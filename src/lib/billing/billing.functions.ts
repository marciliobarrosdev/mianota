import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSuperAdmin } from "@/lib/master/master-guards";

export const getBillingWebhookInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    return {
      kiwify: !!process.env.KIWIFY_WEBHOOK_TOKEN,
      cakto: !!process.env.CAKTO_WEBHOOK_TOKEN,
      perfectpay: !!process.env.PERFECTPAY_WEBHOOK_TOKEN,
    };
  });

export const listRecentBillingEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("billing_event_log")
      .select("id, provider, event_type, buyer_email, processed, error, matched_company_id, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
