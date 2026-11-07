import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guide = readFileSync(
  new URL("../src/routes/master/implantacao.tsx", import.meta.url),
  "utf8",
);
const security = readFileSync(
  new URL("../src/routes/master/configuracoes.tsx", import.meta.url),
  "utf8",
);

// O Master gera instruções; a identidade é alterada no projeto, não por uma gravação direta.
assert.match(guide, /function buildBrandPrompt/);
assert.match(guide, /navigator\.clipboard\.writeText\(prompt\)/);
assert.match(guide, /useBrand/);
assert.match(guide, /getMasterSetupProgress/);
assert.match(guide, /\/master\/painel/);
for (const forbidden of ["setCloneBrandConfig", "BrandAssetUploader", "ensureBrandAssetBucket"]) {
  assert.doesNotMatch(guide, new RegExp(forbidden), `guide must not contain ${forbidden}`);
  assert.doesNotMatch(security, new RegExp(forbidden), `security must not contain ${forbidden}`);
}
assert.match(security, /getAdminAccessDetails/);
assert.match(security, /getBillingWebhookInfo/);
console.log("clone brand onboarding invariants: ok");
