import { describe, expect, it } from "vitest";
import { subscriberDisplayName } from "../src/lib/common/subscriber-display-rules";

describe("subscriberDisplayName", () => {
  it("prefers the responsible person", () => {
    expect(subscriberDisplayName({ nome_responsavel: "Ana Souza", nome: "Loja" }, "x@y.com")).toBe("Ana Souza");
  });
  it("falls back to company name", () => {
    expect(subscriberDisplayName({ nome_responsavel: " ", nome: "Loja" }, "x@y.com")).toBe("Loja");
  });
  it("falls back to e-mail prefix", () => {
    expect(subscriberDisplayName(null, "osmkt13@gmail.com")).toBe("osmkt13");
  });
});
