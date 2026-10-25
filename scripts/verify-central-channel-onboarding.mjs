// Verificação estática: canal central exclusivo, onboarding pós-compra e IA/créditos.
import { readFileSync, readdirSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const fail = [];
const must = (cond, msg) => cond || fail.push(msg);

const migrations = readdirSync("drizzle/migrations")
  .filter((f) => f.endsWith(".sql"))
  .map((f) => read(`drizzle/migrations/${f}`))
  .join("\n");
must(/active_provider IN \('evolution','meta'\)/.test(migrations), "check do canal ativo ausente");
must(/guard_active_provider_change/.test(migrations), "gatilho que protege o canal ativo ausente");
must(/switch_central_channel[\s\S]*is_super_admin\(\)/.test(migrations), "troca de canal sem exigir superadmin");
must(/source_event_key text NOT NULL UNIQUE/.test(migrations), "idempotência por evento ausente");
must(/purchase_onboarding_code_open_uidx/.test(migrations), "código de ativação sem unicidade");
must(/evolution_purchase_message text/.test(migrations), "mensagem personalizada do QR não persiste");
must(/meta_template_body text/.test(migrations), "corpo personalizado do template Meta não persiste");
for (const t of ["purchase_onboarding", "purchase_onboarding_event", "platform_channel_switch_log", "ai_provider_config"]) {
  must(new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`).test(migrations), `RLS ausente em ${t}`);
  must(!new RegExp(`GRANT[^;]*ON public\\.${t} TO anon`).test(migrations), `${t} não pode ser lida por anônimos`);
}

const webhook = read("src/routes/api/public/support-whatsapp-webhook.ts");
must(/shouldProcessInbound\(channel\.active_provider, "evolution"\)/.test(webhook), "Evolution inativa ainda processa mensagens");
must(/metaActive \? \(value\.messages/.test(webhook), "Meta inativa ainda processa mensagens");
must(/buttonPayload/.test(webhook), "payload do botão Começar não repassado");

const support = read("src/lib/master-whatsapp.server.ts");
must(/active_provider: _ignored/.test(support), "updateSupportChannel pode alterar o canal ativo");

const billing = read("src/routes/api/public/billing/webhook.ts");
must(/topup_plan_credits[\s\S]*startOnboarding\(evt, eventKey, companyId\)/.test(billing), "onboarding deve vir depois dos créditos");
must(/async function startOnboarding[\s\S]*catch/.test(billing), "falha do onboarding pode derrubar a compra");
const stripe = read("src/routes/api/public/stripe-webhook.ts");
must(/customer_details/.test(stripe) && /startStripeOnboarding/.test(stripe), "Stripe sem onboarding");
must(/phone_number_collection\[enabled\]/.test(read("src/lib/stripe.functions.ts")), "checkout Stripe não pede telefone");

const service = read("src/lib/purchase-onboarding.server.ts");
must(/redactSecrets/.test(service), "erros do onboarding sem ocultação de segredos");
must(!/console\.(log|error)\([^)]*code\b/.test(service), "código de ativação em log");
must(/activation_code_hash/.test(service) && !/activation_code:/.test(service), "código salvo em texto puro");
must(
  /if \(!activationPhoneMatches\(row\.buyer_phone_e164, phoneE164\)\)[\s\S]*?return invalidReply;[\s\S]*activation_used_at: nowIso/.test(service),
  "código/token aceito por telefone diferente do comprador (ou consumido antes da checagem)",
);
must(/channelConnected: isActiveChannelConnected\(channel\)/.test(service), "onboarding usa status do canal sem checar o provedor ativo");
must(/template: channel\.evolution_purchase_message/.test(service), "envio real do QR ignora a mensagem configurada no superadmin");
must(
  /channelConnected: rules\.isActiveChannelConnected\(channel\)/.test(read("src/lib/master-onboarding.functions.ts")),
  "simulação usa status do canal sem checar o provedor ativo",
);
const latestRpc = migrations.slice(migrations.lastIndexOf("CREATE OR REPLACE FUNCTION public.switch_central_channel"));
must(/coalesce\(_provider, ''\) <> 'evolution'/.test(latestRpc) && /coalesce\(_status, ''\) <> 'connected'/.test(latestRpc), "RPC ativa Evolution sem provider/status coerentes");
must(/coalesce\(_provider, ''\) <> 'meta'/.test(latestRpc) && /test_ok INTO _meta_ok/.test(latestRpc), "RPC ativa Meta sem provider/status/teste");

const central = read("src/lib/central-finance-whatsapp.server.ts");
must(/tryActivatePurchase/.test(central), "ativação na primeira resposta ausente");

const ai = read("src/lib/ai-config.functions.ts");
must(!/api_key[^\n]*return/.test(ai) && /last4/.test(ai), "chave BYOK pode ser reexibida");
for (const fn of ["getAiOverview", "saveAiMode", "saveByokKey", "testAiProvider"]) {
  must(new RegExp(`${fn} = createServerFn[\\s\\S]*?assertSuperAdmin`).test(ai), `${fn} sem checagem de superadmin`);
}
const onboardingFns = read("src/lib/master-onboarding.functions.ts");
must((onboardingFns.match(/assertSuperAdmin\(context\.supabase\)/g) || []).length >= 10, "funções da fila sem checagem de superadmin");
must(/saveEvolutionPurchaseMessage/.test(onboardingFns), "editor da mensagem QR não tem persistência");
must(/createSuggestedMetaTemplate\(data\.name, data\.language, data\.body\)/.test(onboardingFns), "corpo personalizado não é enviado para aprovação na Meta");

const channelUi = read("src/components/master/central-channel-card.tsx");
must(/Mensagem automática de compra aprovada/.test(channelUi), "canal QR sem explicação da mensagem");
must(/Sugestão pronta/.test(channelUi), "canal Meta sem sugestão de template");

if (fail.length) {
  console.error("✗ verify-central-channel-onboarding\n - " + fail.join("\n - "));
  process.exit(1);
}
console.log("✓ verify-central-channel-onboarding");
