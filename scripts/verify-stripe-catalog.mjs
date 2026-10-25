import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const server = read("../src/lib/stripe-admin.functions.ts");
const screen = read("../src/routes/master/planos.tsx");

assert.match(server, /is_super_admin/, "Stripe catalog must require the installation owner");
assert.match(server, /resolveIntegration\("stripe"\)/, "Stripe key must stay in server-side vault");
assert.match(server, /prices\?/, "Stripe prices must be fetched from the Stripe API");
assert.match(server, /"products"/, "Stripe product creation must use the Stripe API");
assert.match(server, /"prices"/, "Stripe price creation must use the Stripe API");
assert.doesNotMatch(
  screen,
  /label="Stripe Price ID"|placeholder="price_1AbC/,
  "Owner UI must not require copying a Price ID",
);
assert.match(screen, /Criar automaticamente no Stripe/);
assert.match(screen, /to="\/master\/pagamentos"/);
assert.match(screen, /stripe_product_id: result\.price\.productId/);

console.log("stripe catalog invariants: ok");
