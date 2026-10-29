# Melhorias sugeridas para o MIAnota e a Central de avisos

Proposta em 3 partes. Aprove tudo, ou me diga quais itens quer primeiro.

## 1. Central de avisos (/app/notificacoes): visual e uso
- **Filtros no topo:** Todas, Não lidas, Contas e vencimentos, Orçamento e metas, Agenda, Sistema, cada um com contador.
- **Agrupar por dia:** "Hoje", "Ontem", "Esta semana", "Mais antigas".
- **Avisos com ação:** tocar no aviso abre o item certo (a conta a vencer em Contas, o lembrete em Planejamento, o agendamento na Agenda) e marca como lido. Botões rápidos quando fizer sentido: "Marcar como paga", "Adiar 1 dia".
- **Cores por tipo e urgência:** vencido em vermelho, vence hoje em laranja, informativo neutro. Hoje tudo é roxo fixo, e as cores não acompanham o modo escuro.
- **Arquivar e excluir:** deslizar ou usar o menu do aviso; também "Limpar lidas".
- **Resumo no topo:** "3 contas vencem esta semana · R$ 412,30", com link para Planejamento.
- **Cartão do aparelho mais compacto** quando já está ativo, mostrando quantos aparelhos estão cadastrados.
- **Mais avisos:** botão "Carregar mais". Hoje a lista para em 100.

## 2. Preferências de notificação (novo)
- Em Configurações (ou na própria Central): escolher quais tipos chegam no celular, no WhatsApp ou só na Central.
- **Horário de silêncio** (ex.: 22h às 7h), quando nada é enviado ao celular.
- **Antecedência dos lembretes de contas:** no dia, 1 dia antes ou 3 dias antes.
- **Resumo diário ou semanal** da MIA no WhatsApp e no celular: saldo, gastos do dia e próximas contas.

## 3. Novas funcionalidades e integrações
- **Lembretes automáticos de verdade:** hoje os avisos de contas só são criados quando você abre o app. Uma rotina diária no servidor passa a gerá-los e a enviar ao celular e ao WhatsApp, mesmo com o app fechado.
- **Alertas inteligentes da MIA:** orçamento de uma categoria passou de 80%, gasto fora do normal, meta atingida, assinatura (plano MIAnota) perto de vencer, créditos de IA acabando.
- **Sininho com contador** no menu do app, em todas as páginas, com os últimos 5 avisos.
- **Aviso de pagamento:** pagamento confirmado pela InfinitePay gera aviso "Plano ativado até dd/mm".
- **Master:** enviar um aviso para todos os assinantes, ou para um plano específico (novidades, manutenção), e ver quantos aparelhos estão ativos.
- **Relatório mensal em PDF** enviado pela MIA no WhatsApp no dia 1.

## Detalhes técnicos
- Página: usar `entity_type`/`entity_id`/`data` para montar o link de destino; filtros e agrupamento no cliente; paginação por `created_at`; trocar `violet-*`/`amber-*` por tokens semânticos do tema.
- Novas colunas `archived_at` e `priority` em `marcia_notification` (aditivas); nova tabela `notification_preference` por usuário, com RLS.
- Rotina diária: rota em `/api/public/cron/reminders` protegida por token e agendada via pg_cron/pg_net; reutiliza `syncFinanceReminders` sem depender da sessão.
- O trigger de push existente passa a respeitar as preferências e o horário de silêncio.
- Sininho global em `app-shell.tsx`, usando a mesma inscrição em tempo real da página.
- Testes para regras de preferência, horário de silêncio e antecedência.
