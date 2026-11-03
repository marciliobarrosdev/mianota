import { describe, expect, it } from "vitest";
import { personTypeForForm, personTypeForStorage } from "@/lib/master/subscriber-identity-rules";

describe("tipo de pessoa do assinante", () => {
  it("grava pessoa física no formato aceito pelo cadastro", () => {
    expect(personTypeForStorage("pf")).toBe("PF");
    expect(personTypeForForm("PF")).toBe("pf");
  });
  it("grava e reabre pessoa jurídica sem trocar para pessoa física", () => {
    expect(personTypeForStorage("pj")).toBe("PJ");
    expect(personTypeForForm("PJ")).toBe("pj");
    expect(personTypeForForm("pj")).toBe("pj");
  });
});