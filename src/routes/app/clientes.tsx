import { createFileRoute, redirect } from "@tanstack/react-router";

// Área antiga: agora faz parte de "Movimentações".
export const Route = createFileRoute("/app/clientes")({
  beforeLoad: () => {
    throw redirect({ to: "/app/movimentacoes", replace: true });
  },
});
