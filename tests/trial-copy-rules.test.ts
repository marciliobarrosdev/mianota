import { describe, expect, it } from "vitest";
import { startButtonLabel, trialBadgeText } from "@/lib/billing/trial-copy-rules";

describe("trial copy", () => {
  it("plan without trial asks to subscribe", () => {
    expect(startButtonLabel({ nome: "Basic", trial_days: 0 })).toBe("Assinar Basic");
  });
  it("plan with trial shows its own days", () => {
    expect(startButtonLabel({ nome: "Gratuito", trial_days: 7 })).toBe("Começar 7 dias grátis");
  });
  it("no plan selected", () => {
    expect(startButtonLabel(null)).toBe("Escolha seu plano");
    expect(trialBadgeText(null)).toBe("Escolha seu plano");
  });
});
