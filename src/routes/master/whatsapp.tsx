import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/master/whatsapp")({
 beforeLoad: () => { throw redirect({ to: "/master/whatsapp-qr", replace: true }); },
});
