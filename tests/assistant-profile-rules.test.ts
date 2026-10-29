import { describe, expect, it } from "vitest";
import {
  effectiveBudgetAlertPercent,
  isLargeExpense,
  matchCategoryRule,
  normalizeAssistantProfile,
  personalizeReply,
} from "../src/lib/assistant-profile-rules";

const CAT = "11111111-1111-1111-1111-111111111111";

describe("assistant profile rules", () => {
  it("keeps at most 10 custom rules", () => {
    const p = normalizeAssistantProfile({ custom_rules: Array.from({ length: 15 }, (_, i) => `regra ${i}`) });
    expect(p.custom_rules).toHaveLength(10);
  });
  it("always forces confirm-before-save on", () => {
    expect(normalizeAssistantProfile({ ask_before_save: false }).ask_before_save).toBe(true);
  });
  it("clamps budget alert percent to 50-100", () => {
    expect(normalizeAssistantProfile({ alert_budget_percent: 20 }).alert_budget_percent).toBe(50);
    expect(normalizeAssistantProfile({ alert_budget_percent: 140 }).alert_budget_percent).toBe(100);
  });
  it("category budget percent wins over profile default", () => {
    expect(effectiveBudgetAlertPercent(90, { alert_budget_percent: 70 })).toBe(90);
    expect(effectiveBudgetAlertPercent(null, { alert_budget_percent: 70 })).toBe(70);
  });
  it("matches category rule by keyword", () => {
    const rules = normalizeAssistantProfile({ category_rules: [{ keyword: "Mercado", categoryId: CAT }] }).category_rules;
    expect(matchCategoryRule("gastei 50 no mercado", rules)).toBe(CAT);
    expect(matchCategoryRule("gastei 50 no posto", rules)).toBeNull();
  });
  it("large expense only when threshold set and insights on", () => {
    expect(isLargeExpense(50000, { large_expense_cents: 50000, proactive_insights: true })).toBe(true);
    expect(isLargeExpense(50000, { large_expense_cents: 50000, proactive_insights: false })).toBe(false);
    expect(isLargeExpense(50000, { large_expense_cents: 0, proactive_insights: true })).toBe(false);
  });
  it("uses preferred name and strips emojis when disabled", () => {
    const p = normalizeAssistantProfile({ preferred_name: "Luis Silva", use_emojis: false, assistant_style: "motivadora" });
    const out = personalizeReply("Pronto ✅ registrado.", p);
    expect(out.startsWith("Luis, pronto")).toBe(true);
    expect(out).not.toMatch(/✅|💪/u);
  });
});
