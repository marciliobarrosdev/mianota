/* eslint-disable @typescript-eslint/no-explicit-any */
// Credenciais globais da instalação, salvas pelo super admin no painel Master.
// Criptografia AES-256-GCM com chave derivada (HKDF-SHA256) de material privado
// do servidor exclusivo deste clone. Valores nunca voltam ao navegador.

export type IntegrationProvider =
  | "evolution"
  | "google"
  | "stripe"
  | "whatsapp_meta"
  | "ai_openai"
  | "ai_anthropic";

export const INTEGRATION_FIELDS: Record<
  IntegrationProvider,
  { field: string; env: string; secret: boolean }[]
> = {
  evolution: [
    { field: "api_url", env: "EVOLUTION_API_URL", secret: false },
    { field: "api_key", env: "EVOLUTION_API_KEY", secret: true },
  ],
  google: [
    { field: "client_id", env: "GOOGLE_CLIENT_ID", secret: false },
    { field: "client_secret", env: "GOOGLE_CLIENT_SECRET", secret: true },
  ],
  stripe: [
    { field: "publishable_key", env: "STRIPE_PUBLISHABLE_KEY", secret: false },
    { field: "secret_key", env: "STRIPE_SECRET_KEY", secret: true },
    { field: "webhook_secret", env: "STRIPE_WEBHOOK_SECRET", secret: true },
  ],
  whatsapp_meta: [
    { field: "waba_id", env: "WHATSAPP_META_WABA_ID", secret: false },
    { field: "phone_number_id", env: "WHATSAPP_META_PHONE_NUMBER_ID", secret: false },
    { field: "access_token", env: "WHATSAPP_META_ACCESS_TOKEN", secret: true },
    { field: "app_secret", env: "WHATSAPP_META_APP_SECRET", secret: true },
    { field: "api_version", env: "WHATSAPP_META_API_VERSION", secret: false },
  ],
  // BYOK opcional (um único provedor ativo por vez em ai_provider_config).
  ai_openai: [{ field: "api_key", env: "MARCIA_BYOK_OPENAI_API_KEY", secret: true }],
  ai_anthropic: [{ field: "api_key", env: "MARCIA_BYOK_ANTHROPIC_API_KEY", secret: true }],
};

const PLACEHOLDER_VALUE =
  /^(?:placeholder(?:_value_to_be_replaced)?|replace(?:_me|d)?|change(?:_me)?|your[_-].+|example)$/i;

export function usableIntegrationValue(value: unknown): string {
  const normalized = String(value ?? "").trim();
  if (!normalized || PLACEHOLDER_VALUE.test(normalized)) return "";
  return normalized;
}

const SALT = "marcia:platform-integration-secrets:v1";
let keyPromise: Promise<CryptoKey> | null = null;
let keyMaterialCache = "";

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(): Promise<CryptoKey> {
  const material = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!material) throw new Error("Armazenamento seguro indisponível neste ambiente.");
  if (keyPromise && keyMaterialCache === material) return keyPromise;
  keyMaterialCache = material;
  keyPromise = (async () => {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey("raw", enc.encode(material), "HKDF", false, [
      "deriveKey",
    ]);
    return crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: enc.encode(SALT), info: enc.encode("aes-256-gcm") },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  })();
  return keyPromise;
}

async function encrypt(value: string, aad: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aad) },
    await getKey(),
    new TextEncoder().encode(value),
  );
  return { ciphertext: b64(new Uint8Array(ct)), iv: b64(iv) };
}

async function decrypt(ciphertext: string, iv: string, aad: string): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(iv), additionalData: new TextEncoder().encode(aad) },
    await getKey(),
    unb64(ciphertext),
  );
  return new TextDecoder().decode(pt);
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Valores em texto puro — uso exclusivo no servidor. Painel tem prioridade; env é fallback. */
export async function resolveIntegration(
  provider: IntegrationProvider,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  let rows: any[] = [];
  try {
    const { data } = await (
      await admin()
    )
      .from("platform_integration_secret")
      .select("field,ciphertext,iv")
      .eq("provider", provider);
    rows = data ?? [];
  } catch {
    rows = [];
  }
  for (const def of INTEGRATION_FIELDS[provider]) {
    const row = rows.find((r) => r.field === def.field);
    let value = "";
    if (row) {
      try {
        value = await decrypt(row.ciphertext, row.iv, `${provider}:${def.field}`);
      } catch {
        console.error(`[integrations] falha ao ler ${provider}.${def.field}`);
      }
    }
    if (!value) value = usableIntegrationValue(process.env[def.env]);
    out[def.field] = usableIntegrationValue(value);
  }
  return out;
}

export async function describeIntegration(provider: IntegrationProvider) {
  const db = await admin();
  const [{ data: rows }, { data: status }, resolved] = await Promise.all([
    db
      .from("platform_integration_secret")
      .select("field,last4,updated_at")
      .eq("provider", provider),
    db.from("platform_integration_status").select("*").eq("provider", provider).maybeSingle(),
    resolveIntegration(provider),
  ]);
  const fields = INTEGRATION_FIELDS[provider].map((def) => {
    const row = (rows ?? []).find((r: any) => r.field === def.field);
    const fromEnv = !row && Boolean(usableIntegrationValue(process.env[def.env]));
    return {
      field: def.field,
      // Uma linha antiga pode conter PLACEHOLDER_VALUE_TO_BE_REPLACED. A mera
      // existência da linha não significa que o servidor esteja configurado.
      configured: Boolean(usableIntegrationValue(resolved[def.field])),
      source: row ? "panel" : fromEnv ? "fallback" : null,
      last4: row?.last4 ?? null,
    };
  });
  return {
    provider,
    fields,
    configured: fields.every((f) => f.configured),
    testedAt: status?.tested_at ?? null,
    testOk: status?.test_ok ?? null,
    lastError: status?.last_error ?? null,
  };
}

export async function saveIntegrationValues(
  provider: IntegrationProvider,
  values: Record<string, string>,
  userId: string,
) {
  const db = await admin();
  for (const def of INTEGRATION_FIELDS[provider]) {
    const raw = usableIntegrationValue(values[def.field]);
    if (String(values[def.field] ?? "").trim() && !raw) {
      throw new Error("Substitua os valores de exemplo pelas credenciais reais antes de salvar.");
    }
    if (!raw) continue; // campo em branco mantém o valor salvo
    const { ciphertext, iv } = await encrypt(raw, `${provider}:${def.field}`);
    const { error } = await db.from("platform_integration_secret").upsert(
      {
        provider,
        field: def.field,
        ciphertext,
        iv,
        last4: def.secret ? raw.slice(-4) : raw.length > 48 ? `…${raw.slice(-24)}` : raw,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,field" },
    );
    if (error) throw new Error("Não foi possível salvar a credencial com segurança.");
  }
  await db.from("platform_integration_status").upsert(
    {
      provider,
      tested_at: null,
      test_ok: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" },
  );
}

export async function deleteIntegrationValues(provider: IntegrationProvider) {
  const db = await admin();
  await db.from("platform_integration_secret").delete().eq("provider", provider);
  await db.from("platform_integration_status").delete().eq("provider", provider);
}

export async function recordIntegrationTest(
  provider: IntegrationProvider,
  ok: boolean,
  error: string | null,
) {
  const db = await admin();
  await db.from("platform_integration_status").upsert(
    {
      provider,
      tested_at: new Date().toISOString(),
      test_ok: ok,
      last_error: error,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" },
  );
}
