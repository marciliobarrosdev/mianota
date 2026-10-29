# Planejamento e calendário — fase 2

## O que o usuário vai ver

1. **Ações no dia**: ao tocar num dia, cada conta mostra botões **Marcar como paga**, **Adiar** (+1 dia, +7 dias, escolher data), **Editar** (descrição, valor, categoria, data) e **Excluir** (com confirmação). Para itens recorrentes: "só esta ocorrência" ou "esta e as próximas". Botão **Desfazer** após cada ação.
2. **Visão Semana**: nova aba Mês / Semana / Lista. Semana mostra 7 colunas com contas, entradas e totais por dia, com setas para semana anterior/próxima.
3. **Contas recorrentes**: botão "Nova conta" com opção "Repetir" (semanal, quinzenal, mensal, anual, com data de fim opcional). Painel "Recorrentes" lista todas, permite pausar, editar e encerrar.
4. **Arrastar para outro dia**: no computador, arrastar uma conta pendente para outro dia (Mês e Semana) muda o vencimento; no celular usa o "Adiar → escolher data". Contas já pagas não podem ser arrastadas.
5. **Orçamentos e metas**: faixa no topo do mês com orçamentos por categoria (barra de uso, alerta acima do limite) e metas com prazo marcadas no dia do prazo, com progresso.
6. **Integrações**:
   - **Notificações**: lembretes são recalculados após pagar/adiar/editar/excluir (some o aviso de conta paga, novo aviso na nova data).
   - **Movimentações**: marcar como paga gera/atualiza a movimentação; link "ver em Movimentações" no item.
   - **MIA**: botão "Perguntar à MIA sobre este dia/semana" abre o chat com o período já preenchido.
   - **PDF por período**: botão "Baixar relatório" com opções **Dia, Semana, Quinzena, Mês, Período personalizado**; também envio por WhatsApp.

Tudo também aparece na página de demonstração com dados fictícios.

## Detalhes técnicos

- Novas server functions em `src/lib/finance-planner.functions.ts` (requireSupabaseAuth + `authorize`): `payPlannerItem`, `reschedulePlannerItem`, `updatePlannerItem`, `deletePlannerItem`, `undoPlannerAction`, `createRecurrence`/`updateRecurrence`/`listRecurrences`. Ocorrência de recorrência ainda não materializada vira `fin_lancamento` com `recorrencia_id` ao ser paga/adiada/editada; "esta e as próximas" atualiza `fin_recorrencia`. Exclusão de ocorrência única grava lançamento `cancelado` para ocultá-la.
- `getFinancePlanner` passa a retornar também orçamentos (`fin_orcamento` + gasto da categoria no mês) e metas (`fin_meta` com prazo no intervalo).
- Regras puras em `src/lib/planner-rules.ts`: intervalos de semana/quinzena/período, adiamento, validação de arrastar, escopo de recorrência — com testes em `tests/planner-rules.test.ts`.
- PDF: generalizar `buildMonthlyReport` para `buildPeriodReport(db, companyId, from, to, label)` (mês continua usando-o); `monthly-report-rules` ganha `periodBounds(kind, ref)`; limite de 366 dias.
- Após cada ação, chamar a sincronização de lembretes existente (`notification-jobs.server.ts`) e invalidar queries do calendário, dashboard e movimentações.
- Arrastar com HTML5 drag-and-drop nativo (sem nova dependência); componentes em `src/components/finance/planner-*`, demo alimentado por `finance-demo-data.ts`.
- Sem mudança de banco prevista (tabelas de recorrência, orçamento e meta já existem).
