import { createFileRoute } from "@tanstack/react-router";
import { DemoMovementsPage } from "@/components/demo/finance-demo-app";
import { brandedRouteHead } from "@/config/brand";

export const Route = createFileRoute("/demo/movimentacoes")({
  head: brandedRouteHead("Movimentações (demo)"),
  component: DemoMovementsPage,
});
