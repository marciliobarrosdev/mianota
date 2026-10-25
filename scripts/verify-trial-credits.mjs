import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const login = read("src/routes/entrar.tsx");
const checkout = read("src/routes/app/checkout.tsx");
const plans = read("src/routes/master/planos.tsx");
const companies = read("src/routes/master/assinantes.tsx");
const banner = read("src/components/trial-banner.tsx");
const financeWhatsapp = read("src/lib/finance-whatsapp.server.ts");
const migration = read("supabase/migrations/20261013153000_trial_credit_experience.sql");

assert.match(login, /friendlySignupError/, "signup errors must be translated");
assert.match(login, /easy to guess/, "weak-password response must be recognized");
assert.match(login, /10\+ caracteres/, "signup must explain the password rule before submit");
assert.match(
  login,
  /Seu teste do.*será ativado automaticamente/s,
  "signup must explain that the LP plan starts automatically",
);
assert.match(
  checkout,
  /Plano escolhido na página inicial/,
  "the selected LP plan must not be presented as a new decision",
);
assert.match(
  checkout,
  /void iniciarTrial\(chosenPlan\)/,
  "a valid LP plan must start its trial automatically after signup",
);
assert.match(
  checkout,
  /createCompany\([\s\S]*plano_slug: chosenPlan\.slug/,
  "automatic activation must persist the exact selected plan server-side",
);

assert.match(plans, /Oferecer trial neste plano/, "plan must allow enabling trial");
assert.match(plans, /creditos_trial/, "plan must persist trial credits");
assert.match(plans, /creditos_mensais/, "plan must persist monthly AI credits");
assert.match(companies, /Dar trial para/, "company action must use a guided trial dialog");
assert.match(companies, /Créditos de IA/, "trial dialog must request AI credits");

assert.match(banner, /restam/, "trial banner must show remaining days");
assert.match(banner, /crédito = 1 resposta enviada/, "trial banner must explain credit usage");
assert.match(banner, /result\.saldo/, "trial banner must load the current persisted balance");

const handler = financeWhatsapp.slice(
  financeWhatsapp.indexOf("export async function handleFinanceWhatsapp"),
);
const debitIndex = handler.indexOf('"consume_ai_credit"');
const aiIndex = handler.indexOf("await interpret(");
const refundIndex = handler.indexOf('"refund_ai_credit"');
assert.ok(
  debitIndex >= 0 && debitIndex < aiIndex,
  "one credit must be reserved before the AI call",
);
assert.ok(refundIndex > debitIndex, "failed attempts must be able to refund the reserved credit");

assert.match(migration, /grant_company_trial/, "database must expose an atomic trial grant");
assert.match(migration, /auth\.role\(\).*service_role/s, "trial grant must be server-only");
assert.match(migration, /creditos_saldo = _credits/, "trial grant must set the chosen balance");
assert.match(migration, /motivo, ref[\s\S]*'trial_grant'/, "trial grant must be audited");
assert.match(
  migration,
  /status_cobranca := 'checkout_pending'/,
  "disabled trial must go to checkout",
);

console.log("trial credits verified");
