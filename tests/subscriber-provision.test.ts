import { describe, expect, it } from "vitest";
import { provisionTrialDays, selectablePlans } from "../src/lib/subscriber-provision-rules";

describe("novo assinante", () => {
  it("mostra todos os planos ativos e esconde os inativos", () => {
    const plans = [
      { slug: "starter", ativo: true }, { slug: "pro", ativo: true },
      { slug: "free", ativo: true, is_free: true, free_days: 7 }, { slug: "business", ativo: false },
    ];
    expect(selectablePlans(plans).map((p) => p.slug)).toEqual(["starter", "pro", "free"]);
  });
  it("plano gratuito usa o limite de dias do plano, ignorando o valor digitado", () => {
    expect(provisionTrialDays({ ativo: true, is_free: true, free_days: 7 }, 30)).toBe(7);
  });
  it("plano pago usa os dias de teste digitados", () => {
    expect(provisionTrialDays({ ativo: true, is_free: false }, 3)).toBe(3);
  });
});

import { freePlanAlreadyUsed } from "../src/lib/subscriber-provision-rules";
describe("plano gratuito uma vez por conta", () => {
  it("bloqueia quem já usou", () => expect(freePlanAlreadyUsed([{ email: "a@b.com" }])).toBe(true));
  it("libera quem nunca usou", () => expect(freePlanAlreadyUsed([])).toBe(false));
});
