import { createFileRoute, Link } from "@tanstack/react-router";
import { brandedRouteHead } from "@/config/brand";

export const Route = createFileRoute("/privacidade")({
  head: brandedRouteHead(
    "Política de Privacidade",
    (branding) => `Como esta instalação do ${branding.name} trata dados pessoais.`,
  ),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Voltar
        </Link>
        <h1 className="mt-6 text-4xl font-bold">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-slate-500">Última atualização: 18 de outubro de 2026</p>

        <div className="mt-10 space-y-8 leading-relaxed text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">1. Controlador dos dados</h2>
            <p className="mt-2">
              O responsável comercial identificado no checkout, na cobrança ou nos canais de
              atendimento desta instalação define o tratamento dos dados da conta. Cada empresa
              usuária também é responsável pelos dados de seus próprios clientes processados no
              Serviço, conforme a LGPD (Lei nº 13.709/2018) e demais leis aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Dados que coletamos</h2>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                <strong>Cadastro:</strong> nome, e-mail, senha (hash), telefone.
              </li>
              <li>
                <strong>Dados financeiros:</strong> lançamentos, saldos, contas, cartões, faturas,
                orçamentos, metas, recorrências e categorias informados pelo usuário.
              </li>
              <li>
                <strong>Conteúdo:</strong> comandos por texto ou voz, mensagens, imagens de
                comprovantes e demais mídias processadas no Serviço.
              </li>
              <li>
                <strong>Conexões:</strong> identificadores do WhatsApp autorizado e informações
                necessárias para entregar notificações e lembretes solicitados pelo usuário.
              </li>
              <li>
                <strong>Uso e telemetria:</strong> logs, IP, dispositivo, navegador.
              </li>
              <li>
                <strong>Suporte:</strong> conteúdo de tickets e comunicações.
              </li>
              <li>
                <strong>Cobrança:</strong> tratada pelo provedor configurado — não armazenamos dados
                de cartão.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Finalidades e bases legais</h2>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                Organizar, classificar e apresentar os dados financeiros solicitados pelo usuário.
              </li>
              <li>Prestar o Serviço e cumprir o contrato (execução de contrato).</li>
              <li>Segurança, prevenção a fraudes e cumprimento de obrigações legais.</li>
              <li>Suporte ao cliente (execução de contrato).</li>
              <li>Melhorias do produto e analytics (legítimo interesse).</li>
              <li>Comunicações de marketing (consentimento, quando aplicável).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. Compartilhamento</h2>
            <p className="mt-2">Compartilhamos dados apenas com:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                <strong>Provedor de pagamentos configurado</strong> — processa pagamentos,
                assinaturas e faturamento conforme a operação deste clone.
              </li>
              <li>
                Provedores de hospedagem, banco de dados, inteligência artificial e analytics.
              </li>
              <li>Provedores de WhatsApp somente quando a integração for ativada e autorizada.</li>
              <li>Consultores profissionais (jurídico, contábil) quando necessário.</li>
              <li>Autoridades, quando exigido por lei.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. Retenção</h2>
            <p className="mt-2">
              Mantemos os dados pelo tempo necessário às finalidades descritas, ou conforme exigido
              por lei. Após esse período, os dados são excluídos ou anonimizados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Seus direitos</h2>
            <p className="mt-2">
              Você pode solicitar acesso, correção, anonimização, portabilidade, eliminação dos seus
              dados, revogação de consentimento e informações sobre compartilhamento, nos termos da
              LGPD. Para exercer seus direitos, entre em contato pelos canais do Serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. Segurança</h2>
            <p className="mt-2">
              Adotamos medidas técnicas e organizacionais adequadas (criptografia em trânsito,
              controles de acesso, monitoramento) para proteger seus dados contra acessos não
              autorizados, perdas ou alterações.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">8. Cookies</h2>
            <p className="mt-2">
              Utilizamos cookies essenciais para autenticação e funcionamento do Serviço, e cookies
              de analytics para melhorar a experiência. Você pode gerenciar preferências no seu
              navegador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">9. Alterações</h2>
            <p className="mt-2">
              Esta Política pode ser atualizada periodicamente. Mudanças relevantes serão
              comunicadas no Serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">10. Contato</h2>
            <p className="mt-2">
              Solicitações sobre privacidade devem ser enviadas pelos canais de atendimento
              informados pelo responsável por esta instalação.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
