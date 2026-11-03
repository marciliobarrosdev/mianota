# Master: "Comece aqui" (/master/checklist) e "Personalizar o clone" (/master/implantacao)

## Situação atual
- **Comece aqui** confere 8 itens (acesso, planos, trial, pagamentos, canal WhatsApp, template Meta, IA, assinante teste). Não confere InfinitePay, notificações no navegador, avisos automáticos, relatório mensal, Google nem as páginas novas do assinante. Itens não mostram detalhe do que falta nem quando foram conferidos.
- **Personalizar o clone** é uma página estática e desatualizada: fala em "TurboSaaS Academy", diz que a marca não pode ser vista aqui e os 3 passos finais não sabem se já foram feitos. Ela repete parte do checklist.
- As duas usam cores roxas fixas fora do tema (não acompanham modo escuro).

## Proposta

### 1. Comece aqui — checklist completo e vivo
- Novos itens automáticos, agrupados em 4 blocos com progresso próprio:
  - **Vender**: planos com preço e link, InfinitePay (tag, links, último aviso de pagamento recebido), página de sucesso, plano gratuito configurado.
  - **Atender**: canal WhatsApp ativo, template Meta, último recebimento de mensagem, MIA respondendo (modelo de IA testado).
  - **Avisar**: notificações no navegador prontas, avisos automáticos rodando (última execução), relatório mensal ativo.
  - **Operar**: assinante teste, pedidos de exclusão pendentes, publicação (link do site).
- Cada item mostra: status (pronto / falta / atenção), o motivo em uma frase, "conferido há X min" e botão direto para a página que resolve.
- Botão "Testar agora" nos itens testáveis (IA, WhatsApp, notificação de teste para o próprio dono).
- Cabeçalho com nome e slogan MIAnota, próxima ação e % geral; card de comemoração quando tudo estiver pronto.

### 2. Personalizar o clone → "Sua marca"
- Mostrar a marca atual de verdade: nome MIAnota, slogan, foto da MIA, cores, logo e link do site — leitura apenas (a marca continua mudando pelo projeto, como hoje).
- Gerador de **prompt pronto** para colar na Lovable (nome, slogan, cores, público), com botão copiar — substitui a referência à Academy.
- Passos "depois da marca" passam a mostrar se já estão feitos, usando os mesmos dados do checklist (sem duplicar lógica).
- Lista "onde a marca aparece": landing, app, e-mails/WhatsApp, PDF mensal, notificações.

### 3. Integração entre páginas
- Painel do Master ganha faixa "Faltam N itens" que leva ao checklist.
- Menu do Master mostra um ponto quando há item pendente.

### 4. Visual
- Trocar cores fixas por cores do tema (funciona no modo escuro), layout em blocos responsivo no celular, mesmos cartões nas duas páginas.

## Detalhes técnicos
- Regras puras novas em `src/lib/master/master-setup-rules.ts` (status por item, agrupamento, %) + testes.
- `getMasterSetupProgress` ampliado para ler: config InfinitePay (via `resolveIntegration`), último billing event InfinitePay, `marcia_push_subscription`/chave VAPID presente, última notificação gerada pelo cron, `ai_provider_config`, `account_deletion_request` pendentes.
- A página de marca lê `src/config/brand` (sem gravar).

## Fora do escopo
- Editar a marca pelo painel. Corrigir o envio conjunto dos logins (etapa separada).
