import { describe, expect, it } from "vitest";
import { CONSENT_POLICY_VERSION, buildConsent, isAllowed, parseConsent } from "@/lib/common/consent-rules";

const now = new Date("2026-11-10T12:00:00Z");

describe("consent rules", () => {
  it("optional categories are off until explicitly allowed", () => {
    const r = buildConsent({}, now);
    expect(r.categories).toEqual({ preferences: false, analytics: false, marketing: false });
    expect(isAllowed(null, "analytics")).toBe(false);
    expect(isAllowed(null, "essential")).toBe(true);
  });
  it("stores version and 365-day validity", () => {
    const r = buildConsent({ analytics: true }, now);
    expect(r.version).toBe(CONSENT_POLICY_VERSION);
    expect(r.expiresAt).toBe("2027-11-10T12:00:00.000Z");
  });
  it("expired consent asks again", () => {
    const r = buildConsent({ preferences: true }, now, 1);
    expect(parseConsent(JSON.stringify(r), new Date("2026-11-12T00:00:00Z"))).toBeNull();
  });
  it("other policy version asks again", () => {
    const r = { ...buildConsent({}, now), version: "old" };
    expect(parseConsent(JSON.stringify(r), now)).toBeNull();
  });
  it("garbage is ignored", () => {
    expect(parseConsent("{bad", now)).toBeNull();
  });
});
