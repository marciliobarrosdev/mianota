import { createFileRoute, Link } from "@tanstack/react-router";
import { brandedRouteHead } from "@/config/brand";
import { CookiePreferencesLink } from "@/components/consent/cookie-consent";
import { CONSENT_POLICY_VERSION, CONSENT_VALIDITY_DAYS } from "@/lib/common/consent-rules";

export const Route = createFileRoute("/politica-de-cookies")({
  head: brandedRouteHead(
    "Política de Cookies",
    (branding) => `Quais cookies e armazenamentos o ${branding.name} usa, para quê e por quanto tempo.`,
  ),
  component: CookiePolicyPage,
});

/** Somente tecnologias realmente identificadas no código do MIAnota. */
const ITEMS = [
  ["sb-…-auth-token (armazenamento local)", "MIAnota / Lovable Cloud", "Mantém o login do assinante", "Essencial", "Até sair da conta"],
  ["Sessão do Master (armazenamento local, chave própria)", "MIAnota / Lovable Cloud", "Mantém o login do proprietário em /superadmin e /master", "Essencial", "Até sair da conta"],
  ["mia-cookie-consent (armazenamento local)", "MIAnota", "Guarda sua escolha de cookies (categorias, data, versão)", "Essencial", `${CONSENT_VALIDITY_DAYS} dias`],
  ["clone-brand-cache (armazenamento local)", "MIAnota", "Guarda nome, cores e logo públicos da plataforma para abrir sem piscar", "Essencial", "Até ser atualizado"],
  ["Service worker /sw.js e inscrição de notificações", "MIAnota / navegador", "Entrega notificações do app que você ativar", "Essencial", "Até desativar as notificações"],
  ["Google Fonts (fonts.googleapis.com)", "Google", "Carrega as fontes do site; não grava cookies, mas recebe o endereço IP", "Essencial", "Não armazena"],
  ["theme (armazenamento local)", "MIAnota", "Lembra o tema claro/escuro", "Preferências", "Até ser removido"],
  ["mianota:sidebar-master / mianota:sidebar-app", "MIAnota", "Lembra o menu lateral recolhido", "Preferências", "Até ser removido"],
  ["sidebar_state (cookie)", "MIAnota", "Lembra o estado do menu lateral", "Preferências", "7 dias"],
  ["conv:filter (armazenamento local)", "MIAnota", "Lembra o filtro da tela de conversas", "Preferências", "Até ser removido"],
  ["marcia:pwa-install-dismissed-at (armazenamento local)", "MIAnota", "Lembra que você dispensou o aviso de instalação do app", "Preferências", "Até ser removido"],
];

function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
        <h1 className="mt-6 text-4xl font-bold">Política de Cookies</h1>
        <p className="mt-2 text-sm text-muted-foreground">Versão {CONSENT_POLICY_VERSION}</p>

        <div className="mt-10 space-y-8 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold">1. O que são</h2>
            <p className="mt-2 text-muted-foreground">
              Cookies e armazenamento local são pequenos registros guardados no seu navegador. O MIAnota usa
              apenas os essenciais por padrão; os opcionais só são gravados com sua autorização. Rolar, navegar
              ou fechar o aviso não conta como aceite.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">2. Categorias</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>Essenciais:</strong> login, segurança, sua escolha de cookies e notificações ativadas. Sempre ativos.</li>
              <li><strong>Preferências:</strong> lembram ajustes de tela. Desligados até você permitir.</li>
              <li><strong>Análise:</strong> nenhuma ferramenta em uso no momento.</li>
              <li><strong>Marketing:</strong> nenhuma ferramenta em uso no momento.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold">3. Tecnologias utilizadas</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted">
                  <tr>{["Nome", "Fornecedor", "Finalidade", "Categoria", "Duração"].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {ITEMS.map((r) => (
                    <tr key={r[0]} className="border-t border-border align-top">
                      {r.map((c, i) => <td key={i} className={`p-3 ${i === 0 ? "font-mono text-xs" : ""}`}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2 className="text-xl font-semibold">4. Como mudar ou revogar</h2>
            <p className="mt-2 text-muted-foreground">
              Use “Preferências de cookies” no rodapé do site ou em Configurações → Privacidade. Ao revogar, os
              itens opcionais são apagados do navegador; seu login e a segurança continuam funcionando. A escolha
              vale por {CONSENT_VALIDITY_DAYS} dias ou até esta política mudar.
            </p>
            <CookiePreferencesLink className="mt-3 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted" />
          </section>
          <section>
            <h2 className="text-xl font-semibold">5. Responsável e contato</h2>
            <p className="mt-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
              [Pendente de revisão] Razão social, CNPJ e e-mail do encarregado de dados (DPO) ainda não foram
              informados pelo responsável por esta instalação.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
