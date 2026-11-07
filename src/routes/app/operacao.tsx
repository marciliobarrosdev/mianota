import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/operacao")({
  beforeLoad: () => {
    throw redirect({ to: "/app/agente" });
  },
});
