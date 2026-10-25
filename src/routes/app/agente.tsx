import { createFileRoute, redirect } from "@tanstack/react-router";
import { FinanceAssistantSettings } from "@/components/finance/finance-assistant-settings";
import { brandedRouteHead } from "@/config/brand";

export const Route = createFileRoute("/app/agente")({
  head: brandedRouteHead("Configurar assistente"),
  beforeLoad: ({ context }) => {
    const role = context?.membership?.role;
    if (role !== "owner" && role !== "admin") throw redirect({ to: "/app/inicio" });
  },
  component: FinanceAssistantRoute,
});

function FinanceAssistantRoute() {
  const context = Route.useRouteContext();
  return <FinanceAssistantSettings companyId={context.company?.id} />;
}
