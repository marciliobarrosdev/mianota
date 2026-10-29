import { describe, expect, it } from "vitest";
import {
  INFINITEPAY_PLAN_PRICES_CENTS,
  buildOrderNsu,
  isPaymentAcceptable,
  parseOrderNsu,
} from "../src/lib/billing/infinitepay-rules";

const company = "b0e5f339-6c7d-4a92-a5ab-d6f660b19f65";

describe("InfinitePay", () => {
  it("plano 1 custa R$ 29,90 e plano 2 R$ 49,90", () => {
    expect(INFINITEPAY_PLAN_PRICES_CENTS.starter).toBe(2990);
    expect(INFINITEPAY_PLAN_PRICES_CENTS.pro).toBe(4990);
  });
  it("pedido identifica empresa e plano", () => {
    expect(parseOrderNsu(buildOrderNsu(company, "pro", 1))).toEqual({ companyId: company, planSlug: "pro" });
    expect(parseOrderNsu("lixo")).toBeNull();
  });
  it("rejeita pagamento não pago ou com valor menor", () => {
    expect(isPaymentAcceptable({ paid: true, paid_amount: 4990 }, 4990)).toBe(true);
    expect(isPaymentAcceptable({ paid: true, paid_amount: 2990 }, 4990)).toBe(false);
    expect(isPaymentAcceptable({ paid: false, paid_amount: 4990 }, 4990)).toBe(false);
  });
});
