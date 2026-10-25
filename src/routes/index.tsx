import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { FinanceLanding, type FinancePlan } from "@/components/landing/finance-landing";
import { supabase } from "@/integrations/supabase/client";
import { useBrand } from "@/contexts/brand-context";
import { personalizeAssistantText } from "@/config/brand";
import { CHOOSE_PLAN_MESSAGE } from "@/lib/plan-selection";

export const Route = createFileRoute("/")({
  // ?escolher=plano chega quando alguém tenta se cadastrar sem um plano válido.
  validateSearch: (s: Record<string, unknown>): { escolher?: string } =>
    typeof s.escolher === "string" ? { escolher: s.escolher } : {},
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingRoute,
});

const FALLBACK_PLANS: FinancePlan[] = [
  {
    slug: "starter",
    name: "Basic",
    price: "49",
    description: "O essencial para cuidar do dinheiro sem planilha.",
    features: [
      "Dashboard financeiro",
      "Lançamentos por texto e voz",
      "Contas e cartões",
      "Calendário e lembretes",
      "Aplicativo instalável",
      "Orçamentos básicos",
    ],
    trialDays: 3,
  },
  {
    slug: "pro",
    name: "Pro",
    price: "69",
    description: "Para automatizar a rotina e conversar com seu financeiro.",
    features: [
      "Tudo do Basic",
      "WhatsApp financeiro",
      "Metas e recorrências",
      "Mais comandos com IA",
      "Relatórios inteligentes",
      "Lembretes avançados",
    ],
    trialDays: 3,
    featured: true,
  },
];

function LandingRoute() {
  const branding = useBrand();
  const [plans, setPlans] = useState<FinancePlan[]>(FALLBACK_PLANS);
  const { escolher } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (escolher !== "plano") return;
    toast.message(CHOOSE_PLAN_MESSAGE, { id: "choose-plan" });
    void navigate({ to: "/", hash: "planos", search: {}, replace: true });
  }, [escolher, navigate]);
  const brandedPlans = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        features: plan.features.map((feature) =>
          personalizeAssistantText(feature, branding.assistantName),
        ),
      })),
    [branding.assistantName, plans],
  );

  useEffect(() => {
    let active = true;
    const canReadCloud = Boolean(
      import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    );
    if (!canReadCloud)
      return () => {
        active = false;
      };

    void (async () => {
      try {
        const { data } = await supabase
          .from("plan")
          .select("slug,nome,preco_cents,descricao,features,destaque,trial_days")
          .eq("ativo", true)
          .order("ordem");
        if (!active || !data?.length) return;

        setPlans(
          data.map((row) => {
            const fallback = FALLBACK_PLANS.find((plan) => plan.slug === row.slug);
            const features = Array.isArray(row.features)
              ? row.features.filter(
                  (feature): feature is string =>
                    typeof feature === "string" && feature.trim().length > 0,
                )
              : [];

            return {
              slug: row.slug,
              name: row.nome,
              price: (row.preco_cents / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }),
              description:
                row.descricao?.trim() ||
                fallback?.description ||
                "Para entender e organizar sua vida financeira em um só lugar.",
              features: features.length ? features : fallback?.features || [],
              trialDays: row.trial_days,
              featured: row.destaque,
            } satisfies FinancePlan;
          }),
        );
      } catch {
        // A LP continua navegável com os planos padrão enquanto o clone conecta o banco.
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <FinanceLanding
      plans={brandedPlans}
      brandName={branding.name}
      assistantName={branding.assistantName}
      tagline={branding.tagline}
      logoUrl={branding.logoUrl || branding.iconUrl}
      avatarUrl={branding.avatarUrl}
      legalName={branding.legalName}
      legalDocument={branding.legalDocument}
      contactEmail={branding.contactEmail}
      contactAddress={branding.contactAddress}
      loginHref="/entrar?modo=login"
      signupHref="/entrar?modo=signup"
    />
  );
}
