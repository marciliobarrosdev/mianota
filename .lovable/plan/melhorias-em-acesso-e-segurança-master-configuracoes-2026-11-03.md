# Melhorias em "Acesso e segurança" (/master/configuracoes)

## Situação atual
- Lista de e-mails de super admin (adicionar/remover, salvar).
- Card "Liberação por pagamento" só com Kiwify, Cakto e PerfectPay (tokens nos Secrets) — InfinitePay, que é o checkout em uso, não aparece.
- Tabela simples com os últimos eventos de cobrança.
- Cores fixas (violeta/fúcsia) em vez das cores do tema.

## 1. Acessos de administradores
- Proteção: impedir remover o próprio e-mail e o dono da instalação; confirmação antes de remover.
- Mostrar quem é o dono, quando cada admin foi adicionado e último acesso.
- Botão "Salvar" só aparece com alterações pendentes ("Alterações não salvas").

## 2. Pagamentos integrados
- Incluir InfinitePay no topo, com a mesma etiqueta "Checkout de Pagamento Ativo" de /master/pagamentos e link para lá.
- Kiwify/Cakto/PerfectPay agrupados como "Outras plataformas", mostrando a data do último aviso recebido de cada uma.

## 3. Eventos de cobrança
- Cartões de resumo: recebidos hoje, processados, com erro.
- Filtros por plataforma e status, busca por e-mail, link "Abrir ficha" do assinante.
- Botão "Reprocessar" para eventos com erro e exportar CSV.

## 4. Registro de segurança (novo)
- Histórico das ações sensíveis do Master: alteração de admins, chaves de integração, planos, preços, entrada como assinante (impersonação), exclusões.
- Filtro por tipo e período.

## 5. Visual
- Cabeçalho com cartões de saúde: admins, checkout ativo, eventos com erro (24h), canal WhatsApp.
- Cores do tema (claro/escuro), layout em abas: Administradores · Pagamentos · Eventos · Registro.

## Detalhes técnicos
- Regras puras em `src/lib/master/security-rules.ts` (proteção de remoção, resumo/filtro de eventos, CSV) + testes Vitest.
- Nova tabela `master_audit_log` (RLS: só super admin lê; inserção apenas pelo servidor) gravada pelas server functions Master existentes.
- `listRecentBillingEvents` ganha filtros; nova `reprocessBillingEvent` reusa `applyEvent`.
- Status InfinitePay reutiliza `payment-checkout-rules.ts`.

Sugestão: implementar 1, 2, 3 e 5 primeiro; o Registro de segurança (4) em seguida.
