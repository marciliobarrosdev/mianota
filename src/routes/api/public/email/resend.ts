import { createFileRoute } from "@tanstack/react-router";
import { mapResendEvent, verifySvix } from "@/lib/email/resend-webhook-rules";

export const Route = createFileRoute("/api/public/email/resend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["RESEND_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 503 });
        const body = await request.text();
        const id = request.headers.get("svix-id");
        const ok = await verifySvix({
          secret,
          id,
          timestamp: request.headers.get("svix-timestamp"),
          signature: request.headers.get("svix-signature"),
          body,
        });
        if (!ok) return new Response("Invalid signature", { status: 401 });
        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await (supabaseAdmin as any)
          .from("email_event")
          .upsert({ svix_id: id, ...mapResendEvent(payload), payload }, { onConflict: "svix_id", ignoreDuplicates: true });
        if (error) {
          console.error("[resend-webhook]", id, error.message);
          return new Response("Store failed", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});
