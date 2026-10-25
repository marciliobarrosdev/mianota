import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { formatCentsBRL, moneyError, parseBRLToCents, sanitizeMoneyTyping } from "../src/lib/money";
import {
  brazilianPhoneError,
  isValidBrazilianPhone,
  maskBrazilianPhoneInput,
  normalizeValidBrazilianPhone,
} from "../src/lib/phone";
import { emailError, isValidEmail, isValidHttpUrl, normalizeEmail } from "../src/lib/masks";
import {
  PLAN_SLUGS,
  resolveSignupPlan,
  validateCheckoutCompanyInput,
} from "../src/lib/plan-selection";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("preço em reais na tela, centavos por dentro", () => {
  test("4900 centavos aparece como R$ 49,00", () => {
    expect(formatCentsBRL(4900)).toBe("R$ 49,00");
    expect(formatCentsBRL(6900)).toBe("R$ 69,00");
    expect(formatCentsBRL(123456)).toBe("R$ 1.234,56");
  });
  test("R$ 49,00 volta a ser 4900 centavos (sem virar 490000 nem 49)", () => {
    expect(parseBRLToCents("R$ 49,00")).toBe(4900);
    expect(parseBRLToCents(formatCentsBRL(4900))).toBe(4900);
  });
  test("abrir, salvar e reabrir mantém R$ 49,00", () => {
    let cents = 4900;
    for (let i = 0; i < 3; i++) cents = parseBRLToCents(formatCentsBRL(cents)) as number;
    expect(formatCentsBRL(cents)).toBe("R$ 49,00");
  });
  test("digitação natural em pt-BR", () => {
    expect(parseBRLToCents("49")).toBe(4900);
    expect(parseBRLToCents("49,9")).toBe(4990);
    expect(parseBRLToCents("1.234,56")).toBe(123456);
    expect(parseBRLToCents("49.90")).toBe(4990);
  });
  test("letras, três casas e vazio não viram número", () => {
    expect(parseBRLToCents("abc")).toBeNull();
    expect(parseBRLToCents("49,999")).toBeNull();
    expect(parseBRLToCents("")).toBeNull();
    expect(sanitizeMoneyTyping("R$ 4a9,999")).toBe("49,99");
  });
  test("preço negativo é recusado", () => {
    expect(sanitizeMoneyTyping("-49,00")).toBe("49,00");
    expect(moneyError("-49,00")).toBe("O valor não pode ser negativo.");
  });
});

describe("telefone/WhatsApp brasileiro", () => {
  test("máscara durante a digitação", () => {
    expect(maskBrazilianPhoneInput("11987654321")).toBe("(11) 98765-4321");
    expect(maskBrazilianPhoneInput("1134567890")).toBe("(11) 3456-7890");
    expect(maskBrazilianPhoneInput("+55 11 98765-4321")).toBe("(11) 98765-4321");
  });
  test("celular e fixo válidos normalizam para +55", () => {
    expect(normalizeValidBrazilianPhone("(11) 98765-4321")).toBe("+5511987654321");
    expect(normalizeValidBrazilianPhone("(21) 3456-7890")).toBe("+552134567890");
  });
  test("incompleto, sem DDD válido ou celular sem 9 é inválido", () => {
    expect(isValidBrazilianPhone("98765-4321")).toBe(false);
    expect(isValidBrazilianPhone("(01) 98765-4321")).toBe(false);
    expect(isValidBrazilianPhone("(11) 88765-4321")).toBe(false);
    expect(brazilianPhoneError("")).toBe("Informe o telefone com DDD.");
    expect(brazilianPhoneError("", { required: false })).toBeNull();
  });
});

describe("e-mail e endereço", () => {
  test("e-mail com espaços e maiúsculas é limpo antes de salvar", () => {
    expect(normalizeEmail("  Ana.Souza@Email.COM ")).toBe("ana.souza@email.com");
    expect(isValidEmail("  Ana.Souza@Email.COM ")).toBe(true);
  });
  test("e-mail vazio ou fora do formato é recusado", () => {
    expect(emailError("")).toBe("Informe seu e-mail.");
    expect(emailError("ana@")).not.toBeNull();
    expect(emailError("ana email.com")).not.toBeNull();
  });
  test("URL de checkout precisa ser endereço web completo", () => {
    expect(isValidHttpUrl("https://pay.kiwify.com.br/abc123")).toBe(true);
    expect(isValidHttpUrl("pay.kiwify.com.br")).toBe(false);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("cadastro sempre vinculado a um plano", () => {
  const plans = [
    { slug: "starter", ativo: true },
    { slug: "pro", ativo: true },
    { slug: "business", ativo: false },
  ];
  test("Basic = starter e Pro = pro continuam válidos", () => {
    expect(PLAN_SLUGS).toEqual({ basic: "starter", pro: "pro" });
    expect(resolveSignupPlan("starter", plans)).toEqual({ ok: true, slug: "starter" });
    expect(resolveSignupPlan("pro", plans)).toEqual({ ok: true, slug: "pro" });
  });
  test("sem plano, plano inventado ou inativo bloqueia o cadastro", () => {
    expect(resolveSignupPlan(undefined, plans)).toEqual({ ok: false, reason: "missing" });
    expect(resolveSignupPlan("gratis", plans)).toEqual({ ok: false, reason: "invalid" });
    expect(resolveSignupPlan("business", plans)).toEqual({ ok: false, reason: "inactive" });
  });
  test("servidor recusa criar assinatura sem plano (não presume starter)", () => {
    expect(() => validateCheckoutCompanyInput({ nome: "Ana" })).toThrow();
    expect(() => validateCheckoutCompanyInput({ nome: "Ana", plano_slug: "" })).toThrow();
    expect(validateCheckoutCompanyInput({ nome: "Ana", plano_slug: "pro" }).plano_slug).toBe("pro");
  });
  test("createCheckoutCompany valida o plano antes de qualquer criação e sem padrão starter", () => {
    const source = read("src/lib/checkout.functions.ts");
    expect(source).not.toContain('"starter"');
    expect(source.indexOf("resolveSignupPlan(")).toBeGreaterThan(0);
    expect(source.indexOf("resolveSignupPlan(")).toBeLessThan(
      source.indexOf('"bootstrap_remix_instance"'),
    );
  });
  test("banco também exige plano no create_checkout_company_atomic", () => {
    const migration = read("drizzle/migrations/0006_require_plan_on_checkout_company.sql");
    expect(migration).toContain("Escolha um plano para começar");
    expect(migration).not.toMatch(
      /COALESCE\(NULLIF\(lower\(trim\(_plan_slug\)\), ''\), 'starter'\)/,
    );
  });
  test("/entrar?modo=signup sem plano válido volta para /#planos", () => {
    const source = read("src/routes/entrar.tsx");
    expect(source).toContain('modo: s.modo === "signup" ? "signup" : "login"');
    expect(source).toMatch(/search\.modo === "signup" && !selectedPlan[\s\S]{0,120}hash: "planos"/);
  });
});
