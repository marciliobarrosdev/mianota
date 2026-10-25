import { createFileRoute, redirect } from "@tanstack/react-router";

// Área antiga: agora faz parte de "Visão do mês".
export const Route = createFileRoute("/app/relatorios")({
  beforeLoad: () => {
    throw redirect({ to: "/app/inicio", replace: true });
  },
});
