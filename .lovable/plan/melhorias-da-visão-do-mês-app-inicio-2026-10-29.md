# Melhorias da "Visão do mês" (/app/inicio)

## Hoje a página mostra
4 indicadores (Saldo, Entrou, Saiu, Sobra prevista), gráfico de evolução, maiores categorias, uma dica da MIA, últimas movimentações e próximos 14 dias. Tudo é só leitura: nada pode ser feito direto daqui.

## O que proponho

### 1. Ações rápidas (sem sair da página)
- Botões "Nova despesa", "Nova receita", "Importar extrato" e "Falar com a MIA".
- Nos "Próximos 14 dias": marcar conta como paga, adiar 1 dia/1 semana, com desfazer (mesmas ações do Planejamento).
- Nas "Últimas movimentações": abrir o detalhe/edição igual ao de Movimentações.

### 2. Comparação com o mês anterior
- Cada indicador mostra a variação (ex.: "Saiu +12% vs. setembro").
- Categorias mostram quanto subiram/caíram em relação ao mês anterior.

### 3. Orçamentos e metas no painel
- Card "Orçamentos" com barras de uso por categoria (verde/amarelo/vermelho) usando os limites já salvos.
- Card "Metas" com progresso, ligado ao Planejamento.

### 4. Alertas que levam à ação
- Faixa de atenção com: contas atrasadas, saldo projetado negativo (só de hoje em diante), orçamento estourado, créditos/plano perto do fim. Cada item abre a página certa (Planejamento, Movimentações, Configurações).
- Contador de avisos não lidos com atalho para Notificações.

### 5. Saldo projetado até o fim do mês
- Mini linha "Saldo hoje → saldo previsto no dia 30/31", com o dia mais apertado do mês.

### 6. Dica da MIA mais útil
- 2–3 dicas reais do período (maior gasto, categoria que mais cresceu, conta que vence amanhã), com botão "Perguntar à MIA" que já abre o chat com a pergunta pronta.

### 7. Integrações
- Clique em uma categoria abre Movimentações filtrado nela; clique em um dia do gráfico abre aquele dia.
- Botão "Baixar PDF do mês" e "Enviar no WhatsApp" (usando o relatório mensal existente).
- Status curto: WhatsApp vinculado / notificações ativas, com atalho se faltar algo.

### 8. Visual
- Indicadores com destaque maior para "Saldo" e "Sobra prevista", cores apenas do tema (corrigir cores fixas que quebram o modo escuro).
- Saudação personalizada ("Boa tarde, Marcilio") com data de hoje.
- Melhor layout no celular: indicadores em carrossel, ações rápidas fixas no topo.
- Estados vazios mais claros por bloco, e carregamento por bloco em vez da página inteira.
- A demonstração (/demo) recebe os mesmos blocos com dados fictícios.

## Detalhes técnicos
- Página continua usando o componente compartilhado `finance-overview.tsx` (app e demo).
- Comparativo, orçamento, metas, projeção e alertas: estender os dados do dashboard (`useFinanceDashboard`) com campos novos calculados no servidor; regras puras em `finance-period.ts`/arquivo de regras com testes.
- Ações reutilizam `finance-planner.functions.ts` e `finance-transactions.functions.ts` (já disparam `runAllForUser`).
- PDF/WhatsApp reutilizam `monthly-report.server.ts`.
- Sem mudanças no banco previstas.

Sugestão: implementar em duas etapas — (1) itens 1, 2, 4, 7 e 8; (2) itens 3, 5 e 6.
