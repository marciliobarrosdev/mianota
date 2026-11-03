import { describe, expect, it } from "vitest";
import { checkoutStatus } from "@/lib/billing/payment-checkout-rules";

const plans = [{ mode: "external" as const, ready: true }];

describe("checkoutStatus", () => {
  it("is active when saved, tested and used by a ready plan", () => {
    expect(checkoutStatus("infinitepay", { configured: true, testOk: true }, plans).active).toBe(true);
  });
  it("is not active without a successful test", () => {
    expect(checkoutStatus("infinitepay", { configured: true, testOk: false }, plans).label).toBe("Falta testar");
  });
  it("is not active when no plan uses it", () => {
    expect(checkoutStatus("stripe", { configured: true, testOk: true }, plans).active).toBe(false);
  });
});
