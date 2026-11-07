import { describe, expect, it } from "vitest";
import { canSendWelcome, welcomeIdempotencyKey } from "./welcome-email-rules";

describe("registration welcome eligibility", () => {
  it("never sends for old registrations", () => {
    expect(canSendWelcome({ eligible: false, claimedAt: null, sentAt: null })).toBe(false);
  });
  it("allows newly completed registration", () => {
    expect(canSendWelcome({ eligible: true, claimedAt: null, sentAt: null })).toBe(true);
  });
  it("does not resend an already claimed registration", () => {
    expect(canSendWelcome({ eligible: true, claimedAt: "2026-11-07T02:25:00Z", sentAt: null })).toBe(false);
  });
  it("does not resend after successful delivery", () => {
    expect(canSendWelcome({ eligible: true, claimedAt: null, sentAt: "2026-11-07T02:25:00Z" })).toBe(false);
  });
  it("uses one stable provider key per company", () => {
    expect(welcomeIdempotencyKey("company-123")).toBe("registration-welcome/company-123");
    expect(welcomeIdempotencyKey("company-456")).not.toBe(welcomeIdempotencyKey("company-123"));
  });
});