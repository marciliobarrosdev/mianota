import { describe, expect, it } from "vitest";
import { publicPlanFromRow, type PublicPlanRow } from "../src/lib/billing/public-plan-rules";

const row: PublicPlanRow = {
  slug: "starter", nome: "Basic", preco_cents: 2990, descricao: null,
  features: [], destaque: false, trial_days: 0, is_free: false, free_days: null,
};

describe("public catalog uses saved values only", () => {
  it("keeps Basic at 29,90 and Pro at 49,90 with two decimals", () => {
    expect(publicPlanFromRow(row).price).toBe("29,90");
    expect(publicPlanFromRow({ ...row, slug: "pro", preco_cents: 4990 }).price).toBe("49,90");
  });
  it("takes the free plan's seven days from its saved quota", () => {
    expect(publicPlanFromRow({ ...row, is_free: true, preco_cents: 0, free_days: 7 }).trialDays).toBe(7);
  });
  it("does not replace absent features with fictional benefits", () => {
    expect(publicPlanFromRow({ ...row, features: null }).features).toEqual([]);
    expect(publicPlanFromRow({ ...row, preco_cents: 3590 }).price).toBe("35,90");
  });
});