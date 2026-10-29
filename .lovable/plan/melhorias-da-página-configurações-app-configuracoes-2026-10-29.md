# Melhorias da página Configurações (/app/configuracoes)

## Problemas encontrados hoje
- **Minha Experiência** salva direto no perfil da MIA, sem passar pela mesma validação da página "Personalidade e regras". Isso pode apagar ou corromper regras, categorias automáticas e estilo configurados lá. As duas telas também mostram opções repetidas.
- **Canais** mostra só cartões fixos: não diz se o WhatsApp está mesmo vinculado, se o celular recebe avisos, nem se o canal central está conectado.
- **Conta e Plano** fala em "cadastrar cartão" (texto do Stripe), mas o pagamento agora é pela InfinitePay com renovação manual de 30 dias. Não mostra a data de vencimento, os créditos de IA, o histórico de pagamentos nem a opção de comparar planos. O link "Trocar de plano" usa o nome do plano em vez do identificador.
- **Privacidade** ainda diz "quando o serviço de envio estiver configurado" (os avisos no celular já funcionam). O histórico mostra códigos técnicos e não tem filtro. Não há como excluir a conta nem desconectar outros aparelhos.
- Visual: cores roxas fixas fora do tema da marca, botões de liga/desliga feitos à mão em vez do padrão, e cartões com estilos diferentes entre as abas.

## O que fazer

### 1. Minha Experiência (integrada à MIA)
- Salvar pelo mesmo caminho validado da "Personalidade e regras", sem apagar o que foi configurado lá.
- Deixar aqui só o essencial: nome, foco, estilo, alerta de orçamento, resumo semanal e alertas proativos. Um atalho leva para as regras avançadas.
- Prévia da resposta da MIA ao vivo, usando dados reais do mês (categoria que mais pesou no orçamento).
- Ligar "Avisar quando usar X% do orçamento" ao alerta de orçamento que realmente é enviado.

### 2. Canais (status real)
- Cartões com o estado de verdade: **App** (pronto), **WhatsApp** (número vinculado mascarado, ou "não vinculado"), **Avisos no celular** (quantos aparelhos), **WhatsApp para avisos** (ligado/desligado) e **Relatório mensal em PDF**.
- Ações rápidas em cada cartão: vincular/desvincular o WhatsApp, ativar avisos neste aparelho, enviar teste e baixar o relatório do mês.
- Faixa de saúde: "Tudo conectado" ou o que falta configurar.

### 3. Conta e Plano
- Cartão do plano com status, **válido até**, dias restantes e uma barra de progresso. Botão **Renovar / Trocar plano** abre a comparação dos planos ativos (com preços e recursos vindos do Master) e vai para o checkout da InfinitePay.
- Uso do plano: créditos de IA usados e restantes e limites do plano.
- Histórico de pagamentos (data, plano, valor, status).
- Textos ajustados para a InfinitePay (sem "cartão cadastrado"; aviso de que a renovação é manual).
- Dados do espaço e meus dados num cartão só; trocar senha com indicador de força e opção de mostrar/esconder.

### 4. Privacidade e segurança
- Corrigir o texto sobre os avisos e mostrar o status real.
- Histórico de atividades em linguagem simples ("Lançamento criado", "Senha alterada"), com filtro e paginação.
- "Sair de todos os aparelhos".
- Exportar meus dados em JSON (já existe) e também em planilha (CSV dos lançamentos).
- Pedido de exclusão da conta (LGPD), com confirmação digitando o e-mail. O pedido aparece no Master para o dono aprovar.

### 5. Visual
- Trocar as cores roxas fixas pelas cores do tema; usar os botões de liga/desliga padrão; um padrão único de cartão e cabeçalho por aba.
- Lembrar a aba aberta no endereço (ex.: `?aba=canais`) para links diretos vindos de avisos e do WhatsApp.
- No celular, abas com rolagem horizontal e ícones.

## Detalhes técnicos
- `saveExperience` → `saveAssistantProfile` (normalizado por `assistant-profile-rules.ts`), fazendo merge com o perfil atual.
- Tabs controladas por search param `aba` validado (`validateSearch`).
- Canais: ler `fin_whatsapp_identity`, `marcia_push_subscription`, `notification_preference`, status do canal central via server fn autenticada (sem expor dados do canal).
- Plano: server fn `getAccountOverview` (subscription + plan + créditos + `billing_event` recentes do company), checkout por `slug`.
- Privacidade: mapa `acao → rótulo` em regra pura; `signOut({ scope: "global" })` no realm do assinante; nova tabela `account_deletion_request` (RLS por dono, leitura pelo super-admin) e lista no Master.
- Testes: regras de rótulos do histórico, cálculo de dias/validade do plano e merge do perfil sem perda de campos.

## Fora deste plano (sugestões futuras)
- Autenticação em dois fatores.
- Convidar outra pessoa para compartilhar o espaço financeiro.
- Integração com Open Finance para importar extratos.
