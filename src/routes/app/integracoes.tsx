import { createFileRoute, redirect } from "@tanstack/react-router";
import { FinanceConnections } from "@/components/finance/finance-connections";
import { brandedRouteHead } from "@/config/brand";

export const Route = createFileRoute("/app/integracoes")({
  head: brandedRouteHead("Canais e conexões"),
  beforeLoad: ({ context }) => {
    const role = context?.membership?.role;
    if (role !== "owner" && role !== "admin") throw redirect({ to: "/app/inicio" });
  },
  component: FinanceConnectionsRoute,
});

function FinanceConnectionsRoute() {
  const context = Route.useRouteContext();
  return <FinanceConnections companyId={context.company?.id} />;
}
