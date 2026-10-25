import { createFileRoute, Link } from "@tanstack/react-router";
import { brandedRouteHead } from "@/config/brand";

export const Route = createFileRoute("/reembolso")({
  head: brandedRouteHead(
    "Política de Cancelamento e Reembolso",
    "Como solicitar cancelamento ou reembolso nesta instalação.",
  ),
  component: ReembolsoPage,
});

function ReembolsoPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Voltar
        </Link>
        <h1 className="mt-6 text-4xl font-bold">Política de Cancelamento e Reembolso</h1>
        <p className="mt-2 text-sm text-slate-500">Última atualização: 8 de outubro de 2026</p>

        <div className="mt-10 space-y-8 leading-relaxed text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Condições aplicáveis</h2>
            <p className="mt-2">
              As condições de cancelamento e reembolso são definidas pelo responsável comercial
              desta instalação, pelo provedor de pagamentos utilizado, pela oferta apresentada no
              momento da compra e pela legislação aplicável. Consulte o checkout, o recibo e os
              termos aceitos para conhecer as regras específicas do seu pedido.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Como solicitar</h2>
            <p className="mt-2">
              Os reembolsos são processados pelo provedor de pagamentos configurado pelo responsável
              por esta instalação. Para solicitar:
            </p>
            <ol className="mt-2 list-decimal pl-6 space-y-1">
              <li>Localize o comprovante ou pedido usando o e-mail da compra.</li>
              <li>Entre em contato com o suporte informado nesta instalação.</li>
              <li>O responsável encaminhará a solicitação ao provedor de pagamentos utilizado.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Prazo de processamento</h2>
            <p className="mt-2">
              Após a aprovação, o prazo de estorno será informado pelo provedor de pagamentos. A
              data em que o valor aparece no método original pode variar conforme o emissor do
              cartão, o banco ou o meio de pagamento utilizado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Assinaturas e renovações</h2>
            <p className="mt-2">
              O cancelamento impede novas renovações conforme as regras do plano e do provedor. Ele
              não gera automaticamente reembolso de cobranças já realizadas; cada pedido é analisado
              segundo a oferta contratada e os direitos previstos em lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Contato</h2>
            <p className="mt-2">
              Em caso de dúvidas, entre em contato com o suporte responsável por esta instalação.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
