// Bloqueio de bypass da troca de canal central: a RPC switch_central_channel
// (migração aplicada e migração corretiva) precisa recusar a ativação quando o
// registro compartilhado não descreve o destino conectado.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dir, "..", "drizzle", "migrations");
const journal = JSON.parse(readFileSync(join(dir, "meta", "_journal.json"), "utf8")) as {
  entries: { tag: string }[];
};

function rpcBodies() {
  const out: { tag: string; body: string }[] = [];
  for (const { tag } of journal.entries) {
    const sql = readFileSync(join(dir, `${tag}.sql`), "utf8");
    const start = sql.indexOf("CREATE OR REPLACE FUNCTION public.switch_central_channel");
    if (start < 0) continue;
    const end = sql.indexOf("END $$;", start);
    out.push({ tag, body: sql.slice(start, end).replace(/\s+/g, " ") });
  }
  return out;
}

const bodies = rpcBodies();
const latest = bodies[bodies.length - 1];

describe("RPC switch_central_channel endurecida", () => {
  test("existe na migração aplicada e numa migração corretiva posterior", () => {
    expect(bodies.map((b) => b.tag)).toContain("0004_central_channel_and_purchase_onboarding");
    expect(bodies.length).toBeGreaterThanOrEqual(2);
    expect(latest.tag).not.toBe("0004_central_channel_and_purchase_onboarding");
  });

  for (const { tag, body } of bodies) {
    describe(tag, () => {
      test("continua exigindo superadmin", () => {
        expect(body).toMatch(/IF NOT public\.is_super_admin\(\) THEN RAISE EXCEPTION/);
      });
      test("Evolution: bloqueia sem provider=evolution, status=connected e instância", () => {
        const evo = body.match(/IF _to = 'evolution' AND \((.*?)\) THEN RAISE EXCEPTION/);
        expect(evo).not.toBeNull();
        const cond = evo![1];
        expect(cond).toContain("coalesce(_provider, '') <> 'evolution'");
        expect(cond).toContain("coalesce(_status, '') <> 'connected'");
        expect(cond).toContain("btrim(coalesce(_instance, '')) = ''");
        // Condições combinadas com OR: qualquer uma falhando bloqueia.
        expect(cond.split(" OR ").length).toBe(3);
      });
      test("Meta: bloqueia sem provider=meta, status=connected e test_ok=true", () => {
        expect(body).toMatch(
          /IF _to = 'meta' THEN IF coalesce\(_provider, ''\) <> 'meta' OR coalesce\(_status, ''\) <> 'connected' THEN RAISE EXCEPTION/,
        );
        expect(body).toMatch(
          /SELECT test_ok INTO _meta_ok FROM public\.platform_integration_status WHERE provider = 'whatsapp_meta'; IF coalesce\(_meta_ok, false\) = false THEN RAISE EXCEPTION/,
        );
      });
      test("verificações acontecem sob lock e antes de liberar o gatilho", () => {
        const lock = body.indexOf("FOR UPDATE");
        const evo = body.indexOf("IF _to = 'evolution'");
        const meta = body.indexOf("IF _to = 'meta'");
        const unlock = body.indexOf("set_config('marcia.channel_switch', 'on'");
        expect(lock).toBeGreaterThan(0);
        expect(evo).toBeGreaterThan(lock);
        expect(meta).toBeGreaterThan(evo);
        expect(unlock).toBeGreaterThan(meta);
      });
    });
  }
});

describe("backend testa o destino ao vivo antes da RPC", () => {
  const src = readFileSync(join(import.meta.dir, "..", "src", "lib", "master-onboarding.functions.ts"), "utf8");
  const handler = src.slice(src.indexOf("export const switchCentralChannel"), src.indexOf("export const saveMetaTemplateConfig"));
  test("Evolution exige estado open e Meta exige teste aprovado antes da RPC", () => {
    const rpc = handler.indexOf('rpc("switch_central_channel"');
    expect(handler.indexOf('state !== "open"')).toBeGreaterThan(0);
    expect(handler.indexOf('state !== "open"')).toBeLessThan(rpc);
    expect(handler.indexOf("testMetaConnection()")).toBeGreaterThan(0);
    expect(handler.indexOf("testMetaConnection()")).toBeLessThan(rpc);
  });
});
