import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FinanceLanding } from "@/components/landing/finance-landing";
import { useBrand } from "@/contexts/brand-context";
import { brandedRouteHead } from "@/config/brand";
import { publicPlansQuery } from "@/lib/billing/public-plans-query";
import { CHOOSE_PLAN_MESSAGE } from "@/lib/billing/plan-selection";

export const Route = createFileRoute("/")({
  // ?escolher=plano chega quando alguém tenta se cadastrar sem um plano válido.
  validateSearch: (s: Record<string, unknown>): { escolher?: string } =>
    typeof s.escolher === "string" ? { escolher: s.escolher } : {},
  head: brandedRouteHead("Sua assistente financeira", "Conheça a MIAnota e escolha um plano para organizar suas finanças com a MIA."),
  loader: ({ context }) => context.queryClient.ensureQueryData(publicPlansQuery()),
  component: LandingRoute,
});

function LandingRoute() {
  const branding = useBrand();
  const { data: catalog } = useSuspenseQuery(publicPlansQuery());
  const { escolher } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (escolher !== "plano") return;
    toast.message(CHOOSE_PLAN_MESSAGE, { id: "choose-plan" });
    void navigate({ to: "/", hash: "planos", search: {}, replace: true });
  }, [escolher, navigate]);
  return (
    <FinanceLanding
      plans={catalog.plans}
      plansUnavailable={catalog.unavailable}
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
