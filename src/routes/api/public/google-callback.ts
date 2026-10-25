import { createFileRoute } from "@tanstack/react-router";
import { hashGoogleOAuthState, syncGoogleBusyBlocks } from "@/lib/google.server";

export const Route = createFileRoute("/api/public/google-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!state) return new Response("missing state", { status: 400 });

        const { resolveIntegration } = await import("@/lib/integration-secrets.server");
        const googleCfg = await resolveIntegration("google");
        const clientId = googleCfg.client_id;
        const clientSecret = googleCfg.client_secret;
        if (!clientId || !clientSecret)
          return new Response("oauth not configured", { status: 500 });

        const redirectUri = `${url.protocol}//${url.host}/api/public/google-callback`;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: consumedState, error: consumeError } = await (supabaseAdmin as any).rpc(
          "marcia_consume_google_oauth_state",
          {
            _state_hash: hashGoogleOAuthState(state),
            _redirect_uri: redirectUri,
          },
        );
        const companyId = String(consumedState?.companyId || "");
        if (consumeError || !companyId) {
          return new Response("invalid or expired state", { status: 400 });
        }
        // A denial also consumes the state, so a later callback cannot replay it.
        if (!code) return new Response("authorization not completed", { status: 400 });

        const tokRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });
        const tok = await tokRes.json();
        if (!tok.access_token) {
          return new Response("token exchange failed", { status: 400 });
        }

        // Get email
        let email: string | null = null;
        try {
          const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tok.access_token}` },
          });
          const info = await infoRes.json();
          email = info?.email ?? null;
        } catch {
          email = null;
        }

        const { data: existingIntegration, error: existingError } = await supabaseAdmin
          .from("google_integration")
          .select("refresh_token")
          .eq("company_id", companyId)
          .maybeSingle();
        if (existingError) return new Response("integration lookup failed", { status: 500 });
        const { error: persistError } = await supabaseAdmin.from("google_integration").upsert(
          {
            company_id: companyId,
            email,
            access_token: tok.access_token,
            refresh_token: tok.refresh_token ?? existingIntegration?.refresh_token ?? null,
            expiry: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
            calendar_id: "primary",
            conectado: true,
          },
          { onConflict: "company_id" },
        );
        if (persistError) {
          console.error("[google.persist]", persistError.message);
          return new Response("integration persistence failed", { status: 500 });
        }
        let syncMessage = "Agenda externa sincronizada.";
        try {
          const result = await syncGoogleBusyBlocks(supabaseAdmin, companyId);
          syncMessage = `${result.synced} intervalo(s) ocupado(s) importado(s).`;
        } catch (error: any) {
          console.error("[google.initial-sync]", error?.message);
          syncMessage = "Conta conectada; a sincronização inicial será tentada novamente.";
        }

        const safeEmail = String(email || "").replace(
          /[&<>"']/g,
          (char) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char,
        );

        return new Response(
          `<!doctype html><meta charset="utf-8"><title>Google conectado</title>
<body style="font-family:system-ui;background:#f7f4ff;color:#26143f;display:grid;place-items:center;min-height:100vh;margin:0">
<div style="text-align:center;padding:24px">
<h1>Google Agenda conectado${safeEmail ? ` (${safeEmail})` : ""}</h1>
<p>${syncMessage} Pode fechar esta aba.</p>
<script>setTimeout(()=>{window.close();location.href="/app/integracoes"},1800)</script>
</div></body>`,
          { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      },
    },
  },
});
