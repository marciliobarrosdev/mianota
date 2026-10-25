import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/master/integracoes")({
 beforeLoad: () => { throw redirect({ to: "/master/whatsapp-qr", replace: true }); },
});
