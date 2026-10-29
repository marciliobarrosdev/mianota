import { createFileRoute } from "@tanstack/react-router";
import { normalize } from "@/lib/billing/normalize";
import { applyEvent, getAdmin } from "@/lib/billing/apply.server";
import { createHash } from "node:crypto";

type Provider = "kiwify" | "cakto" | "perfectpay";

function tokenEnv(provider: Provider): string {
  return provider === "kiwify"
    ? "KIWIFY_WEBHOOK_TOKEN"
    : provider === "cakto"
      ? "CAKTO_WEBHOOK_TOKEN"
      : "PERFECTPAY_WEBHOOK_TOKEN";
}

export const Route = createFileRoute("/api/public/billing/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const provider = (url.searchParams.get("provider") || "") as Provider;
        if (!["kiwify", "cakto", "perfectpay"].includes(provider)) {
          return new Response("provider inválido", { status: 400 });
        }

        let body: any = {};
        try {
          body = await request.json();
        } catch {
          // Alguns provedores enviam form-encoded
          try {
            const form = await request.formData();
            body = Object.fromEntries(form.entries());
          } catch {
            body = {};
          }
        }

        const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
        const token =
          request.headers.get("x-webhook-token") ||
          bearer ||
          (typeof body?.token === "string" ? body.token : "") ||
          (typeof body?.webhook_token === "string" ? body.webhook_token : "");
        const expected = process.env[tokenEnv(provider)];
        if (!expected || token !== expected) {
          return new Response("token inválido", { status: 401 });
        }

        try {
          const evt = normalize(provider, body);
          const eventKey = createHash("sha256")
            .update(`${provider}:${JSON.stringify(body)}`)
            .digest("hex");
          const result = await applyEvent(evt, eventKey);
          return Response.json({ ok: true, duplicate: result.duplicate });
        } catch (e: any) {
          console.error("[billing.webhook]", provider, e);
          try {
            const admin = await getAdmin();
            await admin.from("billing_event_log").insert({
              provider,
              event_type: "error",
              payload: body,
              error: String(e?.message || e),
            });
          } catch (logError) {
            console.error("[billing.webhook.log]", logError);
          }
          return Response.json({ ok: false, error: String(e?.message || e) }, { status: 200 });
        }
      },
    },
  },
});
