import { createFileRoute } from "@tanstack/react-router";
import { WhatsappFinanceDemoView } from "@/components/demo/finance-demo-pages";
import { brandedRouteHead } from "@/config/brand";

export const Route = createFileRoute("/demo/conversas")({
  head: brandedRouteHead("WhatsApp financeiro (demo)"),
  component: WhatsappFinanceDemoView,
});
