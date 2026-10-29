import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({ notificationId: z.string().uuid() });

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/push/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-push-token") || "";
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!token || !parsed.success) return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = supabaseAdmin as any;
        const { data: secret } = await admin.from("push_dispatch_secret").select("token").eq("id", true).maybeSingle();
        if (!secret?.token || !safeEqual(token, secret.token)) return new Response("Unauthorized", { status: 401 });

        const { data: n } = await admin
          .from("marcia_notification")
          .select("id,company_id,recipient_user_id,title,body,type,entity_type,data")
          .eq("id", parsed.data.notificationId)
          .maybeSingle();
        if (!n) return new Response("Not found", { status: 404 });

        const { data: pref } = await admin
          .from("notification_preference")
          .select("push_categories,quiet_start,quiet_end,reminder_lead_days,daily_summary,whatsapp_enabled,whatsapp_categories")
          .eq("user_id", n.recipient_user_id)
          .maybeSingle();
        const { shouldSendPush } = await import("@/lib/notification-rules");
        const hour = Number(
          new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hourCycle: "h23" }).format(new Date()),
        );
        const { dispatchNotificationWhatsapp } = await import("@/lib/notification-whatsapp.server");
        const whatsapp = await dispatchNotificationWhatsapp(admin, n, pref, hour).catch(() => "error");
        if (!shouldSendPush(n, pref, hour)) return Response.json({ sent: 0, skipped: "preference", whatsapp });

        const { sendPushToUser } = await import("@/lib/web-push.server");
        const result = await sendPushToUser(admin, n.company_id, n.recipient_user_id, {
          title: n.title,
          body: n.body,
          url: (await import("@/lib/notification-rules")).notificationTarget(n),
          tag: n.id,
          notificationId: n.id,
        });
        return Response.json({ ...result, whatsapp });
      },
    },
  },
});
