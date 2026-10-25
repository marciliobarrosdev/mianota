import { createFileRoute } from "@tanstack/react-router";
import { MasterWhatsappPage } from "@/components/master/whatsapp-setup";
import { brandedRouteHead } from "@/config/brand";
// Evolution URL / API Key e geração de QR Code ficam juntos no componente compartilhado.
export const Route = createFileRoute("/master/whatsapp-meta")({
 head: brandedRouteHead("API oficial Meta"), component: () => <MasterWhatsappPage initialMode="meta" />,
});
