import { describe, expect, it } from "vitest";
import { paidPlansForCheckout } from "@/lib/billing/checkout-readiness-rules";

describe("paidPlansForCheckout", () => {
  it("never lists a free plan", () => {
    const list = paidPlansForCheckout([
      { id: 1, nome: "Gratuito", is_free: true, checkout_url: null },
      { id: 2, nome: "Basic", is_free: false, checkout_url: "https://checkout.infinitepay.io/x" },
    ]);
    expect(list.map((p) => p.name)).toEqual(["Basic"]);
  });
  it("paid plan without link is not ready", () => {
    expect(paidPlansForCheckout([{ id: 3, nome: "Pro", is_free: false, checkout_url: "" }])[0].ready).toBe(false);
  });
});
