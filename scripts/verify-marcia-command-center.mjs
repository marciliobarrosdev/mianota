import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const functions = read("src/lib/finance-command.functions.ts");
const chat = read("src/components/finance/marcia-chat.tsx");
const chatHook = read("src/hooks/use-marcia-finance-chat.ts");
const aiRequest = read("src/lib/ai-request.server.ts");
const lovableAi = read("src/lib/lovable-ai.server.ts");
const providerAi = read("src/lib/ai-provider.server.ts");
const aiConfig = read("src/lib/ai-config.functions.ts");
const aiCreditsPage = read("src/routes/master/ia-creditos.tsx");
const migration = read("supabase/migrations/20261018120000_marcia_finance_foundation.sql");
const shell = read("src/components/app-shell.tsx");

assert.match(functions, /requireCompanyMemberAccess/, "commands must authorize the tenant");
assert.match(functions, /consume_ai_credit/, "each app AI response must consume one credit");
assert.match(functions, /refund_ai_credit/, "failed AI calls must refund the credit");
assert.match(functions, /requiredFields/, "commands must compute missing required fields");
assert.match(functions, /Qual é o valor\?/, "the assistant must ask for missing information");
assert.match(functions, /command\.status !== "ready"/, "execution must require an approved draft");
assert.match(functions, /eq\("ai_command_id", data\.commandId\)/, "effects must be idempotent");
for (const table of ["fin_lancamento", "fin_orcamento", "fin_meta", "fin_recorrencia"]) {
  assert.match(functions, new RegExp(table), `commands must execute against ${table}`);
}
assert.match(chat, /SpeechRecognition/, "the chat must accept speech");
assert.match(
  chat,
  /Confira antes de registrar/,
  "material actions must have explicit confirmation",
);
assert.match(chat, /onConfirm\(\)/, "confirmation must be an explicit user action");
assert.match(chat, /está analisando/, "AI latency must show the animated assistant state");
assert.match(
  aiRequest,
  /AI_REQUEST_TIMEOUT_MS = 25_000/,
  "AI requests must have a bounded server timeout",
);
assert.match(
  aiRequest,
  /AI_REQUEST_MAX_ATTEMPTS = 2/,
  "transient provider failures must be retried automatically",
);
assert.match(
  aiRequest,
  /RETRYABLE_STATUS\.has\(response\.status\)/,
  "retry must be limited to transient provider responses",
);
assert.match(
  aiRequest,
  /signal: AbortSignal\.timeout\(Math\.min\(AI_REQUEST_ATTEMPT_TIMEOUT_MS, remaining\)\)/,
  "each provider attempt must actually be aborted inside the total timeout budget",
);
assert.match(
  aiRequest,
  /seu crédito será devolvido/,
  "a timed-out subscriber must receive a clear recovery message",
);
assert.match(lovableAi, /fetchAiProvider\("Lovable AI"/, "Lovable AI must use the timeout guard");
assert.match(providerAi, /fetchAiProvider\("OpenAI"/, "OpenAI must use the timeout guard");
assert.match(providerAi, /fetchAiProvider\("Anthropic"/, "Anthropic must use the timeout guard");
assert.match(
  aiConfig,
  /await probeAiProvider\(data\.provider, data\.apiKey\)/,
  "BYOK credentials must be validated automatically when saved",
);
assert.doesNotMatch(
  aiCreditsPage,
  />\s*Testar \{MODE_LABEL\[mode\]\}/,
  "the owner must not have to run a separate AI test",
);
assert.match(
  aiCreditsPage,
  /Nenhum teste ou chave é necessário/,
  "the managed Lovable provider must be explained as automatic",
);
assert.match(chat, /application\/pdf/, "the chat must accept PDF receipts");
assert.match(
  chatHook,
  /commandId: commandIdRef\.current/,
  "follow-up answers must preserve context",
);
assert.match(
  chatHook,
  /CHAT_REQUEST_TIMEOUT_MS = 35_000/,
  "the chat must stop waiting even if the whole server request stalls",
);
assert.match(
  chatHook,
  /signal: AbortSignal\.timeout\(CHAT_REQUEST_TIMEOUT_MS\)/,
  "the client request must be aborted after the watchdog timeout",
);
assert.match(chatHook, /executeFinanceCommand/, "the chat must use the real execution flow");
assert.match(shell, /\/app\/marcia/, "the financial assistant must be primary navigation");
assert.match(shell, /\/app\/movimentacoes/, "movements must be discoverable in navigation");
assert.match(migration, /fin_conta/, "financial accounts need persistent storage");
assert.match(migration, /fin_orcamento/, "budgets need persistent storage");
assert.match(migration, /fin_meta/, "goals need persistent storage");
assert.match(
  migration,
  /has_company_access\(company_id\)/,
  "financial tables must be tenant scoped",
);

console.log("financial command center invariants: ok");
