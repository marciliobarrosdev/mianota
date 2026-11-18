/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Regras puras do formulário de planos do Master (/master/planos).
 * Validação e montagem do que é enviado a `saveMasterPlan` (RPC `master_save_plan`, única via de escrita).
 * Valores de dinheiro são sempre centavos inteiros. Testado em tests/plan-form-rules.test.ts.
 */
import { DEFAULT_MAX_CENTS } from "@/lib/common/money";
import { isValidHttpUrl } from "@/lib/common/masks";
import { duplicatePricePlans } from "@/lib/billing/infinitepay-rules";

export type Plan = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  preco_cents: number;
  moeda: string;
  intervalo: "month" | "year";
  trial_days: number;
  creditos_mensais: number;
  creditos_trial: number;
  limite_mensagens: number;
  limite_instancias: number;
  limite_usuarios: number;
  limite_contatos: number;
  features: string[];
  destaque: boolean;
  ativo: boolean;
  ordem: number;
  paddle_product_id: string | null;
  paddle_price_id: string | null;
  checkout_url: string | null;
  /** Sempre "external": o plano cobra pelo link de checkout (InfinitePay). */
  checkout_mode: "external";
  is_free: boolean;
  free_days: number | null;
};

export type PlanDraft = Partial<Plan>;

export function isValidPlanPrice(cents: unknown): cents is number {
  return (
    typeof cents === "number" &&
    Number.isSafeInteger(cents) &&
    cents >= 0 &&
    cents <= DEFAULT_MAX_CENTS
  );
}

/** Valores iniciais de um plano novo; entra no fim da lista (`ordem` = maior + 1). */
export function emptyPlanDraft(plans: Pick<Plan, "ordem">[]): PlanDraft {
  const nextOrder = plans.reduce((m, p) => Math.max(m, Number(p.ordem ?? 0)), 0) + 1;
  return {
    nome: "",
    slug: "",
    descricao: "",
    preco_cents: undefined,
    moeda: "BRL",
    intervalo: "month",
    trial_days: 0,
    creditos_mensais: 0,
    creditos_trial: 0,
    limite_mensagens: 0,
    limite_instancias: 1,
    limite_usuarios: 1,
    limite_contatos: 0,
    destaque: false,
    ativo: true,
    ordem: nextOrder,
    checkout_mode: "external",
    checkout_url: "",
    is_free: false,
    free_days: null,
  };
}

/**
 * Devolve a primeira mensagem de erro (na ordem em que o dono deve corrigir) ou null.
 * Preços de planos pagos ativos precisam ser únicos: o webhook da InfinitePay identifica
 * o plano pelo valor pago, então dois planos com o mesmo preço seriam ambíguos.
 */
export function validatePlanDraft(editing: PlanDraft, plans: Plan[]): string | null {
  if (!editing.nome?.trim() || !editing.slug?.trim()) return "Nome e slug são obrigatórios";
  const isFree = !!editing.is_free;
  const freeDays = Number(editing.free_days ?? 0);
  if (isFree && (!Number.isInteger(freeDays) || freeDays < 1 || freeDays > 365))
    return "Informe o Limite de Dias do plano gratuito (de 1 a 365).";
  if (!isFree && !isValidPlanPrice(editing.preco_cents))
    return "Informe um preço válido, por exemplo R$ 49,00.";
  const slug = editing.slug.toLowerCase().trim();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
    return "Slug inválido. Use letras minúsculas, números e hífens (ex.: gratis).";
  if (plans.some((p) => p.slug === slug && p.id !== editing.id))
    return "Já existe um plano com esse slug.";
  const checkoutUrl = (editing.checkout_url ?? "").trim();
  if (checkoutUrl && !isValidHttpUrl(checkoutUrl))
    return "Link de checkout inválido. Use o endereço completo, começando com https://";
  const dup = duplicatePricePlans([
    ...plans.filter((p) => p.slug !== slug && editing.id !== p.id),
    { slug, preco_cents: Number(editing.preco_cents), ativo: !!editing.ativo },
  ]);
  if (!isFree && editing.ativo && dup.includes(slug))
    return "Outro plano ativo já tem esse preço. Use valores diferentes para a InfinitePay reconhecer o plano pago.";
  return null;
}

/**
 * Monta o payload salvo. Plano grátis: preço 0, sem link, `trial_days` = limite de dias.
 * Créditos de trial só valem se houver período grátis/trial; WhatsApp tem no mínimo 1 número.
 */
export function buildPlanPayload(editing: PlanDraft, featuresText: string): Record<string, any> {
  const isFree = !!editing.is_free;
  const freeDays = Number(editing.free_days ?? 0);
  const checkoutUrl = (editing.checkout_url ?? "").trim();
  return {
    slug: (editing.slug ?? "").toLowerCase().trim(),
    nome: (editing.nome ?? "").trim(),
    descricao: editing.descricao ?? null,
    preco_cents: isFree ? 0 : (editing.preco_cents as number),
    moeda: editing.moeda ?? "BRL",
    intervalo: editing.intervalo ?? "month",
    trial_days: isFree ? freeDays : Number(editing.trial_days ?? 0),
    is_free: isFree,
    free_days: isFree ? freeDays : null,
    creditos_mensais: Math.max(0, Number(editing.creditos_mensais ?? 0)),
    creditos_trial:
      isFree || Number(editing.trial_days ?? 0) > 0
        ? Math.max(0, Number(editing.creditos_trial ?? 0))
        : 0,
    limite_mensagens: Number(editing.limite_mensagens ?? 0),
    limite_instancias: Math.max(1, Number(editing.limite_instancias ?? 1)),
    limite_usuarios: Number(editing.limite_usuarios ?? 0),
    limite_contatos: Number(editing.limite_contatos ?? 0),
    features: featuresText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    destaque: !!editing.destaque,
    ativo: !!editing.ativo,
    ordem: Number(editing.ordem ?? 0),
    paddle_product_id: editing.paddle_product_id ?? null,
    paddle_price_id: editing.paddle_price_id ?? null,
    checkout_url: isFree ? null : checkoutUrl || null,
    checkout_mode: "external",
  };
}

export function formatPlanPrice(cents: number, moeda = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(cents / 100);
}
