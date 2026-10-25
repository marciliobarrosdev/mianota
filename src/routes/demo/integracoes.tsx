import { createFileRoute, redirect } from "@tanstack/react-router";

// Área antiga da demonstração: agora faz parte de outra tela.
export const Route = createFileRoute("/demo/integracoes")({
  beforeLoad: () => {
    throw redirect({ to: "/demo/configuracoes", replace: true });
  },
});
