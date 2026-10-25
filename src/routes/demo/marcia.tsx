import { createFileRoute } from "@tanstack/react-router";
import { DemoChatPage } from "@/components/demo/finance-demo-app";
import { brandedRouteHead } from "@/config/brand";

export const Route = createFileRoute("/demo/marcia")({
  head: brandedRouteHead("Falar com a MárcIA (demo)"),
  component: DemoChatPage,
});
