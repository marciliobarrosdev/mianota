import { createFileRoute } from "@tanstack/react-router";
import { DemoOverviewPage } from "@/components/demo/finance-demo-app";
import { brandedRouteHead } from "@/config/brand";

export const Route = createFileRoute("/demo/dashboard")({
  head: brandedRouteHead("Visão do mês (demo)"),
  component: DemoOverviewPage,
});
