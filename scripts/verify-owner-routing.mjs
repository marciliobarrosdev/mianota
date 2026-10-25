import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const app = read("../src/routes/app.tsx");
const entrar = read("../src/routes/entrar.tsx");
const master = read("../src/routes/master.tsx");
const superadmin = read("../src/routes/superadmin.tsx");
const installationClient = read("../src/lib/remix-installation-client.ts");

const indexOf = (source, needle) => {
  const index = source.indexOf(needle);
  assert.ok(index >= 0, `missing: ${needle}`);
  return index;
};

// A instalação só pode ser assumida pela porta administrativa dedicada.
assert.match(superadmin, /createFileRoute\("\/superadmin"\)/);
assert.match(superadmin, /ensureRemixBootstrap/);
assert.match(superadmin, /readRemixInstallationClaimed/);
assert.match(installationClient, /"is_remix_installation_claimed"/);
assert.match(installationClient, /TRANSIENT_NETWORK_ERROR/);
assert.match(superadmin, /to: "\/master\/painel"/);
assert.match(superadmin, /emailRedirectTo: `\$\{window\.location\.origin\}\/superadmin`/);

// O login do assinante jamais promove usuário, prepara o clone ou abre o Master.
assert.doesNotMatch(entrar, /ensureRemixBootstrap/);
assert.doesNotMatch(entrar, /is_remix_installation_claimed/);
assert.doesNotMatch(entrar, /\/master\//);
assert.doesNotMatch(entrar, /Crie seu sistema/);
assert.doesNotMatch(entrar, /Nome da sua empresa/);
assert.match(entrar, /Para administrar o sistema, entre em \/superadmin/);

const regularRoleCheck = indexOf(entrar, '"is_super_admin"');
assert.ok(
  regularRoleCheck < indexOf(entrar, '.from("company_user")'),
  "subscriber login must reject super admin before tenant lookup",
);
assert.match(
  entrar.slice(regularRoleCheck, indexOf(entrar, '.from("company_user")')),
  /supabase\.auth\.signOut\(\{ scope: "local" \}\)/,
  "super admin is signed out (subscriber session only) from subscriber login",
);

// /app nunca assume instalação; conta de proprietário na sessão do assinante
// perde só a sessão do assinante e vê o login administrativo (nunca o Master direto).
assert.doesNotMatch(app, /ensureRemixBootstrap/);
const appSuper = indexOf(app, 'if (realm === "subscriber" && ctx.isSuperAdmin)');
const appSuperBlock = app.slice(appSuper, indexOf(app, "trialExpired"));
assert.match(appSuperBlock, /signOutRealm\("subscriber"\)/);
assert.match(appSuperBlock, /throw redirect\(\{ to: "\/superadmin" \}\)/);
assert.doesNotMatch(appSuperBlock, /\/master/);
assert.ok(appSuper < indexOf(app, "trialExpired"), "admin routing precedes billing gates");

// Master só aceita instalação já assumida e sempre volta para /superadmin.
assert.doesNotMatch(master, /ensureRemixBootstrap/);
assert.match(master, /if \(!sessionUser\) throw redirect\(\{ to: "\/superadmin" \}\)/);
assert.match(master, /if \(claimed !== true\) throw redirect\(\{ to: "\/superadmin" \}\)/);
assert.doesNotMatch(master, /window\.location\.href = "\/entrar"/);
assert.doesNotMatch(master, /Voltar ao app/);

assert.doesNotMatch(
  app + entrar,
  /luis(?:pedro)?bedinot|clone_owner_email|super_admin_email/iu,
  "routing must not depend on a hardcoded owner identity",
);
console.log("owner routing invariants: ok");
