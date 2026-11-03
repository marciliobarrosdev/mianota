# Ajuste dos cálculos: Visão do mês, Movimentações e Planejamento

Todos os valores passam a usar a data de hoje (fuso de Brasília) como corte e só contam lançamentos ativos (excluídos ficam fora). "Recebido/pago" = lançamento marcado como pago/recebido.

## 1. Visão do mês (/app/inicio)
- **Entrou** = total recebido do dia 1 do mês atual até hoje.
- **Saiu** = total pago do dia 1 do mês atual até hoje.
- **Saldo do período** = sobra do mês anterior (tudo recebido − tudo pago até o último dia do mês passado) + Entrou − Saiu.
  - Observação: a fórmula enviada é "sobra do mês anterior − gastos". Somamos também o que entrou no mês; sem isso, um salário recebido em novembro não apareceria no saldo. Se preferir a versão literal (sem as entradas), diga e mudamos.
- **Sobra prevista** = mesmo valor do Saldo do período, como pedido. O texto de apoio passa a dizer "sobra do mês anterior + entradas − saídas até hoje".
- Comparação "vs. período anterior" compara com o mesmo intervalo do mês passado (dia 1 até o mesmo dia).
- Estes cartões sempre mostram o mês atual até hoje, mesmo que o filtro escolhido seja outro; gráficos e categorias continuam seguindo o filtro.

## 2. Movimentações (/app/movimentacoes)
- **Entradas** = total recebido do dia 1 do mês atual até hoje.
- **Saídas** = total pago do dia 1 do mês atual até hoje.
- **Saldo do período** = tudo recebido nos últimos 30 dias (hoje incluído) − tudo pago nos últimos 30 dias.
- **Pendentes** = soma do que ainda não foi pago/recebido e já tem data vencida (antes de hoje).
- Clicar nos cartões continua filtrando a lista.

## 3. Planejamento e calendário (/app/planejamento)
- **A receber** = soma das entradas não recebidas com data de hoje até 1 mês à frente.
- **A pagar** = soma das contas não pagas com data de hoje até 1 mês à frente (nada atrasado entra aqui).
- **Atrasadas** = soma das contas não pagas com data anterior a hoje (de qualquer mês).

## Testes
Testes com valores concretos para cada regra acima (ex.: sobra anterior R$ 100, entrou R$ 3.200, saiu R$ 520,44 → saldo R$ 2.779,56; conta vencida ontem conta em Atrasadas e não em A pagar; conta para daqui a 40 dias não conta em A pagar).

## Detalhes técnicos
- Novo módulo puro `src/lib/finance/summary-cards-rules.ts` com funções `monthToDateTotals`, `previousMonthCarryCents`, `last30DaysBalance`, `overdueOpenCents`, `upcomingOpen(today, +1 mês)`; usa `finance-period.ts` para datas no fuso de São Paulo.
- `finance-dashboard.functions.ts`: buscar também lançamentos pagos até o fim do mês anterior (agregado) para a sobra; retornar um bloco `cards` independente do filtro. Demo (`finance-demo-data.ts`) recebe o mesmo bloco.
- `transactions-view.tsx` e `planner-view.tsx`: cartões passam a usar as novas funções sobre os lançamentos carregados; os loaders ampliam a janela de busca para cobrir últimos 30 dias, atrasados antigos e 1 mês à frente quando o período filtrado for menor.
- Lançamentos divididos por categoria contam pelo valor total do lançamento (as divisões só afetam totais por categoria).
- Testes Vitest em `tests/summary-cards-rules.test.ts`.
