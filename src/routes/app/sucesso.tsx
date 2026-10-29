import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CheckCircle2, LifeBuoy } from "lucide-react";
import { brandedRouteHead } from "@/config/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/sucesso")({
  head: brandedRouteHead("Pagamento realizado com sucesso"),
  component: PaymentSuccess,
});

const steps = [
  {
    title: "Confira seu WhatsApp",
    text: "Você receberá uma mensagem de ativação da MIA no número usado na compra.",
  },
  {
    title: "Responda a mensagem de ativação",
    text: "Isso vincula seu número à sua conta com segurança.",
  },
  {
    title: "Acesse seu painel",
    text: "Use o botão abaixo ou entre com o e-mail e a senha cadastrados.",
  },
  {
    title: "Siga o guia inicial",
    text: "Configure sua empresa e comece a registrar suas finanças.",
  },
];

function PaymentSuccess() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-9 w-9 text-primary" />
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">Pagamento Realizado com Sucesso!</h1>
        <p className="mt-2 text-muted-foreground">
          Obrigado pela sua compra. Seu acesso já está sendo liberado.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Como acessar o produto</h2>
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1">
            <Link to="/app/inicio">
              Acessar meu painel <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/app/guia">
              <BookOpen className="mr-1 h-4 w-4" /> Ver guia de uso
            </Link>
          </Button>
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <LifeBuoy className="h-4 w-4" />
        Se a mensagem não chegar em alguns minutos, fale com o nosso suporte.
      </p>
    </div>
  );
}
