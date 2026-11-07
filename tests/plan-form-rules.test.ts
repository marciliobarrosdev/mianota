import { describe, expect, it } from "vitest";
import {
  buildPlanPayload,
  emptyPlanDraft,
  validatePlanDraft,
  type Plan,
} from "@/lib/billing/plan-form-rules";

const plan = (over: Partial<Plan>): Plan =>
  ({ ...emptyPlanDraft([]), id: crypto.randomUUID(), features: [], ...over }) as Plan;

const plano1 = plan({ slug: "plano-1", nome: "Plano 1", preco_cents: 2990, ativo: true });
const plano2 = plan({ slug: "plano-2", nome: "Plano 2", preco_cents: 4990, ativo: true });

describe("formulário de planos do Master", () => {
  it("aceita Plano 1 a R$ 29,90 e Plano 2 a R$ 49,90", () => {
    expect(validatePlanDraft({ ...plano1 }, [plano1, plano2])).toBeNull();
    expect(validatePlanDraft({ ...plano2 }, [plano1, plano2])).toBeNull();
  });

  it("bloqueia outro plano pago ativo com o mesmo preço (InfinitePay identifica pelo valor)", () => {
    const novo = { ...emptyPlanDraft([plano1]), nome: "Novo", slug: "novo", preco_cents: 2990 };
    expect(validatePlanDraft(novo, [plano1, plano2])).toMatch(/mesmo preço|já tem esse preço/);
  });

  it("bloqueia slug repetido e slug inválido", () => {
    expect(
      validatePlanDraft({ ...emptyPlanDraft([]), nome: "X", slug: "plano-1", preco_cents: 100 }, [
        plano1,
      ]),
    ).toBe("Já existe um plano com esse slug.");
    expect(
      validatePlanDraft(
        { ...emptyPlanDraft([]), nome: "X", slug: "Plano 1", preco_cents: 100 },
        [],
      ),
    ).toMatch(/Slug inválido/);
  });

  it("plano grátis exige limite de dias entre 1 e 365", () => {
    const free = {
      ...emptyPlanDraft([]),
      nome: "Grátis",
      slug: "gratis",
      is_free: true,
      free_days: 0,
    };
    expect(validatePlanDraft(free, [])).toMatch(/Limite de Dias/);
    expect(validatePlanDraft({ ...free, free_days: 7 }, [])).toBeNull();
  });

  it("payload do plano grátis zera preço e link e usa os dias como trial", () => {
    const payload = buildPlanPayload(
      {
        ...emptyPlanDraft([]),
        nome: " Grátis ",
        slug: "Gratis",
        is_free: true,
        free_days: 7,
        creditos_trial: 50,
        checkout_url: "https://x",
      },
      "Chat com a MIA\n\n Relatórios ",
    );
    expect(payload).toMatchObject({
      slug: "gratis",
      nome: "Grátis",
      preco_cents: 0,
      checkout_url: null,
      trial_days: 7,
      creditos_trial: 50,
      checkout_mode: "external",
    });
    expect(payload.features).toEqual(["Chat com a MIA", "Relatórios"]);
  });

  it("novo plano entra no fim da lista", () => {
    expect(emptyPlanDraft([plan({ ordem: 3 }), plan({ ordem: 7 })]).ordem).toBe(8);
  });
});
