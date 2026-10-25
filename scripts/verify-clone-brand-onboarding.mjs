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

// O superadmin orienta a personalização, mas não edita a identidade do clone.
assert.match(guide, /O clone é a base/);
assert.match(guide, /https:\/\/turbosaas\.pro\/AlunoLogin/);
assert.match(guide, /Converse com o agente/);
assert.match(guide, /Copie o prompt pronto/);
assert.match(guide, /https:\/\/lovable\.dev\/projects/);
assert.match(guide, /Identidade não é editada no superadmin/);
assert.match(guide, /\/master\/whatsapp-qr/);
assert.match(guide, /\/master\/planos/);
assert.match(guide, /\/master\/novo-assinante/);
assert.match(guide, /\/master\/painel/);

for (const forbidden of [
  "CloneBrandForm",
  "getCloneBrandConfig",
  "setCloneBrandConfig",
  "BrandAssetUploader",
  "primary_color",
  "product_name",
  "legal_document",
  "CNPJ",
  "Razão social",
  "Copiar prompt",
]) {
  assert.doesNotMatch(guide, new RegExp(forbidden), `guide must not contain ${forbidden}`);
  assert.doesNotMatch(security, new RegExp(forbidden), `security must not contain ${forbidden}`);
}

assert.match(security, /Nome, cores, logo, copy, personagem e dados legais/);
assert.match(security, /não são editados/);
assert.match(security, /Super admins autorizados/);
assert.match(security, /Webhooks?/i);
assert.match(security, /\/superadmin/);

console.log("clone brand onboarding invariants: ok");
