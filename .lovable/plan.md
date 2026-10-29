# Melhorias em "Planejamento e calendário" (/app/planejamento)

Hoje a página mostra um calendário mensal com lançamentos e contas, um painel do dia (resumo, linha do tempo) e um campo para pedir à MIA que crie lembretes/contas naquele dia.

## 1. Novas funcionalidades
- **Saldo projetado por dia**: linha/indicador mostrando como o saldo evolui até o fim do mês, com alerta nos dias em que ficaria negativo.
- **Ações rápidas no dia**: marcar conta como paga, adiar, editar valor/data e excluir direto no painel do dia (sem passar pelo chat).
- **Contas recorrentes**: criar/editar recorrência (mensal, semanal, anual) e ver as próximas ocorrências já no calendário.
- **Arrastar e soltar** uma conta para outro dia para reagendar (com confirmação).
- **Visões alternativas**: Mês, Semana e Lista (agenda), com filtros por tipo (entrada, saída, conta, lembrete), categoria e status (pago, pendente, atrasado).
- **Metas e orçamento no calendário**: dias em que um orçamento de categoria foi estourado e marcos de metas aparecem marcados.

## 2. Integrações com outras páginas e dados
- **Notificações**: contas atrasadas/próximas usam as mesmas regras da Central de avisos; botão "Lembrar-me" cria aviso com horário.
- **Movimentações**: clicar num lançamento abre o mesmo detalhe da tela de Movimentações; link "ver no extrato" filtrado pelo dia.
- **Falar com MIA**: botão "Planejar o mês com a MIA" envia um resumo do mês (contas pendentes, saldo projetado) e retorna sugestões; áudio também no composer do dia.
- **WhatsApp**: contas criadas pelo WhatsApp aparecem com selo do canal; resumo semanal reaproveita a projeção.
- **Exportar**: adicionar contas ao Google Agenda/Apple (arquivo .ics) e incluir a projeção no relatório mensal em PDF.
- **Demo**: a página /demo mostra o mesmo calendário com dados fictícios.

## 3. Melhorias visuais
- Cabeçalho com 4 cartões: a receber, a pagar, atrasadas e saldo projetado no fim do mês.
- Células do dia com pontos coloridos por tipo, valor líquido do dia e destaque para dias com atraso; hoje bem marcado.
- Painel do dia fixo à direita no computador (em vez de janela), e em tela cheia/gaveta no celular.
- Cores trocadas por tokens do tema (modo escuro consistente), animações suaves na troca de mês, estados vazios com sugestão de ação.
- Navegação rápida: botão "Hoje", seletor de mês/ano e atalhos de teclado (← → para mudar mês).

## Sugestão de ordem
1. Visual + cartões de resumo + painel lateral.
2. Ações rápidas no dia, filtros e visão Lista/Semana.
3. Saldo projetado e alertas de saldo negativo.
4. Recorrências e arrastar-e-soltar.
5. Integrações (.ics, MIA, Notificações, PDF, demo).

## Detalhes técnicos
- Componente compartilhado `src/components/finance/planner-view.tsx` continua alimentando /app e /demo; regras puras (projeção, status atrasado, recorrência) em `src/lib/finance-period.ts` ou novo `planner-rules.ts` com testes.
- Ações (pagar, adiar, reagendar, excluir) como server functions autenticadas validando a empresa do usuário; disparam `marcia:finance-updated`.
- Migrar carregamento para loader + `useSuspenseQuery`.
- .ics gerado no navegador, sem dependências novas.
