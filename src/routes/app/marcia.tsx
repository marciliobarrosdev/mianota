import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";
import { MarciaChat } from "@/components/finance/marcia-chat";
import { MarciaChatShell } from "@/components/finance/marcia-chat-shell";
import { useMarciaFinanceChat } from "@/hooks/use-marcia-finance-chat";

export const Route = createFileRoute("/app/marcia")({
  head: brandedRouteHead("Falar com a MárcIA"),
  component: MarciaChatPage,
});

const SUGGESTIONS = [
  "Gastei R$ 84,90 no mercado pelo Pix",
  "Recebi R$ 3.200 de salário hoje",
  "Conta de luz de R$ 180 vence dia 15",
  "Quanto eu gastei este mês?",
];

function MarciaChatPage() {
  const branding = useBrand();
  const ctx = Route.useRouteContext();
  const controller = useMarciaFinanceChat(ctx.company?.id);
  return (
    <MarciaChatShell assistantName={branding.assistantName}>
      <MarciaChat
        controller={controller}
        assistantName={branding.assistantName}
        suggestions={SUGGESTIONS}
        emptyState={
          <div className="mx-auto grid max-w-sm place-items-center py-10 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-[color:var(--brand-soft)] text-[color:var(--brand-text)]">
              <Sparkles className="size-5" />
            </div>
            <h2 className="mt-3 font-display text-lg font-black">Oi! Me conte o que aconteceu.</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escreva, fale ou anexe um comprovante. Pergunto o que faltar e só registro depois da
              sua confirmação.
            </p>
          </div>
        }
      />
    </MarciaChatShell>
  );
}
