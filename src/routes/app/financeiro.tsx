import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/financeiro")({
  beforeLoad: () => {
    throw redirect({ to: "/app/movimentacoes" });
  },
});
