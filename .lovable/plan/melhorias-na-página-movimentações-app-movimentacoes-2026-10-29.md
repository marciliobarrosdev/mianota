# Melhorias na página Movimentações (/app/movimentacoes)

## O que a página faz hoje
- Lista entradas e saídas do período, com busca e filtros por tipo, categoria e forma de pagamento.
- Mostra totais de entradas e saídas e um painel de detalhes que abre em cada item (origem, status, datas).
- Permite registrar um novo lançamento manualmente ou ir para "Registrar falando" (chat da MIA).
- Hoje não dá para editar, excluir, marcar como pago nem exportar direto daqui.

## Fase 1 — Ações em cada lançamento
1. Botões **Editar**, **Excluir** (com "Desfazer"), **Marcar como pago/recebido** e **Duplicar** em cada item.
2. Seleção de vários itens para pagar, mudar a categoria ou excluir de uma vez.
3. Mostrar a foto ou o PDF do comprovante (de recibos vindos pelo WhatsApp) direto no detalhe.

## Fase 2 — Visual e leitura
1. Quatro cartões no topo, no mesmo padrão do Planejamento: Entradas, Saídas, Saldo do período e Pendentes (todos em R$).
2. Lista agrupada por dia, com o saldo do dia, e cabeçalho fixo ao rolar.
3. Filtros rápidos: **Status** (pago, pendente, vencido) e **Origem** (WhatsApp, chat, manual, foto), além de chips com os filtros ativos e um botão "Limpar".
4. Ordenação por data, valor ou categoria. Valores sempre com o mesmo padrão "R$ 0,00".
5. No celular, cartões mais compactos e um botão flutuante "+ Nova".

## Fase 3 — Integrações com o resto do MIAnota
- **Planejamento:** "Ver no calendário" em cada item, e as mudanças feitas aqui aparecem no calendário.
- **MIA:** "Perguntar à MIA sobre este gasto" e "Corrigir categoria com a MIA". A MIA passa a aprender quando você corrige uma categoria.
- **Notificações:** pagar ou excluir aqui atualiza os avisos de contas a vencer.
- **Orçamentos:** uma barra do orçamento da categoria aparece no detalhe ("Mercado: 72% do limite").
- **Relatórios:** exportar CSV e PDF do período ou da seleção filtrada, reaproveitando o relatório que já existe.
- **Demonstração:** a página de demo ganha as mesmas telas, sem salvar nada.

## Fase 4 — Funções novas (opcional)
- Importar extrato bancário (OFX/CSV) com detecção de lançamentos repetidos.
- Dividir um lançamento entre categorias.
- Tags livres (ex.: "viagem", "casa").
- Gráfico de gastos por categoria no período.

## Detalhes técnicos
- Novas funções do servidor em `src/lib/finance-transactions.functions.ts` (update, delete, pay, bulk e export). Elas reutilizam o mesmo acesso por empresa já usado em `listFinanceTransactions` e chamam `runAllForUser` depois de cada mudança, como o Planejamento faz.
- Os ajustes de visual ficam no componente compartilhado `transactions-view.tsx`, que também é usado pela demo.
- O PDF reaproveita `buildPeriodReport`. O CSV é gerado no navegador.
- Testes para as regras de filtro, ordenação e totais.

Sugestão: começar pelas Fases 1, 2 e 3 juntas. A Fase 4 fica para depois.
