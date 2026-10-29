# Adicionar Novo Plano (com opção de Plano Gratuito) em /master/planos

## O que você vai ver
- Botão **"Adicionar Novo Plano"** no topo da página Planos, abrindo o mesmo formulário de edição, vazio.
- No formulário, um interruptor **"Plano Gratuito"**. Ao ligar:
  - O preço fica fixo em R$ 0,00 e os campos de checkout (InfinitePay / Stripe) somem.
  - Aparece o campo **"Limite de Dias"** (obrigatório, ex.: 7, 15, 30) — depois disso o acesso gratuito expira e o assinante é convidado a escolher um plano pago.
  - Os limites de recursos (mensagens, instâncias, usuários, contatos, créditos) ficam em destaque para você restringir.
- O card do plano mostra o selo **"Gratuito · X dias"**.
- O texto "Sua oferta tem dois planos" é trocado para permitir vários planos.

## Como o plano gratuito é ativado
- Na página inicial, o plano gratuito aparece junto aos outros com botão "Começar grátis".
- O assinante cria a conta normalmente; em vez de ir ao pagamento, a assinatura é ativada na hora, com vencimento em "hoje + Limite de Dias" e os limites do plano.
- Cada conta pode usar o plano gratuito apenas uma vez.
- Ao vencer, o acesso é bloqueado como em qualquer assinatura vencida e o assinante vê os planos pagos.

## Regras preservadas
- Nenhuma assinatura é criada sem um plano ativo escolhido.
- Planos pagos continuam exigindo preço único (a InfinitePay identifica o plano pelo valor); planos gratuitos ficam fora dessa checagem.
- Slug novo não pode repetir um existente.

## Detalhes técnicos
- Migração: colunas `is_free boolean default false` e `free_days integer` na tabela `plan`, com restrição `is_free → preco_cents = 0 and free_days > 0`; tabela/coluna para marcar que a empresa já usou o gratuito.
- `planos.tsx`: botão novo, toggle, validação; `save()` envia `is_free`/`free_days`.
- `listPlansBasic` e a página pública deixam de filtrar só `starter`/`pro` e passam a listar todos os planos ativos por `ordem`.
- Nova server function `activateFreePlan` (autenticada): valida plano ativo e gratuito, uso único, cria/atualiza assinatura com `current_period_end = now() + free_days`.
- Fluxo `/entrar?modo=signup&plano=<slug-gratuito>` chama `activateFreePlan` em vez do checkout.
- Testes: preço 0 obrigatório no gratuito, limite de dias > 0, vencimento = hoje + dias, uso único.
