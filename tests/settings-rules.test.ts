import { describe, expect, it } from "vitest";
import { auditLabel, maskPhone, parseSettingsTab, passwordStrength, planValidity } from "../src/lib/settings-rules";
import { normalizeAssistantProfile } from "../src/lib/assistant-profile-rules";

describe("settings rules", () => {
  it("translates audit codes", () => {
    expect(auditLabel("insert", "fin_lancamento")).toBe("Lançamento criado");
    expect(auditLabel("password_change")).toBe("Senha alterada");
  });
  it("computes plan validity over 30 days", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    expect(planValidity("2026-10-16T00:00:00Z", now)).toEqual({ daysLeft: 15, percentLeft: 50, expired: false });
    expect(planValidity("2026-09-30T00:00:00Z", now).expired).toBe(true);
  });
  it("rates passwords", () => {
    expect(passwordStrength("abc")).toBe(0);
    expect(passwordStrength("Abcdefg1!")).toBe(4);
  });
  it("masks phone and parses tab", () => {
    expect(maskPhone("+5511999998888")).toBe("•••• 8888");
    expect(parseSettingsTab("canais")).toBe("canais");
    expect(parseSettingsTab("x")).toBe("experiencia");
  });
  it("keeps advanced profile fields when the simple form saves", () => {
    const p = normalizeAssistantProfile({ custom_rules: ["Nunca use gírias"], preferred_name: "Ana" });
    expect(p.custom_rules).toEqual(["Nunca use gírias"]);
  });
});
