/**
 * Regras de escolha de plano no cadastro. Basic = "starter" e Pro = "pro"
 * (slugs internos preservados). O plano é sempre confirmado no banco como
 * ativo; este arquivo só valida o formato e explica a regra.
 */

export const PLAN_SLUGS = { basic: "starter", pro: "pro" } as const;

export const CHOOSE_PLAN_MESSAGE = "Escolha o plano Basic ou Pro para criar sua conta.";

/** Slug limpo ("  PRO " → "pro") ou null quando vazio/formato inválido. */
export function normalizePlanSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 40) return null;
  return slug;
}

export type ActivePlanRow = { slug: string; ativo: boolean | null };

/**
 * Decide se o cadastro pode seguir: o slug precisa existir na lista vinda do
 * banco e estar ativo. Sem plano, nada de cadastro nem de assinatura nova.
 */
export function resolveSignupPlan(
  requested: unknown,
  plans: ReadonlyArray<ActivePlanRow>,
): { ok: true; slug: string } | { ok: false; reason: "missing" | "invalid" | "inactive" } {
  if (requested == null || (typeof requested === "string" && !requested.trim())) {
    return { ok: false, reason: "missing" };
  }
  const slug = normalizePlanSlug(requested);
  if (!slug) return { ok: false, reason: "invalid" };
  const row = plans.find((plan) => plan.slug === slug);
  if (!row) return { ok: false, reason: "invalid" };
  if (row.ativo !== true) return { ok: false, reason: "inactive" };
  return { ok: true, slug };
}

/** Validação de entrada do createCheckoutCompany (servidor). */
export function validateCheckoutCompanyInput(d: { nome?: unknown; plano_slug?: unknown }) {
  const nome = String(d?.nome || "").trim();
  if (nome.length < 2) throw new Error("Informe o nome da sua empresa.");
  // Plano obrigatório: nunca presumimos Basic/starter no servidor.
  const plano_slug = normalizePlanSlug(d?.plano_slug);
  if (!plano_slug) throw new Error(CHOOSE_PLAN_MESSAGE);
  return { nome: nome.slice(0, 120), plano_slug };
}
