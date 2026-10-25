import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Garante que a sessão do assinante e a do proprietário nunca se misturem.
const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

const adminClient = read("src/lib/auth/superadmin-client.ts");
const realm = read("src/lib/auth/realm-supabase.ts");
const middleware = read("src/lib/auth/realm-auth-middleware.ts");
const start = read("src/start.ts");
const superadmin = read("src/routes/superadmin.tsx");
const master = read("src/routes/master.tsx");
const entrar = read("src/routes/entrar.tsx");
const app = read("src/routes/app.tsx");
const appShell = read("src/components/app-shell.tsx");
const bootstrap = read("src/lib/remix-bootstrap.ts");

// 1) Cliente administrativo com armazenamento, persistência e refresh próprios.
const keyMatch = adminClient.match(/SUPERADMIN_AUTH_STORAGE_KEY = "([^"]+)"/);
assert.ok(keyMatch, "admin client must declare its own storage key");
assert.notEqual(keyMatch[1], "", "admin storage key must not be empty");
assert.doesNotMatch(keyMatch[1], /^sb-[a-z0-9]+-auth-token$/, "admin key must differ from default");
assert.match(adminClient, /storageKey: SUPERADMIN_AUTH_STORAGE_KEY/);
assert.match(adminClient, /persistSession: true/);
assert.match(adminClient, /autoRefreshToken: true/);
assert.match(
  adminClient,
  /detectSessionInUrl: \(current\) => current\.pathname\.startsWith\("\/superadmin"\)/,
);

// 2) /superadmin e /master só falam com o cliente administrativo.
for (const [name, source] of [
  ["superadmin.tsx", superadmin],
  ["master.tsx", master],
  ["remix-bootstrap.ts", bootstrap],
]) {
  assert.doesNotMatch(
    source,
    /@\/integrations\/supabase\/client"/,
    `${name} must not use subscriber client`,
  );
  assert.doesNotMatch(
    source,
    /(^|[^A-Za-z])supabase\./m,
    `${name} must not call the subscriber client`,
  );
  assert.match(source, /superadminSupabase/, `${name} must use the admin client`);
}
assert.match(superadmin, /superadminSupabase\.auth\.signInWithPassword/);
assert.match(superadmin, /superadminSupabase\.rpc\("is_super_admin"\)/);
assert.match(superadmin, /superadminSupabase\.auth\.getUser\(\)/);
assert.match(master, /superadminSupabase\.auth\.getUser\(\)/);
assert.match(master, /superadminSupabase\.rpc\("is_super_admin"\)/);

// 3) Saídas são locais e restritas ao próprio domínio.
assert.match(realm, /auth\.signOut\(\{ scope: "local" \}\)/);
assert.doesNotMatch(master, /signOutRealm\("subscriber"\)/);
assert.match(master, /signOutRealm\("superadmin"\)/);
assert.doesNotMatch(entrar, /signOutRealm\("superadmin"\)|superadminSupabase/);
assert.doesNotMatch(appShell, /signOutRealm\("superadmin"\)/);
assert.match(appShell, /signOutRealm\("subscriber"\)/);

// 4) /entrar e /app nunca usam a sessão do proprietário (exceto impersonação explícita na aba).
assert.match(entrar, /from "@\/integrations\/supabase\/client"/);
assert.doesNotMatch(entrar, /\/master/);
assert.match(app, /const realm: AuthRealm = impersonateId \? "superadmin" : "subscriber"/);
assert.doesNotMatch(app, /from "@\/integrations\/supabase\/client"/);
assert.doesNotMatch(app, /primeMasterAccess/);
assert.match(realm, /if \(isSuperadminPath\(path\)\) return "superadmin"/);
assert.match(realm, /isAppPath\(path\) && readImpersonationCompanyId\(\)/);

// 5) Chamadas ao servidor levam o token do domínio da aba, não o token gerado padrão.
assert.match(start, /functionMiddleware: \[attachRealmSupabaseAuth\]/);
assert.doesNotMatch(start, /functionMiddleware: \[[^\]]*attachSupabaseAuth\b/);
assert.match(middleware, /getRealmSupabase\(\)\.auth\.getSession\(\)/);

// 6) Nenhuma tela do Master importa o cliente do assinante.
function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk(join(root, "src/routes/master"))) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /@\/integrations\/supabase\/client"/,
    `${file} must use the realm/admin client`,
  );
}

// 7) Só as páginas do assinante e a landing pública usam o cliente padrão diretamente.
const allowedDirect = new Set([
  "src/routes/entrar.tsx",
  "src/routes/esqueci-senha.tsx",
  "src/routes/reset-senha.tsx",
  "src/routes/trocar-senha.tsx",
  "src/routes/index.tsx",
  "src/lib/auth/realm-supabase.ts",
  "src/lib/auth/superadmin-client.ts",
]);
for (const file of walk(join(root, "src"))) {
  const rel = file.slice(root.length);
  if (rel.startsWith("src/integrations/") || !/\.(ts|tsx)$/.test(rel)) continue;
  const source = readFileSync(file, "utf8");
  if (/from "@\/integrations\/supabase\/client"/.test(source)) {
    assert.ok(allowedDirect.has(rel), `${rel} must import supabase from @/lib/auth/realm-supabase`);
  }
}

console.log("auth realm separation invariants: ok");
