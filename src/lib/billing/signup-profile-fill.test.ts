import { describe, it, expect } from "vitest";
import { fillOnlyEmpty } from "./signup-profile-rules";

describe("fillOnlyEmpty", () => {
  it("não sobrescreve nome já salvo", () => {
    expect(fillOnlyEmpty({ nome: "Maria do Socorro" }, { nome: "Finanças de Socorro" })).toEqual({});
  });
  it("preenche campos vazios", () => {
    expect(fillOnlyEmpty({ nome: "A", cidade: "" }, { nome: "B", cidade: "Recife" })).toEqual({ cidade: "Recife" });
  });
  it("ignora valores novos vazios", () => {
    expect(fillOnlyEmpty({ telefone: null }, { telefone: null })).toEqual({});
  });
});
