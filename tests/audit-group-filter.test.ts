import { describe, expect, it } from "vitest";
import { auditGroup, auditGroupFilter } from "@/lib/finance/settings-rules";

// Simula o filtro do banco (ilike = contém, sem diferenciar maiúsculas).
function matches(acao: string, group: "all" | "acesso" | "dados" | "conta") {
  const a = acao.toLowerCase();
  const { anyOf, noneOf } = auditGroupFilter(group);
  return (anyOf.length === 0 || anyOf.some((w) => a.includes(w))) && noneOf.every((w) => !a.includes(w));
}

const samples = [
  "auth.login",
  "auth.LOGOUT",
  "password.change",
  "plan.change",
  "subscription.renew",
  "lgpd.export",
  "lancamento.create",
  "categoria.update",
  "plan.password_reset", // tem palavra de acesso e de conta: acesso vence
];

describe("auditGroupFilter (Carregar mais do histórico)", () => {
  it("o filtro do banco escolhe exatamente o mesmo grupo de auditGroup", () => {
    for (const acao of samples) {
      for (const group of ["acesso", "dados", "conta"] as const) {
        expect(matches(acao, group), `${acao} em ${group}`).toBe(auditGroup(acao) === group);
      }
    }
  });

  it("'Tudo' não filtra nada", () => {
    expect(samples.every((acao) => matches(acao, "all"))).toBe(true);
  });
});
