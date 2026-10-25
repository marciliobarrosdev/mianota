import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const dashboard = read("src/lib/finance-dashboard.functions.ts");
const command = read("src/lib/finance-command.functions.ts");
const whatsapp = read("src/lib/finance-whatsapp.server.ts");
const webhook = read("src/routes/api/public/whatsapp-webhook.ts");
const connection = read("src/lib/evolution.functions.ts");
const onboarding = read("src/routes/app/onboarding.tsx");
const trialFeatures = read("supabase/migrations/20261013183000_sync_trial_plan_features.sql");
const integrationSecrets = read("src/lib/integration-secrets.server.ts");
const connectionPage = read("src/routes/app/conexao.tsx");
const centralWhatsapp = read("src/lib/central-finance-whatsapp.server.ts");
const centralWebhook = read("src/routes/api/public/support-whatsapp-webhook.ts");

assert.match(dashboard, /requireCompanyMemberAccess/, "dashboard must authorize the tenant");
assert.match(dashboard, /fin_lancamento/, "dashboard must read real transactions");
assert.match(command, /status: "executing"/, "commands must claim an action before execution");
assert.match(command, /Nunca invente valor/, "AI must keep factual boundaries");
assert.match(whatsapp, /fin_whatsapp_identity/, "WhatsApp finance must authorize a paired phone");
assert.match(whatsapp, /Responda \*CONFIRMAR\*/, "WhatsApp actions must require confirmation");
assert.match(webhook, /reserveMessageQuota/, "WhatsApp replies must reserve monthly quota");
assert.match(webhook, /imageDataUrl/, "receipt photos must reach the multimodal interpreter");
assert.match(connection, /newStatus === "connecting"/, "QR polling must recover delayed payloads");
assert.match(
  integrationSecrets,
  /PLACEHOLDER_VALUE/,
  "integration placeholders must never be treated as configured credentials",
);
assert.match(
  integrationSecrets,
  /configured: Boolean\(usableIntegrationValue\(resolved\[def\.field\]\)\)/,
  "legacy placeholder rows must not count as configured",
);
assert.match(
  connection,
  /integration\.testOk !== true/,
  "QR generation must require a tested Evolution server",
);
assert.match(
  connection,
  /evoDelete\(row\.instance_name\)/,
  "disconnect must delete the remote instance so reconnect starts clean",
);
assert.match(
  connectionPage,
  /getFinanceWhatsappChannel/,
  "subscriber must read the central channel",
);
assert.doesNotMatch(
  connectionPage,
  /connectWhatsapp|disconnectWhatsapp/,
  "subscriber must never create or disconnect the platform WhatsApp instance",
);
assert.match(
  centralWhatsapp,
  /fin_whatsapp_identity[\s\S]*\.eq\("active", true\)/,
  "central inbound must resolve one active tenant identity before finance access",
);
assert.match(
  centralWebhook,
  /processCentralFinanceWhatsapp/,
  "the owner channel webhook must execute the tenant-aware financial flow",
);
assert.match(dashboard, /finance_profile/, "onboarding must persist the primary financial goal");
assert.match(
  onboarding,
  /finishFinanceOnboarding/,
  "onboarding must use the authorized server path so super-admin impersonation remains functional",
);
assert.doesNotMatch(
  onboarding,
  /\.from\("fin_conta"\)\.insert/,
  "onboarding must not write tenant finance rows directly from the browser",
);
assert.match(trialFeatures, /selected_plan_slug/, "trial features must follow the selected plan");

console.log("financial operational invariants: ok");
