/* eslint-disable @typescript-eslint/no-explicit-any -- provider SDK payloads and auth context are intentionally dynamic */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  INTEGRATION_FIELDS,
  describeIntegration,
  deleteIntegrationValues,
  recordIntegrationTest,
  resolveIntegration,
  saveIntegrationValues,
  type IntegrationProvider,
} from "@/lib/common/integration-secrets.server";

const PROVIDERS: IntegrationProvider[] = ["evolution", "google", "stripe", "infinitepay"];

async function assertSuperAdmin(supabase: any) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error || data !== true) throw new Error("Acesso restrito ao proprietário da instalação.");
}

function currentOrigin() {
  try {
    const req = getRequest();
    const url = new URL(req.url);
    const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
    return `${proto}://${host}`;
  } catch {
    return "";
  }
}

function parseProvider(p: unknown): IntegrationProvider {
  if (!PROVIDERS.includes(p as IntegrationProvider)) throw new Error("Integração inválida.");
  return p as IntegrationProvider;
}

export const getIntegrationsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase);
    const origin = currentOrigin();
    const items = await Promise.all(PROVIDERS.map((p) => describeIntegration(p)));
    let googleConnected = false;
    try {
      const { data } = await context.supabase
        .from("google_integration")
        .select("conectado")
        .eq("conectado", true)
        .limit(1);
      googleConnected = (data ?? []).length > 0;
    } catch {
      googleConnected = false;
    }
    return {
      origin,
      googleCallbackUrl: `${origin}/api/public/google-callback`,
      stripeWebhookUrl: `${origin}/api/public/stripe-webhook`,
      infinitepayWebhookUrl: `${origin}/api/public/billing/infinitepay`,
      infinitepaySuccessUrl: `${origin}/app/sucesso`,
      googleConnected,
      items,
    };
  });

export const saveIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: string; values: Record<string, string> }) => {
    const provider = parseProvider(d?.provider);
    const values: Record<string, string> = {};
    for (const def of INTEGRATION_FIELDS[provider]) {
      const v = String(d?.values?.[def.field] ?? "").trim();
      if (v.length > 4000) throw new Error("Valor muito longo.");
      values[def.field] = v;
    }
    if (provider === "evolution" && values.api_url && !/^https?:\/\/[^\s]+$/i.test(values.api_url))
      throw new Error("Informe a URL completa, começando com https://");
    if (provider === "stripe") {
      if (values.publishable_key && !values.publishable_key.startsWith("pk_"))
        throw new Error("A chave publicável do Stripe começa com pk_.");
      if (values.secret_key && !/^(sk|rk)_/.test(values.secret_key))
        throw new Error("A chave secreta do Stripe começa com sk_ ou rk_.");
      if (values.webhook_secret && !values.webhook_secret.startsWith("whsec_"))
        throw new Error("O segredo do webhook do Stripe começa com whsec_.");
    }
    if (provider === "infinitepay") {
      values.handle = values.handle.replace(/^\$/, "");
      if (values.handle && !/^[a-z0-9._-]{2,80}$/i.test(values.handle))
        throw new Error("A InfiniteTag deve ter só letras, números, ponto, hífen ou _ (sem o $).");
      for (const f of ["checkout_link", "checkout_link_2"])
        if (values[f] && !/^https:\/\/checkout\.infinitepay\.io\/\S+$/.test(values[f]))
          throw new Error("Os links devem começar com https://checkout.infinitepay.io/");
    }
    return { provider, values };
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    await saveIntegrationValues(data.provider, data.values, context.userId);
    const { writeMasterAudit } = await import("@/lib/master/master-audit.server");
    await writeMasterAudit({
      actorId: context.userId,
      action: "integration.save",
      target: data.provider,
      details: { fields: Object.keys(data.values).filter((k) => data.values[k]) },
    });
    return describeIntegration(data.provider);
  });

export const deleteIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: string }) => ({ provider: parseProvider(d?.provider) }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    await deleteIntegrationValues(data.provider);
    const { writeMasterAudit } = await import("@/lib/master/master-audit.server");
    await writeMasterAudit({ actorId: context.userId, action: "integration.delete", target: data.provider });
    return describeIntegration(data.provider);
  });

export const testIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: string }) => ({ provider: parseProvider(d?.provider) }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase);
    const v = await resolveIntegration(data.provider);
    let ok = false;
    let message = "";
    try {
      if (data.provider === "evolution") {
        if (!v.api_url || !v.api_key) throw new Error("Preencha a URL e a API Key.");
        let parsed: URL;
        try {
          parsed = new URL(v.api_url);
          if (!/^https?:$/.test(parsed.protocol)) throw new Error("protocol");
        } catch {
          throw new Error("Informe uma URL válida da Evolution, começando com https://");
        }
        let res: Response | null = null;
        let lastNetworkError: unknown = null;
        // Nunca liste todas as instâncias só para validar a credencial. Em servidores
        // compartilhados essa rota pode devolver uma coleção grande e estourar o
        // timeout, embora a URL e a API Key estejam corretas. O filtro inexistente
        // mantém a autenticação real e transforma o teste em uma consulta leve.
        const probeUrl = `${v.api_url.replace(/\/+$/, "")}/instance/fetchInstances?instanceName=__marcia_credentials_test__`;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            res = await fetch(probeUrl, {
              headers: { apikey: v.api_key },
              signal: AbortSignal.timeout(15_000),
            });
            if (![429, 502, 503, 504].includes(res.status) || attempt === 2) break;
          } catch (error) {
            lastNetworkError = error;
            if (attempt === 2) break;
          }
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        }
        if (!res) {
          const detail =
            lastNetworkError instanceof Error ? lastNetworkError.message : "sem resposta";
          throw new Error(`O servidor Evolution não respondeu (${detail}).`);
        }
        if (res.status === 401 || res.status === 403) throw new Error("A API Key foi recusada.");
        // Algumas versões da Evolution respondem 404 quando a chave foi aceita,
        // mas o nome filtrado não existe. Nesse probe isso confirma a autenticação.
        if (!res.ok && res.status !== 404)
          throw new Error(`O servidor respondeu com erro (${res.status}).`);
        ok = true;
        message = "Servidor do WhatsApp respondeu corretamente.";
      } else if (data.provider === "google") {
        if (!v.client_id || !v.client_secret)
          throw new Error("Preencha o Client ID e o Client Secret.");
        if (!v.client_id.endsWith(".apps.googleusercontent.com"))
          throw new Error("O Client ID deve terminar com .apps.googleusercontent.com");
        // Valida o par sem expor nada: um code inválido retorna invalid_grant
        // quando o cliente existe e invalid_client quando o segredo está errado.
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: v.client_id,
            client_secret: v.client_secret,
            code: "marcia-connection-test",
            grant_type: "authorization_code",
            redirect_uri: `${currentOrigin()}/api/public/google-callback`,
          }),
        });
        const body: any = await res.json().catch(() => ({}));
        if (body?.error === "invalid_client" || body?.error === "unauthorized_client")
          throw new Error("O Google recusou o Client ID ou o Client Secret.");
        ok = true;
        message = "Credenciais reconhecidas pelo Google.";
      } else if (data.provider === "infinitepay") {
        if (!v.handle) throw new Error("Preencha a InfiniteTag.");
        if (!v.checkout_link && !v.checkout_link_2)
          throw new Error("Preencha ao menos um link de checkout.");
        for (const link of [v.checkout_link, v.checkout_link_2].filter(Boolean)) {
          const res = await fetch(link, { redirect: "follow", signal: AbortSignal.timeout(10_000) });
          if (res.status === 404) throw new Error(`A InfinitePay não encontrou o link ${link}`);
          if (!res.ok && res.status >= 500)
            throw new Error(`A InfinitePay respondeu com erro (${res.status}).`);
        }
        ok = true;
        message = "InfiniteTag salva e links de checkout respondendo.";
      } else {
        if (!v.secret_key) throw new Error("Preencha a Secret Key.");
        const res = await fetch("https://api.stripe.com/v1/account", {
          headers: { Authorization: `Bearer ${v.secret_key}` },
        });
        if (res.status === 401) throw new Error("O Stripe recusou a Secret Key.");
        if (!res.ok) throw new Error(`O Stripe respondeu com erro (${res.status}).`);
        if (!v.webhook_secret) {
          message =
            "Chave válida. Falta o segredo do webhook para liberar clientes automaticamente.";
        } else message = "Chave do Stripe válida.";
        ok = true;
      }
    } catch (e) {
      ok = false;
      message = e instanceof Error ? e.message : "Falha no teste.";
    }
    await recordIntegrationTest(data.provider, ok, ok ? null : message);
    return { ok, message };
  });
