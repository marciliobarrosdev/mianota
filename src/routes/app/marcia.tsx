import { createFileRoute, redirect } from "@tanstack/react-router";

// Compatibilidade: a página "Falar com a MIA" agora vive em /app/mia.
export const Route = createFileRoute("/app/marcia")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/app/mia", search, replace: true });
  },
});
