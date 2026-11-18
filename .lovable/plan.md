# Separar a Visão geral do Master em partes menores

Objetivo: dividir a tela Visão geral do Master (`src/routes/master/painel.tsx`, 588 linhas) em partes menores, **sem mudar nada do que aparece ou do que ela faz**. Textos, cores, números, links e carregamento continuam iguais.

## Nova organização

`src/routes/master/painel.tsx` vira uma composição fina (~120 linhas): carrega os dados, guarda o período escolhido e monta as partes na mesma ordem de hoje.

Novas partes em `src/components/master/overview/`:
- `overview-header.tsx` — título, botões 7d/30d/90d/1 ano, datas e atualizar.
- `setup-progress-card.tsx` — cartão "Termine de preparar seu SaaS" / "Configuração essencial concluída".
- `overview-metrics.tsx` — as duas faixas de 4 indicadores (receita, assinantes, operações, teste; IA, trial, movimentações, contas).
- `signups-chart-card.tsx` — gráfico "Novas assinantes".
- `attention-card.tsx` — "Atenção agora".
- `recent-companies-card.tsx` — "Assinantes recentes".
- `quick-actions-card.tsx` — "Ações rápidas".
- `overview-parts.tsx` — peças pequenas reutilizadas (MetricCard, AttentionItem, StatusBadge, QuickAction).

Regras puras em `src/lib/master/overview-rules.ts`: datas do período (`localDate`), presets, rótulo do preset ("1 ano"/"30d") e % de conversão — com testes em `tests/master-overview-rules.test.ts`.

Os cartões que já são separados (Saúde do sistema, Avisos, Pedidos de exclusão) continuam como estão.

## Verificação
- Rodar todos os testes.
- Abrir a Visão geral como Super Admin no computador e no celular, temas claro e escuro: conferir que tudo aparece igual, trocar o período (7d e 1 ano), alterar uma data e usar o botão de atualizar, sem erros.
- Registrar em NOVAS-IMPLEMENTAÇÕES.
