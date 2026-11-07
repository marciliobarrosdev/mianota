import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/ordens")({
  beforeLoad: () => {
    throw redirect({ to: "/app/movimentacoes" });
  },
});
