import { createFileRoute } from "@tanstack/react-router";
import { SettingsFinanceDemoView } from "@/components/demo/finance-demo-pages";
import { brandedRouteHead } from "@/config/brand";

export const Route = createFileRoute("/demo/configuracoes")({
  head: brandedRouteHead("Configurações (demo)"),
  component: SettingsFinanceDemoView,
});
