import { createFileRoute, Link } from "@tanstack/react-router";
import { brandedRouteHead } from "@/config/brand";
import { useBrand } from "@/contexts/brand-context";

export const Route = createFileRoute("/termos")({
  head: brandedRouteHead(
    "Termos e Condições",
    (branding) => `Termos e Condições de uso do ${branding.name}.`,
  ),
  component: TermosPage,
});

function TermosPage() {
  const branding = useBrand();
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Voltar
        </Link>
        <h1 className="mt-6 text-4xl font-bold">Termos e Condições</h1>
        <p className="mt-2 text-sm text-slate-500">Última atualização: 18 de outubro de 2026</p>

        <div className="mt-10 space-y-8 leading-relaxed text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">1. Quem somos</h2>
            <p className="mt-2">
              Estes Termos regulam o uso desta instalação do <strong>{branding.name}</strong>
              ("Serviço"), operada pelo responsável comercial identificado no checkout, na cobrança
              ou nos canais de atendimento ("Responsável"). Ao usar o Serviço, você concorda com
              estes Termos. Se não concordar, não utilize o Serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Aceitação</h2>
            <p className="mt-2">
              Ao criar uma conta, contratar um plano ou continuar usando o Serviço, você declara ter
              capacidade legal para celebrar este contrato e concorda integralmente com estes
              Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Descrição do Serviço</h2>
            <p className="mt-2">
              O Serviço reúne organização financeira pessoal, lançamentos, contas, cartões,
              orçamentos, metas, relatórios e recursos de inteligência artificial. Conforme a
              configuração desta instalação, também pode receber comandos por WhatsApp, processar
              imagens de comprovantes e enviar lembretes de contas e compromissos financeiros.
            </p>
            <p className="mt-2">
              O Serviço é uma ferramenta de organização e informação. Ele não é instituição
              financeira, não presta consultoria de investimentos e não substitui orientação
              contábil, fiscal, jurídica ou financeira profissional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. Uso aceitável</h2>
            <p className="mt-2">Você concorda em não:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>usar o Serviço para fins ilegais, fraudulentos ou abusivos;</li>
              <li>enviar spam ou mensagens não solicitadas em violação às leis aplicáveis;</li>
              <li>violar direitos de propriedade intelectual de terceiros;</li>
              <li>interferir na segurança do Serviço (malware, scraping, engenharia reversa);</li>
              <li>usar ou distribuir o software fora do escopo da licença recebida.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. Propriedade intelectual</h2>
            <p className="mt-2">
              Os direitos sobre o software-base, bibliotecas e materiais de terceiros pertencem aos
              respectivos titulares. Quem recebeu uma licença white-label pode aplicar sua própria
              marca e comercializar sua instalação dentro do escopo da licença e do contrato de
              aquisição. Essa autorização não transfere direitos sobre componentes de terceiros nem
              permite redistribuição fora desse escopo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Pagamentos e assinaturas</h2>
            <p className="mt-2">
              O processo de assinatura é conduzido pelo provedor de pagamentos configurado pelo
              responsável por esta instalação. Os dados do provedor e as condições da compra são
              apresentados no checkout antes da confirmação do pagamento.
            </p>
            <p className="mt-2">
              Assinaturas são renovadas automaticamente conforme a periodicidade contratada, até que
              sejam canceladas. Você pode gerenciar sua assinatura a qualquer momento pelo canal
              disponibilizado no checkout ou em sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. Reembolsos</h2>
            <p className="mt-2">
              Cancelamentos e reembolsos seguem a{" "}
              <Link to="/reembolso" className="underline">
                Política de Cancelamento e Reembolso
              </Link>{" "}
              desta instalação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">8. Nível de serviço</h2>
            <p className="mt-2">
              O Responsável busca manter o Serviço disponível, porém integrações externas e serviços
              de terceiros, incluindo WhatsApp, inteligência artificial e pagamentos, podem sofrer
              interrupções. As condições de disponibilidade e suporte seguem o plano contratado e a
              legislação aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">9. Suspensão e encerramento</h2>
            <p className="mt-2">
              O Responsável pode suspender ou encerrar o acesso em caso de violação material destes
              Termos, inadimplência, risco de fraude ou segurança, respeitados o contrato aplicável
              e os direitos previstos em lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              10. Limitação de responsabilidade
            </h2>
            <p className="mt-2">
              Eventuais limitações de responsabilidade seguem o contrato apresentado na compra e a
              legislação aplicável. Nada nestes Termos afasta direitos que não possam ser limitados
              por lei, inclusive os direitos do consumidor quando aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">11. Lei aplicável</h2>
            <p className="mt-2">
              Estes Termos são regidos pelas leis do Brasil. O foro aplicável será o previsto no
              contrato da compra e na legislação vigente, preservado o foro do consumidor quando a
              lei assim determinar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">12. Contato</h2>
            <p className="mt-2">
              Dúvidas sobre estes Termos ou sobre cobrança devem ser enviadas pelos canais de
              atendimento configurados pelo responsável por esta instalação.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
