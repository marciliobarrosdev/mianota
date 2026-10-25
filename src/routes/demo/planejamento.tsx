import { createFileRoute } from "@tanstack/react-router";
import { DemoPlannerPage } from "@/components/demo/finance-demo-app";
import { brandedRouteHead } from "@/config/brand";

export const Route = createFileRoute("/demo/planejamento")({
  head: brandedRouteHead("Planejamento e calendário (demo)"),
  component: DemoPlannerPage,
});
