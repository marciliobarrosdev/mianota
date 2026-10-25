import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const lovableEnv = readFileSync(new URL("../.env", import.meta.url), "utf8");
const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");

const migration = readFileSync(
  new URL("../supabase/migrations/20261009121000_clone_ownership_hardening.sql", import.meta.url),
  "utf8",
);
const brandStorageMigration = readFileSync(
  new URL("../supabase/migrations/20261009123000_clone_brand_storage.sql", import.meta.url),
  "utf8",
);
const teamMembershipMigration = readFileSync(
  new URL(
    "../supabase/migrations/20261009130000_oauth_membership_recovery_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);
const runtimePermissionMigration = readFileSync(
  new URL(
    "../supabase/migrations/20261009210000_clone_runtime_permission_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);
const assistantRebrandMigration = readFileSync(
  new URL("../supabase/migrations/20261009125000_clone_assistant_rebrand.sql", import.meta.url),
  "utf8",
);
const bootstrapClient = readFileSync(
  new URL("../src/lib/remix-bootstrap.ts", import.meta.url),
  "utf8",
);
const secretStore = readFileSync(
  new URL("../src/lib/integration-secrets.server.ts", import.meta.url),
  "utf8",
);
const platformIntegrations = readFileSync(
  new URL("../src/lib/integrations.functions.ts", import.meta.url),
  "utf8",
);
const stripeWebhook = readFileSync(
  new URL("../src/routes/api/public/stripe-webhook.ts", import.meta.url),
  "utf8",
);
const ownerMigration = readFileSync(
  new URL("../drizzle/migrations/0000_auto_owner_and_secure_integrations.sql", import.meta.url),
  "utf8",
);
const loginRoute = readFileSync(new URL("../src/routes/entrar.tsx", import.meta.url), "utf8");
const appRoute = readFileSync(new URL("../src/routes/app.tsx", import.meta.url), "utf8");
const integrationsRoute = readFileSync(
  new URL("../src/routes/app/integracoes.tsx", import.meta.url),
  "utf8",
);
const integrationReadiness = readFileSync(
  new URL("../src/lib/integration-readiness.functions.ts", import.meta.url),
  "utf8",
);
const checkoutServer = readFileSync(
  new URL("../src/lib/checkout.functions.ts", import.meta.url),
  "utf8",
);
const masterServer = readFileSync(
  new URL("../src/lib/master.functions.ts", import.meta.url),
  "utf8",
);
const teamServer = readFileSync(new URL("../src/lib/team.functions.ts", import.meta.url), "utf8");
const evolutionServer = readFileSync(
  new URL("../src/lib/evolution.functions.ts", import.meta.url),
  "utf8",
);
const csatServer = readFileSync(new URL("../src/lib/csat.functions.ts", import.meta.url), "utf8");
const creditsServer = readFileSync(
  new URL("../src/lib/credits.functions.ts", import.meta.url),
  "utf8",
);
const agentAiServer = readFileSync(
  new URL("../src/lib/agent-ai.functions.ts", import.meta.url),
  "utf8",
);
const agentRoute = readFileSync(new URL("../src/routes/app/agente.tsx", import.meta.url), "utf8");
const securityServer = readFileSync(
  new URL("../src/lib/security.functions.ts", import.meta.url),
  "utf8",
);
const companyAccessServer = readFileSync(
  new URL("../src/lib/company-admin-access.server.ts", import.meta.url),
  "utf8",
);
const planLimitsServer = readFileSync(
  new URL("../src/lib/plan-limits.server.ts", import.meta.url),
  "utf8",
);
const googleServer = readFileSync(new URL("../src/lib/google.server.ts", import.meta.url), "utf8");
const googleFunctions = readFileSync(
  new URL("../src/lib/google.functions.ts", import.meta.url),
  "utf8",
);
const googleCallback = readFileSync(
  new URL("../src/routes/api/public/google-callback.ts", import.meta.url),
  "utf8",
);
const billingWebhook = readFileSync(
  new URL("../src/routes/api/public/billing/webhook.ts", import.meta.url),
  "utf8",
);
const whatsappWebhook = readFileSync(
  new URL("../src/routes/api/public/whatsapp-webhook.ts", import.meta.url),
  "utf8",
);
const financeWhatsappServer = readFileSync(
  new URL("../src/lib/finance-whatsapp.server.ts", import.meta.url),
  "utf8",
);
const brandUploader = readFileSync(
  new URL("../src/components/brand-asset-uploader.tsx", import.meta.url),
  "utf8",
);
const dynamicManifest = readFileSync(
  new URL("../src/routes/api/manifest[.]webmanifest.ts", import.meta.url),
  "utf8",
);
const publicBrandAssetRoute = readFileSync(
  new URL("../src/routes/api/public/brand-asset.ts", import.meta.url),
  "utf8",
);
const secureRandomServer = readFileSync(
  new URL("../src/lib/secure-random.server.ts", import.meta.url),
  "utf8",
);
const brandConfig = readFileSync(new URL("../src/config/brand.ts", import.meta.url), "utf8");
const aiPrompt = readFileSync(new URL("../src/lib/ai-prompt.ts", import.meta.url), "utf8");
const brandStorageServer = readFileSync(
  new URL("../src/lib/brand-storage.functions.ts", import.meta.url),
  "utf8",
);

function mustContain(source, fragment, message) {
  assert.ok(source.includes(fragment), message);
}

const lovableEnvNames = lovableEnv
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => line.split("=", 1)[0])
  .sort();

const lovableEnvValues = Object.fromEntries(
  lovableEnv
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      const name = line.slice(0, separator);
      const raw = line.slice(separator + 1);
      return [name, raw.replace(/^"|"$/gu, "")];
    }),
);

assert.deepEqual(
  lovableEnvNames,
  [
    "SUPABASE_PROJECT_ID",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_URL",
    "VITE_SUPABASE_PROJECT_ID",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_URL",
  ],
  "the committed Lovable .env must contain only the six generated public Cloud bindings",
);
for (const name of lovableEnvNames) {
  assert.match(
    lovableEnv,
    new RegExp(`^${name}=[^\\r\\n]+$`, "mu"),
    `${name} must be populated so Lovable can rewrite it for each Remix`,
  );
}
for (const suffix of ["PROJECT_ID", "PUBLISHABLE_KEY", "URL"]) {
  assert.equal(
    lovableEnvValues[`SUPABASE_${suffix}`],
    lovableEnvValues[`VITE_SUPABASE_${suffix}`],
    `runtime and browser ${suffix} must point to the same Lovable Cloud backend`,
  );
}
assert.match(
  lovableEnvValues.SUPABASE_PUBLISHABLE_KEY,
  /^sb_publishable_[A-Za-z0-9_-]+$/u,
  "the committed Cloud key must be publishable, never a secret or service-role key",
);
assert.equal(
  lovableEnvValues.SUPABASE_URL,
  `https://${lovableEnvValues.SUPABASE_PROJECT_ID}.supabase.co`,
  "the committed Cloud URL and project id must describe the same backend",
);
mustContain(gitignore, "!.env", "Lovable requires the generated public .env to be versioned");
assert.ok(
  !/^SUPABASE_(?!PROJECT_ID|PUBLISHABLE_KEY|URL)/mu.test(lovableEnv) &&
    !/sb_secret_|service[_-]?role|password|private[_-]?key|token/iu.test(lovableEnv),
  "private Supabase bindings and secrets must not be committed to .env",
);

for (const signature of [
  "public.is_super_admin()",
  "public.has_company_access(uuid)",
  "public.current_company_id()",
  "public.has_company_role(uuid, text[])",
]) {
  mustContain(
    runtimePermissionMigration,
    `GRANT EXECUTE ON FUNCTION ${signature} TO authenticated, service_role`,
    `RLS helper must remain executable after historical revokes: ${signature}`,
  );
}
mustContain(
  runtimePermissionMigration,
  "REVOKE INSERT, UPDATE, DELETE ON TABLE public.company_user FROM authenticated",
  "membership writes must remain behind the secure plan-aware RPCs",
);
assert.doesNotMatch(
  runtimePermissionMigration,
  /GRANT\s+UPDATE\s*\([^)]*\bativo\b[^)]*\)\s+ON\s+(?:TABLE\s+)?public\.company_user/iu,
  "the plan-controlled ativo column must never be granted directly",
);
mustContain(
  runtimePermissionMigration,
  "public.set_company_member_role_secure(",
  "role changes need a narrow owner-only RPC",
);
mustContain(
  teamServer,
  'rpc("set_company_member_role_secure"',
  "the team UI must not update membership rows directly",
);
const finalMemberUpsert = sqlFunction(
  runtimePermissionMigration,
  "public.upsert_company_member_secure(",
);
mustContain(
  finalMemberUpsert,
  "_existing_role IS DISTINCT FROM _role",
  "the invite path must identify role changes on existing memberships",
);
mustContain(
  finalMemberUpsert,
  "Apenas o owner pode alterar papéis existentes",
  "admins must not bypass the owner-only role endpoint through reinvitation",
);
mustContain(
  finalMemberUpsert,
  "company_user.forcar_troca_senha OR EXCLUDED.forcar_troca_senha",
  "reinviting a member must never clear an unfinished forced-password change",
);
mustContain(
  securityServer,
  "export const completeForcedPasswordChange",
  "invited attendants need a narrow server path out of the forced-password flow",
);
mustContain(
  securityServer,
  '.eq("user_id", context.userId)',
  "forced-password completion must only change the caller's own memberships",
);
const passwordRoute = readFileSync(
  new URL("../src/routes/trocar-senha.tsx", import.meta.url),
  "utf8",
);
mustContain(
  passwordRoute,
  "completePasswordChange({ data: { password: pwd } })",
  "password completion must use the narrow authenticated server function",
);
mustContain(
  securityServer,
  "supabaseAdmin.auth.admin.updateUserById",
  "the trusted password-completion action must update the authenticated user before clearing the flag",
);
mustContain(
  companyAccessServer,
  "export async function assertUserPasswordReady",
  "authenticated server actions need one global temporary-password gate",
);
const globalPasswordGateSql = sqlFunction(
  runtimePermissionMigration,
  "public.current_user_requires_password_change(",
);
for (const fragment of [
  "membership.user_id = auth.uid()",
  "membership.ativo = true",
  "membership.forcar_troca_senha = true",
]) {
  mustContain(
    globalPasswordGateSql,
    fragment,
    `the global password gate is incomplete: ${fragment}`,
  );
}
mustContain(
  runtimePermissionMigration,
  "CREATE OR REPLACE FUNCTION public.enforce_tenant_password_ready()",
  "direct database writes must enforce the temporary-password boundary",
);
for (const helper of [
  sqlFunction(runtimePermissionMigration, "public.has_company_access("),
  sqlFunction(runtimePermissionMigration, "public.has_company_role("),
  sqlFunction(runtimePermissionMigration, "public.current_company_id("),
]) {
  mustContain(
    helper,
    "NOT public.current_user_requires_password_change()",
    "tenant-wide RLS helpers must deny an identity forced in any active membership",
  );
}
const superAdminSql = sqlFunction(runtimePermissionMigration, "public.is_super_admin(");
mustContain(
  superAdminSql,
  "NOT public.current_user_requires_password_change()",
  "a super admin must not bypass a global temporary-password reset",
);
const passwordGuardSql = sqlFunction(
  runtimePermissionMigration,
  "public.enforce_tenant_password_ready(",
);
assert.ok(
  passwordGuardSql.indexOf("public.current_user_requires_password_change()") <
    passwordGuardSql.indexOf("public.is_super_admin()"),
  "the password gate must run before every super-admin write bypass",
);
mustContain(
  runtimePermissionMigration,
  "AND NOT public.current_user_requires_password_change()",
  "the raw profile-admin policy must also enforce password readiness",
);
assert.ok(
  appRoute.indexOf('"current_user_requires_password_change"') <
    appRoute.indexOf('"is_super_admin"'),
  "the app shell must redirect a forced identity before super-admin impersonation",
);
for (const source of [
  companyAccessServer,
  evolutionServer,
  csatServer,
  creditsServer,
  securityServer,
  teamServer,
]) {
  mustContain(
    source,
    "assertUserPasswordReady",
    "trusted server paths must enforce the global temporary-password gate before using admin access",
  );
}
const ownerResetStart = masterServer.indexOf("export const resetCompanyOwnerPassword");
const ownerResetEnd = masterServer.indexOf("export const getCompanyDetails", ownerResetStart);
const ownerResetServer = masterServer.slice(ownerResetStart, ownerResetEnd);
assert.ok(
  ownerResetServer.indexOf(".update({ forcar_troca_senha: true })") <
    ownerResetServer.indexOf("supabaseAdmin.auth.admin.updateUserById"),
  "temporary owner resets must gate every active membership before changing the global Auth password",
);
mustContain(
  ownerResetServer,
  '.eq("user_id", owner.user_id)\n        .eq("ativo", true)',
  "owner password resets must synchronize every active membership for that identity",
);
mustContain(
  runtimePermissionMigration,
  "'company_user',",
  "team RPCs must also pass through the password-ready trigger",
);
for (const guardedTable of [
  "'crm_cards',",
  "'produto',",
  "'agendamento',",
  "'message_template',",
  "'campaign_target',",
  "'fin_lancamento',",
  "'api_token',",
]) {
  mustContain(
    runtimePermissionMigration,
    guardedTable,
    `legacy direct writes must pass through password and entitlement guards: ${guardedTable}`,
  );
}
mustContain(
  runtimePermissionMigration,
  "CREATE OR REPLACE FUNCTION public.is_company_operational(_company_id uuid)",
  "billing entitlement must have a database-level source of truth",
);
mustContain(
  runtimePermissionMigration,
  "CREATE OR REPLACE FUNCTION public.enforce_company_operational_write()",
  "direct operational writes must reject suspended or expired tenants",
);
mustContain(
  planLimitsServer,
  "export async function assertCompanyOperational",
  "trusted server actions need a reusable fail-closed entitlement gate",
);
mustContain(
  planLimitsServer,
  "await assertCompanyOperational(companyId);",
  "plan-limit checks must reject inactive tenants before applying numeric limits",
);
for (const source of [agentAiServer, evolutionServer, googleFunctions]) {
  mustContain(
    source,
    "assertCompanyOperational",
    "paid or external operational server actions must enforce billing entitlement",
  );
}
const featureGateSql = sqlFunction(runtimePermissionMigration, "public.company_has_plan_feature(");
for (const mapping of [
  "WHEN 'google_calendar' THEN _slug IN ('pro', 'business')",
  "WHEN 'financeiro' THEN _slug IN ('pro', 'business')",
  "WHEN 'automacoes' THEN _slug IN ('pro', 'business')",
  "WHEN 'api_webhooks' THEN _slug = 'business'",
]) {
  mustContain(featureGateSql, mapping, `database feature tier is missing: ${mapping}`);
}
mustContain(
  runtimePermissionMigration,
  "CREATE TRIGGER google_oauth_state_access_guard",
  "OAuth issuance and callback consumption must revalidate plan and password readiness",
);
const googleOauthStateGuardSql = sqlFunction(
  runtimePermissionMigration,
  "public.enforce_google_oauth_state_access(",
);
for (const fragment of [
  "forced_membership.user_id = NEW.user_id",
  "forced_membership.ativo = true",
  "forced_membership.forcar_troca_senha = true",
]) {
  mustContain(
    googleOauthStateGuardSql,
    fragment,
    `OAuth state consumption must enforce the actor's global password gate: ${fragment}`,
  );
}
for (const premiumTable of [
  "'google_integration'",
  "'fin_categoria'",
  "'fin_lancamento'",
  "'message_template'",
  "'campaign'",
  "'campaign_target'",
  "'webhook_endpoint'",
  "'api_token'",
]) {
  mustContain(
    runtimePermissionMigration,
    premiumTable,
    `premium direct writes need a database trigger: ${premiumTable}`,
  );
}
const planFeatureWriteSql = sqlFunction(
  runtimePermissionMigration,
  "public.enforce_plan_feature_write(",
);
const operationalWriteSql = sqlFunction(
  runtimePermissionMigration,
  "public.enforce_company_operational_write(",
);
mustContain(
  planFeatureWriteSql,
  "(_new_row - 'categoria_id' - 'crm_card_id')",
  "finance reference cleanup must compare the rest of the row before bypassing a downgraded plan",
);
for (const reference of ["categoria_id", "crm_card_id"]) {
  mustContain(
    planFeatureWriteSql,
    `(_old_row ->> '${reference}') IS NOT NULL AND (_new_row ->> '${reference}') IS NULL`,
    `downgraded finance cleanup may only clear ${reference}`,
  );
}
assert.ok(
  !planFeatureWriteSql.includes("NEW.categoria_id") &&
    !planFeatureWriteSql.includes("NEW.crm_card_id"),
  "the generic premium-write trigger must not dereference fin_lancamento-only record fields",
);
for (const source of [planFeatureWriteSql, operationalWriteSql]) {
  for (const cleanupTransition of [
    "(_old_row ->> 'ativo') = 'true'",
    "(_new_row ->> 'ativo') = 'false'",
    "(_old_row ->> 'revogado') = 'false'",
    "(_new_row ->> 'revogado') = 'true'",
  ]) {
    mustContain(
      source,
      cleanupTransition,
      `external credentials must retain a one-way cleanup path: ${cleanupTransition}`,
    );
  }
}
for (const secureCleanup of [
  "public.deactivate_webhook_endpoint_secure(",
  "public.revoke_api_token_secure(",
]) {
  const cleanupSql = sqlFunction(runtimePermissionMigration, secureCleanup);
  mustContain(
    cleanupSql,
    "public.has_company_role(_company_id, ARRAY['owner','admin'])",
    `external credential cleanup must remain owner/admin-only: ${secureCleanup}`,
  );
  mustContain(
    runtimePermissionMigration,
    `GRANT EXECUTE ON FUNCTION ${secureCleanup}uuid, uuid)\nTO authenticated`,
    `authenticated owners need the narrow cleanup RPC: ${secureCleanup}`,
  );
}
mustContain(
  runtimePermissionMigration,
  "REVOKE UPDATE (financeiro_ativo) ON TABLE public.company FROM authenticated",
  "finance activation must not remain a directly writable company column",
);
const financeEnableSql = sqlFunction(runtimePermissionMigration, "public.fin_enable_for_company(");
mustContain(
  financeEnableSql,
  "public.company_has_plan_feature(_company_id, 'financeiro')",
  "finance activation must enforce the Pro/Business tier inside the RPC",
);
mustContain(
  googleFunctions,
  "assertCompanyPlanFeature",
  "continued Google synchronization must revalidate the current plan",
);
mustContain(
  whatsappWebhook,
  'from("fin_whatsapp_identity")',
  "financial WhatsApp audio must verify the paired sender before responding",
);
assert.ok(
  whatsappWebhook.indexOf("assertCompanyOperational(companyId)") <
    whatsappWebhook.indexOf('const inbound = await db.from("mensagens").insert'),
  "the WhatsApp webhook must reject an inactive company before persisting or replying",
);
mustContain(
  whatsappWebhook,
  "quota_limited",
  "financial WhatsApp replies must stop when the monthly message limit is exhausted",
);
for (const source of [evolutionServer, csatServer, whatsappWebhook]) {
  mustContain(
    source,
    "reserveMessageQuota",
    "every outbound WhatsApp path must reserve the monthly quota atomically",
  );
  mustContain(
    source,
    "markMessageQuotaAttempt",
    "every outbound WhatsApp path must mark provider attempts before delivery",
  );
  mustContain(
    source,
    "persistOutboundMessagesAndFinalizeQuota",
    "every outbound WhatsApp path must reconcile persistence and quota atomically",
  );
}
assert.ok(
  whatsappWebhook.indexOf("reserveMessageQuota(companyId, outboundRef") <
    whatsappWebhook.indexOf("handleFinanceWhatsapp({"),
  "automatic replies must reserve message capacity before paying for the AI gateway",
);
const reserveMessageQuotaSql = sqlFunction(
  runtimePermissionMigration,
  "public.reserve_message_quota(",
);
const markMessageAttemptSql = sqlFunction(
  runtimePermissionMigration,
  "public.mark_message_quota_attempt(",
);
const settleMessageQuotaSql = sqlFunction(
  runtimePermissionMigration,
  "public.settle_message_quota(",
);
const persistOutboundSql = sqlFunction(
  runtimePermissionMigration,
  "public.persist_outbound_messages_and_finalize_quota(",
);
for (const source of [reserveMessageQuotaSql, markMessageAttemptSql, persistOutboundSql]) {
  mustContain(
    source,
    "pg_catalog.pg_advisory_xact_lock",
    "message quota mutations must share the company-month transaction lock",
  );
  mustContain(
    source,
    "COALESCE(auth.role(), '') <> 'service_role'",
    "message quota mutations must remain service-role only",
  );
}
mustContain(
  runtimePermissionMigration,
  "UNIQUE (company_id, ref)",
  "quota references must remain idempotent across calendar-month boundaries",
);
for (const source of [markMessageAttemptSql, settleMessageQuotaSql, persistOutboundSql]) {
  mustContain(
    source,
    "reservation.ref = _safe_ref",
    "quota follow-up mutations must resolve the original reservation by reference",
  );
  mustContain(
    source,
    "_reservation.period_start::text",
    "quota follow-up mutations must lock the reservation's original month",
  );
  assert.ok(
    !source.includes("date_trunc('month', pg_catalog.now())"),
    "quota follow-up mutations must not switch reservations at midnight",
  );
}
mustContain(
  markMessageAttemptSql,
  "greatest(attempted_count, _attempted_count)",
  "attempt marking must be idempotent under an ambiguous RPC retry",
);
mustContain(
  persistOutboundSql,
  "_message_count + _uncertain_count <> _reservation.attempted_count",
  "quota finalization must reconcile every provider attempt",
);
mustContain(
  persistOutboundSql,
  "_reservation.created_at",
  "persisted outbound usage must stay in the month whose quota was reserved",
);
assert.ok(
  persistOutboundSql.indexOf("INSERT INTO public.mensagens") <
    persistOutboundSql.indexOf("UPDATE public.message_quota_reservation"),
  "outbound history and quota settlement must commit in the same SQL function",
);
const contactLimitTrigger = sqlFunction(
  runtimePermissionMigration,
  "public.enforce_marcia_customer_limit(",
);
mustContain(
  contactLimitTrigger,
  "marcia:company-contact:",
  "parallel contact creation must serialize by company",
);
mustContain(
  contactLimitTrigger,
  "existing_customer.phone_e164 = NEW.phone_e164",
  "a concurrent duplicate contact must reach the unique constraint instead of consuming another plan slot",
);
mustContain(
  contactLimitTrigger,
  "_current_contacts >= greatest(0, _contact_limit)",
  "contact creation must enforce the selected plan inside the database transaction",
);
mustContain(
  runtimePermissionMigration,
  "CREATE POLICY whatsapp_instances_owner_admin",
  "WhatsApp credentials must be restricted to owner/admin",
);
mustContain(
  runtimePermissionMigration,
  "public.has_company_role(company_id, ARRAY['owner','admin'])",
  "the WhatsApp instance policy must enforce the administrative tenant role",
);
mustContain(
  runtimePermissionMigration,
  "REVOKE ALL ON TABLE public.whatsapp_instances FROM PUBLIC, anon, authenticated",
  "WhatsApp connection credentials must stay behind trusted server functions",
);
mustContain(
  runtimePermissionMigration,
  "CREATE POLICY agent_config_owner_admin",
  "agent configuration must be protected in the database as well as the UI",
);
mustContain(
  runtimePermissionMigration,
  "CREATE POLICY mensagens_member_select",
  "tenant members need a read-only conversation policy",
);
mustContain(
  runtimePermissionMigration,
  "REVOKE ALL ON TABLE public.mensagens FROM PUBLIC, anon, authenticated",
  "direct conversation mutation privileges must be removed",
);
mustContain(
  runtimePermissionMigration,
  "GRANT SELECT ON TABLE public.mensagens TO authenticated",
  "the inbox must retain read access after message hardening",
);
mustContain(
  runtimePermissionMigration,
  "REVOKE DELETE ON TABLE public.app_config FROM authenticated",
  "the clone ownership singleton must not be deletable through the public API",
);
const finalCreditConsume = sqlFunction(runtimePermissionMigration, "public.consume_ai_credit(");
const finalCreditRefund = sqlFunction(runtimePermissionMigration, "public.refund_ai_credit(");
for (const [source, operation] of [
  [finalCreditConsume, "consumption"],
  [finalCreditRefund, "refund"],
]) {
  mustContain(
    source,
    "COALESCE(auth.role(), '') <> 'service_role'",
    `AI credit ${operation} must be callable only by the trusted runtime`,
  );
  mustContain(
    source,
    "pg_catalog.pg_advisory_xact_lock",
    `AI credit ${operation} must serialize retries for the same reference`,
  );
}
mustContain(
  finalCreditConsume,
  "refund.motivo = 'ai_message_refund'",
  "a refunded idempotency key must not authorize another free AI request",
);
mustContain(
  runtimePermissionMigration,
  "REVOKE ALL ON TABLE public.csat_response FROM PUBLIC, anon, authenticated",
  "CSAT rows must not be directly writable through the browser API",
);
const csatReservation = sqlFunction(runtimePermissionMigration, "public.reserve_csat_send(");
mustContain(
  csatReservation,
  "pg_catalog.pg_advisory_xact_lock",
  "parallel CSAT requests for one contact must be serialized",
);
mustContain(
  csatReservation,
  "survey.created_at >= pg_catalog.now() - interval '24 hours'",
  "the CSAT reservation must enforce the one-per-day rule atomically",
);
mustContain(
  csatServer,
  'admin.rpc("reserve_csat_send"',
  "CSAT delivery must reserve its token through the atomic server-only RPC",
);
mustContain(
  csatServer,
  '.is("respondido_em", null)',
  "a public CSAT token must only be consumed once under parallel submissions",
);
mustContain(
  runtimePermissionMigration,
  "campaign_company_identity_unique UNIQUE (company_id, id)",
  "campaign targets need a tenant-qualified parent key",
);
mustContain(
  runtimePermissionMigration,
  "FOREIGN KEY (company_id, campaign_id)",
  "campaign targets must not reference a campaign from another tenant",
);
mustContain(
  runtimePermissionMigration,
  "REFERENCES public.campaign(company_id, id)",
  "the campaign target foreign key must use the tenant-qualified parent key",
);
const campaignMismatchGuard = runtimePermissionMigration.indexOf(
  "target.company_id IS DISTINCT FROM campaign.company_id",
);
const campaignLegacyFkDrop = runtimePermissionMigration.indexOf(
  "DROP CONSTRAINT IF EXISTS campaign_target_campaign_id_fkey",
);
const campaignCompositeFk = runtimePermissionMigration.indexOf(
  "FOREIGN KEY (company_id, campaign_id)",
);
assert.ok(
  campaignMismatchGuard !== -1 &&
    campaignMismatchGuard < campaignLegacyFkDrop &&
    campaignLegacyFkDrop < campaignCompositeFk,
  "legacy campaign inconsistencies must fail closed before replacing the foreign key",
);
for (const relation of [
  "REFERENCES public.crm_stage(company_id, id)",
  "REFERENCES public.crm_cards(company_id, id)",
  "REFERENCES public.webhook_endpoint(company_id, id)",
  "REFERENCES public.fin_categoria(company_id, id)",
]) {
  mustContain(
    runtimePermissionMigration,
    relation,
    `legacy tenant relationship must use its composite company key: ${relation}`,
  );
}
for (const nullableReference of [
  "ON DELETE SET NULL (stage_id)",
  "ON DELETE SET NULL (card_id)",
  "ON DELETE SET NULL (endpoint_id)",
  "ON DELETE SET NULL (categoria_id)",
  "ON DELETE SET NULL (crm_card_id)",
]) {
  mustContain(
    runtimePermissionMigration,
    nullableReference,
    "composite foreign-key deletion must never null the non-null tenant key",
  );
}

const checkWhatsappStart = evolutionServer.indexOf("export const checkWhatsappStatus");
const checkWhatsappEnd = evolutionServer.indexOf(
  "export const disconnectWhatsapp",
  checkWhatsappStart,
);
mustContain(
  evolutionServer.slice(checkWhatsappStart, checkWhatsappEnd),
  "assertCompanyOperational",
  "WhatsApp status repair must not call the provider for a suspended tenant",
);

const sendWhatsappStart = evolutionServer.indexOf("export const sendWhatsappText");
const sendWhatsappEnd = evolutionServer.indexOf(
  "export const setContactIaActive",
  sendWhatsappStart,
);
const sendWhatsappServer = evolutionServer.slice(sendWhatsappStart, sendWhatsappEnd);
mustContain(
  sendWhatsappServer,
  'import("@/integrations/supabase/client.server")',
  "operational WhatsApp sends must read credentials through the trusted server client",
);
mustContain(
  sendWhatsappServer,
  "persistOutboundMessagesAndFinalizeQuota",
  "operational WhatsApp sends must persist and settle quota atomically",
);
mustContain(
  sendWhatsappServer,
  'console.error("[manual-send persistence]"',
  "a provider-confirmed manual send must not be reported as undelivered when local persistence fails",
);
mustContain(
  sendWhatsappServer,
  "return { ok: true, warning:",
  "provider-confirmed manual sends must return success with a reconciliation warning",
);
mustContain(
  csatServer,
  "persistOutboundMessagesAndFinalizeQuota",
  "CSAT sends must persist and settle quota atomically",
);
assert.ok(
  !sendWhatsappServer.includes('admin.from("mensagens").insert') &&
    !csatServer.includes('admin.from("mensagens").insert'),
  "manual and CSAT sends must not split message persistence from quota settlement",
);
mustContain(
  csatServer,
  'author: "humano"',
  "CSAT persistence must satisfy the allowed message-author constraint",
);
for (const source of [agentAiServer, evolutionServer]) {
  mustContain(
    source,
    "requireCompanyAdminAccess",
    "paid AI preview endpoints must be tenant-bound and administrative",
  );
  assert.ok(
    !source.includes('"consume_ai_credit"') && !source.includes('"refund_ai_credit"'),
    "internal setup and preview tools must not consume WhatsApp response credits",
  );
}
const financeWhatsappHandler = financeWhatsappServer.slice(
  financeWhatsappServer.indexOf("export async function handleFinanceWhatsapp"),
);
assert.ok(
  financeWhatsappHandler.indexOf('"consume_ai_credit"') <
    financeWhatsappHandler.indexOf("await interpret("),
  "the WhatsApp webhook must reserve a tenant credit before calling the paid AI gateway",
);
mustContain(
  financeWhatsappServer,
  'rpc("refund_ai_credit"',
  "the WhatsApp webhook must refund a reserved credit on AI or delivery failure",
);
mustContain(
  financeWhatsappServer,
  '.eq("company_id", input.companyId)',
  "financial WhatsApp reads and writes must keep their explicit tenant scope",
);
mustContain(
  financeWhatsappServer,
  '.eq("phone_e164", phoneE164)',
  "financial WhatsApp must authorize the paired sender inside the tenant",
);

function sqlFunction(source, signature) {
  const start = source.lastIndexOf(`CREATE OR REPLACE FUNCTION ${signature}`);
  assert.notEqual(start, -1, `missing SQL function: ${signature}`);
  const bodyStart = source.indexOf("AS $function$", start);
  const end = source.indexOf("$function$;", bodyStart);
  assert.ok(bodyStart > start && end > bodyStart, `invalid SQL function body: ${signature}`);
  return source.slice(start, end + "$function$;".length);
}

mustContain(migration, "_claim_owner boolean DEFAULT false", "claim must default to false");
mustContain(migration, "IF _claim_owner THEN", "claim must require an explicit branch");
mustContain(migration, "remix_installation_guard", "claim must be single-use and persisted");
mustContain(migration, "activation_code_hash", "activation codes must be hashed");
assert.ok(
  !migration.includes("request.headers") && !migration.includes("preview--"),
  "hostname/origin must never authorize ownership",
);
mustContain(migration, "trg_protect_company_owner_membership", "owner mutations need a DB trigger");
mustContain(
  migration,
  "Admin não pode promover, alterar ou remover owner",
  "admins must not control owners",
);
const ownerProtection = sqlFunction(migration, "public.protect_company_owner_membership()");
mustContain(
  ownerProtection,
  "marcia:company-owner:",
  "last-owner checks must serialize concurrent owner removals",
);
assert.ok(
  ownerProtection.indexOf("marcia:company-owner:") < ownerProtection.indexOf("AND NOT EXISTS ("),
  "the company owner lock must be acquired before re-checking the last owner",
);
mustContain(
  migration,
  "DELETE FROM public.user_roles AS ur",
  "allowlist removal must revoke roles",
);
mustContain(
  migration,
  "lower(trim(u.email)) = ANY(cfg.super_admin_emails)",
  "super admin authorization must fail closed against the allowlist",
);
mustContain(
  migration,
  "guard.claimed_at IS NOT NULL",
  "super admin authorization must fail closed until the installation is claimed",
);
mustContain(
  migration,
  "u.email_confirmed_at IS NOT NULL",
  "email-based ownership must require a confirmed account",
);
const legacyAllowlistStart = migration.indexOf("-- Preserva os super admins legítimos");
const legacyAllowlistEnd = migration.indexOf(
  "CREATE OR REPLACE FUNCTION public.sync_super_admin_allowlist()",
  legacyAllowlistStart,
);
const legacyAllowlistMigration = migration.slice(legacyAllowlistStart, legacyAllowlistEnd);
mustContain(
  legacyAllowlistMigration,
  "AND u.email_confirmed_at IS NOT NULL",
  "legacy role preservation must ignore unconfirmed accounts",
);
mustContain(
  migration,
  "AND guard.claimed_at IS NULL\n  AND ur.role = 'super_admin'::public.app_role",
  "legacy raw roles must be removed from an unclaimed clone",
);
mustContain(
  migration,
  "SET super_admin_emails = '{}'::text[]",
  "an unclaimed Remix must not inherit the template allowlist",
);
mustContain(
  migration,
  "is_remix_installation_claimed",
  "self-service mutations need a fail-closed installation readiness RPC",
);
const allowlistSync = sqlFunction(migration, "public.apply_super_admin_allowlist()");
assert.ok(
  /INSERT INTO public\.user_roles[\s\S]*guard\.claimed_at IS NOT NULL[\s\S]*ON CONFLICT/.test(
    allowlistSync,
  ),
  "allowlist synchronization must not grant a role before claim",
);
const superAdminCheck = sqlFunction(migration, "public.is_super_admin()");
mustContain(
  superAdminCheck,
  "guard.claimed_at IS NOT NULL",
  "super admin access must remain disabled before claim",
);
const masterAtomicCreate = sqlFunction(migration, "public.create_company_with_owner_atomic(");
for (const table of ["company", "company_user", "subscription"]) {
  mustContain(
    masterAtomicCreate,
    `INSERT INTO public.${table}`,
    `master atomic create must include ${table}`,
  );
}
mustContain(
  masterAtomicCreate,
  "is_remix_installation_claimed",
  "master tenant creation must require an activated clone",
);
mustContain(
  masterAtomicCreate,
  "marcia:master-provision:",
  "master creation must serialize by an idempotency key",
);
mustContain(
  masterAtomicCreate,
  "INSERT INTO public.company_provision_request",
  "master creation must persist its result in the tenant transaction",
);
const masterProvisionResolver = sqlFunction(migration, "public.resolve_company_provision_result(");
mustContain(
  masterProvisionResolver,
  "marcia:master-provision:",
  "master reconciliation must wait on the same provisioning lock",
);
for (const table of ["company", "company_user", "subscription"]) {
  mustContain(
    masterProvisionResolver,
    `JOIN public.${table}`,
    `master reconciliation must verify ${table}`,
  );
}
mustContain(
  masterProvisionResolver,
  "_record_owner_id IS NOT NULL AND _company_id IS NULL",
  "an incomplete persisted provisioning result must remain indeterminate",
);
const checkoutAtomicCreate = sqlFunction(migration, "public.create_checkout_company_atomic(");
mustContain(
  checkoutAtomicCreate,
  "marcia:checkout:",
  "checkout creation must serialize concurrent requests per user",
);
assert.ok(
  checkoutAtomicCreate.indexOf("SELECT cu.company_id") <
    checkoutAtomicCreate.indexOf("INSERT INTO public.company"),
  "checkout must re-check an existing membership after acquiring its lock",
);
for (const table of ["company", "company_user", "subscription"]) {
  mustContain(
    checkoutAtomicCreate,
    `INSERT INTO public.${table}`,
    `checkout atomic create must include ${table}`,
  );
}
// Ativação automática: só a primeira conta confirmada do Auth, uma vez, sob lock.
mustContain(ownerMigration, "pg_advisory_xact_lock", "owner claim must be serialized");
mustContain(
  ownerMigration,
  "u.email_confirmed_at IS NOT NULL",
  "only confirmed accounts may claim",
);
mustContain(
  ownerMigration,
  "ORDER BY u.created_at ASC, u.id ASC LIMIT 1",
  "first confirmed account decides",
);
mustContain(
  ownerMigration,
  "_first_confirmed = _uid",
  "only the first confirmed account may claim",
);
mustContain(
  ownerMigration,
  "IF NOT COALESCE(_guard_claimed, false) THEN",
  "claim happens only once",
);
assert.ok(
  !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(ownerMigration) &&
    !/@[a-z0-9-]+\.[a-z]/i.test(ownerMigration.replace(/[^\n]*--[^\n]*/g, "")),
  "owner migration must not hardcode identities",
);
assert.ok(
  !bootstrapClient.includes("_claim_owner") && !loginRoute.includes("CLONE_ACTIVATION_CODE"),
  "no activation code in client",
);
assert.ok(!appRoute.includes('ativar: "clone"'), "no technical activation route");
// Credenciais globais: tabela sem grants ao cliente, AES-GCM, só super admin.
for (const t of [
  "platform_integration_secret",
  "platform_integration_status",
  "stripe_event_log",
]) {
  mustContain(
    ownerMigration,
    `REVOKE ALL ON public.${t} FROM anon, authenticated, public;`,
    `${t} must be server-only`,
  );
  mustContain(
    ownerMigration,
    `ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`,
    `${t} must have RLS`,
  );
}
mustContain(secretStore, '"AES-GCM"', "integration secrets must use AES-GCM");
mustContain(secretStore, "SUPABASE_SERVICE_ROLE_KEY", "key derives from server-only material");
assert.equal(
  (platformIntegrations.match(/assertSuperAdmin\(context.supabase\)/g) || []).length,
  4,
  "every integration fn must require super admin",
);
assert.ok(
  !/ciphertext|resolveIntegration\([^)]*\)\s*;?\s*return/.test(
    platformIntegrations.replace(/import[^;]+;/g, ""),
  ),
  "secrets must not be returned to the browser",
);
mustContain(
  stripeWebhook,
  "verify(raw, header, webhook_secret)",
  "stripe webhook must verify signature",
);
mustContain(stripeWebhook, '"23505"', "stripe webhook must be idempotent");
assert.ok(
  !integrationsRoute.includes("GOOGLE_OAUTH_STATE_SECRET") &&
    !integrationReadiness.includes("GOOGLE_OAUTH_STATE_SECRET"),
  "Google readiness and setup must not require a static OAuth state secret",
);
mustContain(masterServer, 'rpc("is_super_admin")', "master functions must honor revocation");
assert.ok(
  !masterServer.includes('.from("user_roles")'),
  "privileged server guards must not authorize from a stale raw role",
);
assert.ok(!checkoutServer.includes("_claim_owner: true"), "checkout must never claim ownership");
mustContain(
  checkoutServer,
  '"is_remix_installation_claimed"',
  "checkout must require a claimed installation",
);
assert.ok(
  checkoutServer.indexOf("installationClaimed !== true") <
    checkoutServer.indexOf('import("@/integrations/supabase/client.server")'),
  "checkout readiness must be checked before service-role access",
);
assert.ok(
  checkoutServer.indexOf("installationClaimed !== true") <
    checkoutServer.indexOf('"create_checkout_company_atomic"'),
  "checkout must fail closed before creating a tenant",
);
assert.ok(
  !checkoutServer.includes('.from("company")') &&
    !checkoutServer.includes('.from("company_user")') &&
    !checkoutServer.includes('.from("subscription")'),
  "checkout tenant writes must stay inside the atomic RPC",
);

const masterCreateStart = masterServer.indexOf("export const createCompanyWithOwner");
const masterCreateEnd = masterServer.indexOf("export const listPlansBasic", masterCreateStart);
const masterCreateServer = masterServer.slice(masterCreateStart, masterCreateEnd);
mustContain(
  masterCreateServer,
  '"create_company_with_owner_atomic"',
  "master company creation must use the atomic RPC",
);
mustContain(
  masterCreateServer,
  "_idempotency_key: provisionKey",
  "master company creation must correlate the transaction with an idempotency key",
);
mustContain(
  masterCreateServer,
  '"resolve_company_provision_result"',
  "master creation must reconcile an ambiguous RPC response",
);
mustContain(
  masterCreateServer,
  '"marcia_find_auth_user_by_email"',
  "master owner identity must resolve from auth.users through the service-role RPC",
);
mustContain(
  masterCreateServer,
  "let ownerId = await findAuthOwnerByEmail()",
  "master must resolve Auth identity before attempting account creation",
);
mustContain(
  masterCreateServer,
  "const reconciledOwnerId = await findAuthOwnerByEmail()",
  "an ambiguous Auth create response must be reconciled against auth.users",
);
assert.ok(
  !/\.from\(["']profiles["']\)[\s\S]*?\.eq\(["']email["']/.test(masterCreateServer),
  "master provisioning must never resolve owner identity from profiles.email",
);
assert.ok(
  !masterCreateServer.includes("deleteUser("),
  "master provisioning must never delete an auth user that a concurrent request may have linked",
);
assert.ok(
  !masterCreateServer.includes('.from("company")') &&
    !masterCreateServer.includes('.from("company_user")') &&
    !masterCreateServer.includes('.from("subscription")'),
  "master tenant writes must stay inside the atomic RPC",
);

const handleNewUser = sqlFunction(migration, "public.handle_new_user()");
assert.ok(
  !handleNewUser.includes("bootstrap_remix_instance"),
  "auth signup trigger must never claim the installation",
);
mustContain(
  handleNewUser,
  "guard.claimed_at IS NOT NULL",
  "auth signup may only sync an allowlisted role after the installation is claimed",
);
mustContain(
  handleNewUser,
  "lower(trim(NEW.email)) = ANY(cfg.super_admin_emails)",
  "auth signup may only sync an email already present in the allowlist",
);
assert.ok(
  handleNewUser.indexOf("guard.claimed_at IS NOT NULL") <
    handleNewUser.indexOf("INSERT INTO public.user_roles"),
  "the claimed-installation gate must precede any signup role grant",
);

const bootstrapFunction = sqlFunction(migration, "public.bootstrap_remix_instance(");
mustContain(
  bootstrapFunction,
  "JOIN auth.users AS u ON u.id = ur.user_id",
  "bootstrap must not treat a raw role as an effective super admin",
);
mustContain(
  bootstrapFunction,
  "lower(trim(u.email)) = ANY(cfg.super_admin_emails)",
  "bootstrap must only count allowlisted confirmed super admins",
);
mustContain(
  bootstrapFunction,
  "ELSIF NOT _valid_code THEN",
  "initial ownership must always require the activation code",
);

assert.ok(!masterServer.includes("Math.random"), "master credentials must use a CSPRNG");
assert.ok(!teamServer.includes("Math.random"), "team credentials must use a CSPRNG");
mustContain(
  secureRandomServer,
  'from "node:crypto"',
  "temporary credentials must be generated in a server-only crypto module",
);
mustContain(
  secureRandomServer,
  "randomBytes(18)",
  "temporary credentials must use cryptographically secure random bytes",
);

for (const fragment of [
  "'clone-brand-assets'",
  "public.is_super_admin()",
  "file_size_limit",
  "allowed_mime_types",
  "FOR SELECT",
  "FOR INSERT",
  "FOR UPDATE",
  "FOR DELETE",
]) {
  mustContain(brandStorageMigration, fragment, `brand Storage hardening missing: ${fragment}`);
}
mustContain(brandStorageMigration, "5242880", "brand uploads must be capped at 5 MB");
assert.ok(
  /'clone-brand-assets',\s*'clone-brand-assets',\s*false,/.test(brandStorageMigration),
  "brand assets must use a private bucket for Lovable workspace portability",
);
assert.ok(
  !brandStorageMigration.includes("image/svg+xml"),
  "brand uploads must not accept active SVG content",
);
mustContain(brandUploader, "MAX_FILE_BYTES", "brand uploader must validate file size locally");
mustContain(brandUploader, "MIME_EXTENSION", "brand uploader must allowlist image MIME types");
mustContain(
  brandUploader,
  'kind === "icon" && width !== height',
  "uploaded PWA icons must be square",
);
mustContain(
  brandUploader,
  ".storage.from(BRAND_BUCKET).upload",
  "brand UI must upload through the protected bucket",
);
mustContain(
  brandUploader,
  "/api/public/brand-asset?path=",
  "private brand assets must be stored as app-relative read URLs",
);
assert.ok(!brandUploader.includes("getPublicUrl"), "a private bucket must not expose public URLs");
mustContain(
  publicBrandAssetRoute,
  "SAFE_PATH",
  "the public brand asset route must allowlist object paths",
);
mustContain(
  publicBrandAssetRoute,
  '"X-Content-Type-Options": "nosniff"',
  "the public brand asset route must prevent MIME sniffing",
);
mustContain(
  publicBrandAssetRoute,
  ".storage.from(BRAND_BUCKET).download(path)",
  "the public route must read the private bucket through the server client",
);
assert.ok(
  !dynamicManifest.includes('{ src: customIcon, sizes: "any", purpose: "maskable" }'),
  "an arbitrary custom icon must never be advertised as maskable",
);
mustContain(
  dynamicManifest,
  'sizes: "192x192"',
  "a normalized managed raster icon must include its 192px variant",
);
mustContain(
  dynamicManifest,
  'sizes: "512x512"',
  "a normalized managed raster icon must include its 512px variant",
);
assert.ok(
  !dynamicManifest.includes('{ src: customIcon, sizes: "any"'),
  "a custom raster icon must never claim to be resolution-independent",
);
mustContain(
  brandUploader,
  "normalizePwaIcon",
  "uploaded PWA icons must be normalized to a known raster size",
);
mustContain(
  brandUploader,
  "for (const size of [192, 512] as const)",
  "the upload flow must create both installable PWA icon sizes",
);
mustContain(
  brandStorageServer,
  ".storage.createBucket",
  "a Remix must provision a missing brand bucket server-side",
);
mustContain(
  brandStorageServer,
  ".storage.updateBucket",
  "brand bucket privacy and limits must be reconciled idempotently",
);
assert.ok(
  brandUploader.indexOf("await ensureBucket()") <
    brandUploader.indexOf(".storage.from(BRAND_BUCKET).upload"),
  "the private bucket must be reconciled before every owner upload",
);

const brandUpdate = sqlFunction(assistantRebrandMigration, "public.set_clone_brand_config_atomic(");
mustContain(
  brandUpdate,
  "public.migrate_generated_assistant_presentation(",
  "brand rename must migrate generated introductions in the same transaction",
);
mustContain(
  brandUpdate,
  "ac.nome_agente = _previous_name",
  "brand rename must only persist over the prior global identity",
);
mustContain(
  brandConfig,
  "migrateGeneratedAssistantPresentation",
  "runtime branding must safely migrate a generated introduction",
);
assert.ok(
  !/Object\.entries\(config[\s\S]{0,300}personalizeAssistantText/.test(brandConfig),
  "runtime branding must not replace the assistant name through every free-text field",
);
mustContain(
  aiPrompt,
  "IDENTIDADE ATUAL: seu nome é",
  "the runtime system prompt must make the current clone identity authoritative",
);

function migrateGeneratedPresentation(value, previousName, nextName) {
  const prefixes = [
    "Olá! Sou ",
    "Oi! Sou ",
    "Olá, sou ",
    "Oi, sou ",
    "Olá! Eu sou ",
    "Oi! Eu sou ",
    "Olá, eu sou ",
    "Oi, eu sou ",
  ];
  for (const prefix of prefixes) {
    const identity = `${prefix}${previousName}`;
    const delimiter = value.slice(identity.length, identity.length + 1);
    if (value.startsWith(identity) && (!delimiter || /[\s,.!—-]/u.test(delimiter))) {
      return `${prefix}${nextName}${value.slice(identity.length)}`;
    }
  }
  return value;
}

const firstRename = migrateGeneratedPresentation(
  "Olá! Sou Márcia, secretária virtual. Como posso ajudar?",
  "Márcia",
  "Ana",
);
const secondRename = migrateGeneratedPresentation(firstRename, "Ana", "Bia");
assert.equal(
  secondRename,
  "Olá! Sou Bia, secretária virtual. Como posso ajudar?",
  "generated identity must survive Márcia → Ana → Bia",
);
assert.equal(
  migrateGeneratedPresentation("A Ana da recepção aprovou este texto.", "Ana", "Bia"),
  "A Ana da recepção aprovou este texto.",
  "business-authored free text must never receive a blind rename",
);

mustContain(
  brandConfig,
  '"--primary-foreground": foreground',
  "brand foreground must adapt to the chosen primary color",
);
mustContain(
  brandConfig,
  '"--sidebar-primary-foreground": foreground',
  "sidebar actions must share the accessible foreground",
);
mustContain(
  assistantRebrandMigration,
  "REVOKE ALL ON FUNCTION public.seed_fin_categorias(uuid) FROM PUBLIC, anon, authenticated",
  "the historical finance seed helper must not remain publicly executable",
);

const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);
const allMigrationSql = readdirSync(migrationDirectory)
  .filter((name) => name.endsWith(".sql"))
  .map((name) => readFileSync(new URL(name, migrationDirectory), "utf8"))
  .join("\n");
assert.ok(
  !/luis\.bedinot@gmail\.com/i.test(allMigrationSql),
  "historical migrations must not expose a personal owner email",
);
assert.ok(
  !/pay\.kiwify\.com\.br\/[A-Za-z0-9_-]+/i.test(allMigrationSql),
  "historical migrations must not expose checkout URLs from the source project",
);
assert.ok(
  !/INSERT\s+INTO\s+public\.user_roles\s*\([^)]*\)\s*VALUES\s*\(\s*'[0-9a-f-]{36}'/i.test(
    allMigrationSql,
  ),
  "historical migrations must not seed a source-project user id",
);

const secureMemberUpsert = sqlFunction(
  teamMembershipMigration,
  "public.upsert_company_member_secure(",
);
mustContain(
  secureMemberUpsert,
  "COALESCE(auth.role(), '') <> 'authenticated'",
  "team mutation must retain the authenticated actor",
);
mustContain(
  secureMemberUpsert,
  "Admin não pode promover, alterar ou reativar owner",
  "tenant admins must never mutate an owner through invite",
);
mustContain(
  secureMemberUpsert,
  "marcia:company-member:",
  "member mutation must serialize every invite for the company",
);
mustContain(
  secureMemberUpsert,
  "SELECT count(*)::integer",
  "the active-member count must be evaluated in the locked transaction",
);
mustContain(
  secureMemberUpsert,
  "_active_members >= _member_limit",
  "the locked RPC must reject a member beyond the plan limit",
);
assert.ok(
  secureMemberUpsert.indexOf("marcia:company-member:") <
    secureMemberUpsert.indexOf("SELECT count(*)::integer"),
  "the plan count must happen only after the company advisory lock",
);
const inviteStart = teamServer.indexOf("export const inviteMember");
const inviteEnd = teamServer.indexOf("export const setMemberActive", inviteStart);
const inviteServer = teamServer.slice(inviteStart, inviteEnd);
mustContain(
  inviteServer,
  'supabase.rpc("upsert_company_member_secure"',
  "inviteMember must mutate membership with the authenticated RPC",
);
assert.ok(
  !/supabaseAdmin\s*\.from\("company_user"\)\s*\.upsert\(/.test(inviteServer),
  "inviteMember must not upsert membership through service_role",
);
assert.ok(
  !inviteServer.includes("assertWithinLimit"),
  "the invitation limit must not rely on a non-atomic application pre-check",
);
mustContain(
  inviteServer,
  'from("team_invite_provision")',
  "auth users created before a failed membership link need a durable recovery journal",
);
mustContain(
  inviteServer,
  "A conta foi criada e preservada",
  "a partial invitation must return an explicit recoverable result",
);
assert.ok(
  !/auth\.admin\.deleteUser|deleteUser\s*\(/.test(inviteServer),
  "invitation recovery must never delete an auth account",
);
const setMemberActiveStart = teamServer.indexOf("export const setMemberActive");
const setMemberActiveEnd = teamServer.indexOf("export const setMemberRole", setMemberActiveStart);
const setMemberActiveServer = teamServer.slice(setMemberActiveStart, setMemberActiveEnd);
mustContain(
  setMemberActiveServer,
  '"set_company_member_active_secure"',
  "member activation must use the authenticated atomic RPC",
);
assert.ok(
  !setMemberActiveServer.includes("assertWithinLimit") &&
    !/\.from\(["']company_user["']\)[\s\S]*?\.update\(/.test(setMemberActiveServer),
  "member activation must not check limits or mutate membership outside the RPC",
);

mustContain(
  teamMembershipMigration,
  "CREATE TABLE IF NOT EXISTS public.google_oauth_state",
  "Google OAuth state must be persisted server-side",
);
const issueGoogleState = sqlFunction(
  teamMembershipMigration,
  "public.marcia_issue_google_oauth_state(",
);
for (const binding of ["_actor_id", "_session_id", "_company_id"]) {
  mustContain(issueGoogleState, binding, `OAuth issuance must bind ${binding}`);
}
mustContain(
  issueGoogleState,
  "marcia:google-oauth-state:",
  "OAuth issuance must serialize each company/user/session tuple",
);
assert.ok(
  issueGoogleState.indexOf("marcia:google-oauth-state:") <
    issueGoogleState.indexOf("UPDATE public.google_oauth_state"),
  "OAuth state lock must be acquired before invalidation and insertion",
);
const consumeGoogleState = sqlFunction(
  teamMembershipMigration,
  "public.marcia_consume_google_oauth_state(",
);
mustContain(
  consumeGoogleState,
  "SET consumed_at = pg_catalog.now()",
  "OAuth state must be consumed by an atomic update",
);
mustContain(consumeGoogleState, "state.consumed_at IS NULL", "OAuth state replay must be rejected");
mustContain(
  consumeGoogleState,
  "state.expires_at > pg_catalog.now()",
  "OAuth state must enforce its TTL at consume time",
);
mustContain(
  googleFunctions,
  '"marcia_issue_google_oauth_state"',
  "the OAuth start route must persist its one-time state",
);
mustContain(
  googleCallback,
  '"marcia_consume_google_oauth_state"',
  "the callback must atomically consume its state",
);
assert.ok(
  !googleServer.includes("signState") && !googleServer.includes("verifyState"),
  "replayable stateless OAuth state helpers must not remain in use",
);

const authoritativeAuthLookup = sqlFunction(
  teamMembershipMigration,
  "public.marcia_find_auth_user_by_email(",
);
mustContain(
  authoritativeAuthLookup,
  "FROM auth.users AS u",
  "owner email lookup must use auth.users as its authority",
);
mustContain(
  authoritativeAuthLookup,
  "Conflito de identidade: mais de uma conta Auth usa este email",
  "duplicate Auth identities must fail closed",
);
mustContain(
  authoritativeAuthLookup,
  "COALESCE(auth.role(), '') <> 'service_role'",
  "authoritative Auth identity lookup must remain service-role only",
);
const canonicalProfileEmail = sqlFunction(
  teamMembershipMigration,
  "public.canonicalize_profile_auth_email()",
);
mustContain(
  canonicalProfileEmail,
  "FROM auth.users AS u",
  "profiles.email must be canonicalized from auth.users",
);
mustContain(
  canonicalProfileEmail,
  "NEW.email := _auth_email",
  "authenticated profile writes must not persist a divergent email",
);
mustContain(
  teamMembershipMigration,
  "BEFORE INSERT OR UPDATE OF user_id, email ON public.profiles",
  "profile identity mirror must be protected by a database trigger",
);
mustContain(
  teamMembershipMigration,
  "UPDATE public.profiles AS profile",
  "the upgrade must repair legacy profile identity mirrors",
);
mustContain(
  teamMembershipMigration,
  "profile.email IS DISTINCT FROM lower(trim(auth_user.email))",
  "the profile identity backfill must be null-safe and idempotent",
);
mustContain(
  billingWebhook,
  '"marcia_find_auth_user_by_email"',
  "billing buyer identity must resolve from auth.users through the service-role RPC",
);
assert.ok(
  !/\.from\(["']profiles["']\)[\s\S]*?\.ilike\(["']email["']/.test(billingWebhook),
  "billing must never route an entitlement through profiles.email",
);

const secureMemberActivation = sqlFunction(
  teamMembershipMigration,
  "public.set_company_member_active_secure(",
);
mustContain(
  secureMemberActivation,
  "marcia:company-member:",
  "reactivation must use the same per-company lock as invitation",
);
mustContain(
  secureMemberActivation,
  "Apenas owner ou admin pode gerenciar a equipe",
  "member activation must validate the authenticated actor in the transaction",
);
mustContain(
  secureMemberActivation,
  "Admin não pode ativar ou desativar owner",
  "tenant admins must not control owner activation",
);
mustContain(
  secureMemberActivation,
  "_target_active = true AND _current_active = false",
  "only a real reactivation needs an additional plan slot",
);
mustContain(
  secureMemberActivation,
  "_active_members >= _member_limit",
  "reactivation must enforce the plan limit inside the locked transaction",
);
assert.ok(
  secureMemberActivation.indexOf("marcia:company-member:") <
    secureMemberActivation.indexOf("SELECT count(*)::integer"),
  "reactivation must count active users after acquiring the company lock",
);

assert.ok(
  masterCreateServer.indexOf('supabaseAdmin.rpc(\n      "create_company_with_owner_atomic"') <
    masterCreateServer.indexOf("finalizeExistingOwnerCredential(String(companyId))"),
  "an existing owner credential must only be finalized after tenant creation confirms",
);

// Small executable model of the authorization matrix. The authoritative
// implementation remains the SQL function above; these cases document the
// properties that future edits must preserve.
function mayClaim({ explicit, alreadyClaimed, emailRestricted, allowlisted, validCode }) {
  return explicit && !alreadyClaimed && validCode && (!emailRestricted || allowlisted);
}

assert.equal(
  mayClaim({
    explicit: false,
    alreadyClaimed: false,
    emailRestricted: false,
    allowlisted: false,
    validCode: true,
  }),
  false,
  "ordinary signup cannot claim even with a valid code provisioned",
);
assert.equal(
  mayClaim({
    explicit: true,
    alreadyClaimed: false,
    emailRestricted: false,
    allowlisted: false,
    validCode: false,
  }),
  false,
  "explicit setup without a code cannot claim on any hostname",
);
assert.equal(
  mayClaim({
    explicit: true,
    alreadyClaimed: false,
    emailRestricted: false,
    allowlisted: false,
    validCode: true,
  }),
  true,
  "a valid activation code can claim",
);
assert.equal(
  mayClaim({
    explicit: true,
    alreadyClaimed: true,
    emailRestricted: true,
    allowlisted: true,
    validCode: true,
  }),
  false,
  "a claimed installation cannot be claimed again",
);
assert.equal(
  mayClaim({
    explicit: true,
    alreadyClaimed: false,
    emailRestricted: true,
    allowlisted: false,
    validCode: true,
  }),
  false,
  "an optional owner-email restriction must still be honored with a valid code",
);
assert.equal(
  mayClaim({
    explicit: true,
    alreadyClaimed: false,
    emailRestricted: true,
    allowlisted: true,
    validCode: false,
  }),
  false,
  "an allowlisted email can never replace the one-time activation code",
);

console.log("clone ownership security invariants: ok");
