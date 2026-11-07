import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("bootstrap_remix_instance", () => {
  it("never rewrites plan rows (prices/status belong to /master/planos)", () => {
    const sql = readFileSync("drizzle/migrations/0020_stop_bootstrap_plan_overwrite.sql", "utf8");
    expect(sql).not.toMatch(/UPDATE\s+public\.plan/i);
    expect(sql).not.toMatch(/current_user\s+IN/i);
  });
});
