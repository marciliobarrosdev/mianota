import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/billing/webhook")({
  server: {
    handlers: {
      POST: async () => {
        return new Response(
          "Provedores legados descontinuados. A única integração de pagamento suportada pelo MIAnota é a InfinitePay (/api/public/billing/infinitepay).",
          { status: 410 },
        );
      },
      GET: async () => {
        return new Response(
          "A única integração de pagamento suportada pelo MIAnota é a InfinitePay (/api/public/billing/infinitepay).",
          { status: 200 },
        );
      },
    },
  },
});
