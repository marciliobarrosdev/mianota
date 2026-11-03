import { describe, expect, it } from "vitest";
import { intentNeedsPayment, parsePaymentMethod, PAYMENT_METHODS, requirePaymentMethod } from "@/lib/finance/payment-method-rules";

describe("forma de pagamento", () => {
  it("tem as 7 opções na ordem pedida", () => {
    expect(PAYMENT_METHODS).toEqual(["pix", "cartao", "dinheiro", "transferencia", "boleto", "salario", "outro"]);
  });
  it("reconhece cada opção em texto", () => {
    expect(parsePaymentMethod("paguei no Pix")).toBe("pix");
    expect(parsePaymentMethod("no crédito")).toBe("cartao");
    expect(parsePaymentMethod("em espécie")).toBe("dinheiro");
    expect(parsePaymentMethod("fiz uma TED")).toBe("transferencia");
    expect(parsePaymentMethod("boleto")).toBe("boleto");
    expect(parsePaymentMethod("recebi o salário")).toBe("salario");
    expect(parsePaymentMethod("outro")).toBe("outro");
  });
  it("aceita números só quando permitido", () => {
    expect(parsePaymentMethod("6", { allowNumber: true })).toBe("salario");
    expect(parsePaymentMethod("6")).toBeNull();
  });
  it("forma ausente é rejeitada", () => {
    expect(parsePaymentMethod("gastei 50 no mercado")).toBeNull();
    expect(() => requirePaymentMethod(null)).toThrow("Informe a forma de pagamento.");
    expect(intentNeedsPayment("record_expense")).toBe(true);
    expect(intentNeedsPayment("create_goal")).toBe(false);
  });
});
