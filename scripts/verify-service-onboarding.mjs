import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const onboarding = read("src/routes/app/onboarding.tsx");
const onboardingServer = read("src/lib/finance-dashboard.functions.ts");
const command = read("src/lib/finance-command.functions.ts");
const commandRoute = read("src/routes/app/marcia.tsx");
const chat = read("src/components/finance/marcia-chat.tsx");
const pageKit = read("src/components/marcia/page-kit.tsx");
const banner = read("src/components/trial-banner.tsx");

assert.match(onboarding, /O que você quer melhorar primeiro/);
assert.match(onboarding, /Crie sua primeira conta/);
assert.match(onboardingServer, /seed_finance_personal_categories/);
assert.match(onboardingServer, /finishFinanceOnboarding/);
assert.match(onboardingServer, /supabaseAdmin/);
assert.match(onboarding, /Pronto\. Agora é só contar/);
assert.doesNotMatch(onboarding, /serviço|agenda|profissional/i);
assert.match(command, /Nunca invente valor, conta, categoria, data, meta ou pagamento/);
assert.match(command, /requiredFields/);
assert.match(commandRoute, /<MarciaChat/);
assert.match(chat, /está analisando/);
assert.match(chat, /só registra depois da sua confirmação/);
assert.match(pageKit, /role="status"/, "AI progress must be announced accessibly");
assert.match(pageKit, /está organizando/, "AI progress must explain the wait");
assert.doesNotMatch(
  banner,
  /Envios que falham não consomem saldo/,
  "trial banner must not advertise failure states",
);

console.log("financial onboarding verified");
