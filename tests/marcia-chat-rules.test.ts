import { describe, expect, it } from "vitest";
import { canUndo, contextualSuggestions } from "../src/lib/marcia-chat-rules";

describe("desfazer lançamento da MIA", () => {
  const now = new Date("2026-10-29T15:00:00Z");
  it("permite até 10 minutos", () => {
    expect(canUndo("2026-10-29T14:51:00Z", now)).toBe(true);
  });
  it("bloqueia depois de 10 minutos", () => {
    expect(canUndo("2026-10-29T14:49:00Z", now)).toBe(false);
  });
});

describe("sugestões por contexto", () => {
  it("sugere pagar a conta que vence hoje e o orçamento estourando", () => {
    const list = contextualSuggestions({
      today: "2026-10-10",
      upcoming: [{ description: "Conta de luz", dueDate: "2026-10-10", type: "despesa" }],
      budgets: [{ name: "Mercado", percentage: 92 }],
    });
    expect(list[0]).toBe("Paguei Conta de luz hoje");
    expect(list[1]).toBe("Quanto ainda posso gastar com Mercado?");
    expect(list).toHaveLength(4);
  });
});
