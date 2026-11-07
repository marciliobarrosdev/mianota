import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/agenda")({
  beforeLoad: () => {
    throw redirect({ to: "/app/inicio" });
  },
});
