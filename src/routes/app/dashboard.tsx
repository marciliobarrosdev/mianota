import { createFileRoute, redirect } from "@tanstack/react-router";

// Compatibilidade com links antigos do projeto-base.
export const Route = createFileRoute("/app/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/app/inicio", replace: true });
  },
});
