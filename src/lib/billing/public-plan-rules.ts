import { formatCentsBRL } from "@/lib/common/money";

export type PublicPlanRow = {
  slug: string;
  nome: string;
  preco_cents: number;
  descricao: string | null;
  features: unknown;
  destaque: boolean;
  trial_days: number;
  is_free: boolean;
  free_days: number | null;
};

export type PublicPlan = {
  slug: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  trialDays: number;
  featured: boolean;
  free: boolean;
};

/** Projects the saved catalog without inventing plans, prices, limits or features. */
export function publicPlanFromRow(row: PublicPlanRow): PublicPlan {
  return {
    slug: row.slug,
    name: row.nome,
    price: formatCentsBRL(row.preco_cents).replace(/^R\$\s*/, ""),
    description: row.descricao?.trim() || "",
    features: Array.isArray(row.features)
      ? row.features.filter((value): value is string => typeof value === "string" && !!value.trim())
      : [],
    trialDays: row.is_free ? row.free_days ?? row.trial_days : row.trial_days,
    featured: row.destaque,
    free: row.is_free,
  };
}