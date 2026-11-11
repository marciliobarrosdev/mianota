import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FinanceLanding } from "@/components/landing/finance-landing";
import { useBrand } from "@/contexts/brand-context";
import { publicPlansQuery } from "@/lib/billing/public-plans-query";
import { CHOOSE_PLAN_MESSAGE } from "@/lib/billing/plan-selection";

export const Route = createFileRoute("/")({
  // ?escolher=plano chega quando alguém tenta se cadastrar sem um plano válido.
  validateSearch: (s: Record<string, unknown>): { escolher?: string } =>
    typeof s.escolher === "string" ? { escolher: s.escolher } : {},
  // Share preview: absolute URLs so WhatsApp/Facebook/LinkedIn crawlers read it from SSR HTML.
  head: () => ({
    meta: [
      { title: "MIAnota | Sua Assistente Financeira Inteligente" },
      { name: "description", content: "Conheça a MIAnota! Sua assistente financeira com Inteligência Artificial. Registre despesas, organize receitas e acompanhe suas finanças diretamente pelo WhatsApp." },
      { property: "og:title", content: "MIAnota | Sua Assistente Financeira Inteligente" },
      { property: "og:description", content: "Conheça a MIAnota! Sua assistente financeira com Inteligência Artificial. Registre despesas, organize receitas e acompanhe suas finanças diretamente pelo WhatsApp." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://mianota.lovable.app/" },
      { property: "og:site_name", content: "MIAnota" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:image", content: "https://mianota.lovable.app/og-mianota.png" },
      { property: "og:image:secure_url", content: "https://mianota.lovable.app/og-mianota.png" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "MIA, a assistente financeira do MIAnota, no WhatsApp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "MIAnota | Sua Assistente Financeira Inteligente" },
      { name: "twitter:description", content: "Organize suas finanças com Inteligência Artificial, diretamente pelo WhatsApp." },
      { name: "twitter:image", content: "https://mianota.lovable.app/og-mianota.png" },
    ],
    links: [{ rel: "canonical", href: "https://mianota.lovable.app/" }],
  }),
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
