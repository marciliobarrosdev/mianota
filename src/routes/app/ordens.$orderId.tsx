import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/ordens/$orderId")({
  beforeLoad: () => {
    throw redirect({ to: "/app/movimentacoes" });
  },
});
