import { describe, expect, it } from "vitest";
import {
  buildOrderNsu,
  checkoutLinkForPlan,
  duplicatePricePlans,
  isInfinitePayLink,
  isPaymentAcceptable,
  parseOrderNsu,
  planSlugForAmount,
} from "../src/lib/billing/infinitepay-rules";

const company = "b0e5f339-6c7d-4a92-a5ab-d6f660b19f65";
const plans = [
  { slug: "starter", preco_cents: 2990 },
  { slug: "pro", preco_cents: 4990 },
];

describe("InfinitePay", () => {
  it("pedido identifica empresa e plano", () => {
    expect(parseOrderNsu(buildOrderNsu(company, "pro", 1))).toEqual({ companyId: company, planSlug: "pro" });
    expect(parseOrderNsu("lixo")).toBeNull();
  });
  it("rejeita pagamento não pago ou com valor menor", () => {
    expect(isPaymentAcceptable({ paid: true, paid_amount: 4990 }, 4990)).toBe(true);
    expect(isPaymentAcceptable({ paid: true, paid_amount: 2990 }, 4990)).toBe(false);
    expect(isPaymentAcceptable({ paid: false, paid_amount: 4990 }, 4990)).toBe(false);
  });
  it("valor pago identifica o plano pelos preços atuais", () => {
    expect(planSlugForAmount(2990, plans)).toBe("starter");
    expect(planSlugForAmount(4990, plans)).toBe("pro");
    expect(planSlugForAmount(1000, plans)).toBeNull();
    expect(planSlugForAmount(5990, [{ slug: "pro", preco_cents: 5990 }])).toBe("pro");
  });
  it("preço repetido entre planos ativos é ambíguo", () => {
    const dup = [...plans, { slug: "x", preco_cents: 2990 }];
    expect(planSlugForAmount(2990, dup)).toBeNull();
    expect(duplicatePricePlans(dup).sort()).toEqual(["starter", "x"]);
  });
  it("link salvo no plano tem prioridade; reserva Link 1/Link 2", () => {
    const env = { checkout_link: "https://checkout.infinitepay.io/a/1", checkout_link_2: "https://checkout.infinitepay.io/a/2" };
    expect(checkoutLinkForPlan({ slug: "pro", checkout_url: "https://checkout.infinitepay.io/a/9" }, env)).toBe(
      "https://checkout.infinitepay.io/a/9",
    );
    expect(checkoutLinkForPlan({ slug: "starter" }, env)).toBe(env.checkout_link);
    expect(checkoutLinkForPlan({ slug: "pro", checkout_url: "" }, env)).toBe(env.checkout_link_2);
    expect(isInfinitePayLink("https://evil.com/x")).toBe(false);
  });
});
