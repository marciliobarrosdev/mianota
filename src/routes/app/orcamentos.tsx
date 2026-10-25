import { createFileRoute, redirect } from "@tanstack/react-router";

// Área antiga: agora faz parte de "Planejamento e calendário".
export const Route = createFileRoute("/app/orcamentos")({
  beforeLoad: () => {
    throw redirect({ to: "/app/planejamento", replace: true });
  },
});
