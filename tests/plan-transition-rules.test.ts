import { describe, expect, it } from "vitest";
import {
  allowedTargetPlans,
  companyNeedsPayment,
  transitionKind,
} from "@/lib/billing/plan-transition-rules";

const free = { slug: "free", is_free: true, preco_cents: 0 };
const basic = { slug: "starter", is_free: false, preco_cents: 2990 };
const pro = { slug: "pro", is_free: false, preco_cents: 4990 };
const all = [free, basic, pro];
const slugs = (l: { slug: string }[]) => l.map((p) => p.slug);

describe("plan transitions", () => {
  it("conta nova pode escolher Grátis, Basic ou Pro", () => {
    expect(slugs(allowedTargetPlans(all, { hasCompany: false }))).toEqual(["free", "starter", "pro"]);
  });
  it("Grátis só uma vez por conta", () => {
    expect(slugs(allowedTargetPlans(all, { hasCompany: false, freeAlreadyUsed: true }))).toEqual([
      "starter",
      "pro",
    ]);
  });
  it("conta existente nunca volta ao Grátis", () => {
    expect(slugs(allowedTargetPlans(all, { hasCompany: true }))).toEqual(["starter", "pro"]);
  });
  it("Grátis → Basic/Pro é upgrade", () => {
    expect(transitionKind(free, basic)).toBe("upgrade");
    expect(transitionKind(free, pro)).toBe("upgrade");
  });
  it("Basic → Basic renova, Basic → Pro sobe", () => {
    expect(transitionKind(basic, basic)).toBe("renew");
    expect(transitionKind(basic, pro)).toBe("upgrade");
  });
  it("Pro → Pro renova, Pro → Basic desce", () => {
    expect(transitionKind(pro, pro)).toBe("renew");
    expect(transitionKind(pro, basic)).toBe("downgrade");
  });
});

describe("companyNeedsPayment", () => {
  const now = Date.parse("2026-11-04T12:00:00Z");
  it("Grátis vencido após 7 dias exige pagamento", () => {
    expect(companyNeedsPayment({ status_cobranca: "trial", trial_ate: "2026-11-03T12:00:00Z", creditos_saldo: 10 }, now)).toBe(true);
  });
  it("Grátis sem créditos de IA exige pagamento", () => {
    expect(companyNeedsPayment({ status_cobranca: "trial", trial_ate: "2026-11-10T12:00:00Z", creditos_saldo: 0 }, now)).toBe(true);
  });
  it("Grátis válido com créditos libera uso", () => {
    expect(companyNeedsPayment({ status_cobranca: "trial", trial_ate: "2026-11-10T12:00:00Z", creditos_saldo: 5 }, now)).toBe(false);
  });
  it("plano pago confirmado libera uso", () => {
    expect(companyNeedsPayment({ status_cobranca: "ativo", trial_ate: null, creditos_saldo: 0 }, now)).toBe(false);
  });
});
