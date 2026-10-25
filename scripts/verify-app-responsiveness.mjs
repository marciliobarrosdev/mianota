import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const router = read("src/router.tsx");
const access = read("src/lib/app-access-cache.ts");
const masterAccess = read("src/lib/master-access-cache.ts");
const masterRoute = read("src/routes/master.tsx");
const appRoute = read("src/routes/app.tsx");
const conversations = read("src/routes/app/conversas.tsx");
const settings = read("src/routes/app/configuracoes.tsx");
const operation = read("src/routes/app/operacao.tsx");

assert.match(router, /defaultPreload: "intent"/, "menu routes must preload on intent");
assert.match(router, /defaultPreloadStaleTime: 30_000/, "route preloads must remain reusable");
assert.match(access, /ACCESS_CACHE_MS = 30_000/, "access checks must be briefly cached");
assert.match(access, /cache\.pending/, "concurrent access checks must be deduplicated");
assert.match(masterAccess, /MASTER_ACCESS_CACHE_MS = 5 \* 60_000/, "master access must be cached");
assert.match(masterAccess, /cache\.pending/, "concurrent master checks must be deduplicated");
assert.match(
  masterRoute,
  /getCachedMasterAccess\(sessionUser\.id/,
  "master navigation must reuse access",
);
// A sessão do assinante nunca pode pré-autorizar o Master (sessões separadas).
assert.doesNotMatch(
  appRoute,
  /primeMasterAccess/,
  "subscriber session must not prime master access",
);
assert.match(conversations, /activeRef\.current/, "conversation activity must use a stable ref");
assert.doesNotMatch(
  conversations,
  /\}, \[companyId, active\]\);/,
  "selecting a conversation must not reload the entire inbox",
);
assert.doesNotMatch(settings, /location\.reload/, "settings saves must not reload the whole app");
assert.match(operation, /setServices\(\(current\)/, "service saves must update the screen locally");
assert.match(operation, /Promise\.all\(\[\.\.\.updates/, "schedule rows must save in parallel");

console.log("app responsiveness invariants: ok");
