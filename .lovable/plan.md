# Organizar painel financeiro, movimentações e funções do Master

Objetivo: dividir os arquivos muito grandes em partes menores, **sem mudar nada do que o usuário vê ou faz**. Dados, telas, textos e integrações continuam iguais.

## O que será dividido

1. **Painel financeiro** (`src/components/finance/finance-overview.tsx`, 816 linhas)
   - Regras de cálculo/formatação puras -> `src/lib/finance/finance-overview-rules.ts`
   - Blocos visuais (cartões de resumo, gráficos, listas recentes) -> `src/components/finance/overview/*`
   - O arquivo original fica como composição fina.

2. **Movimentações** (`src/components/finance/transactions-view.tsx`, 737 linhas)
   - Filtros, ordenação e agrupamento -> `src/lib/finance/transactions-view-rules.ts`
   - Barra de filtros, linha da lista, diálogo de edição -> `src/components/finance/transactions/*`

3. **Funções do Master** (`src/lib/master/master.functions.ts`, 1017 linhas, 15 funções)
   - Separado por assunto: `master-companies.functions.ts` (empresas, suspensão, teste, detalhes, perfil, liberação de plano, senha do dono), `master-plans.functions.ts` (planos), `master-admins.functions.ts` (e-mails de super admin), `master-kpis.functions.ts` (indicadores e assinaturas).
   - Ajudantes comuns (ex.: checagem de super admin) -> `master-guards.server.ts`.
   - `master.functions.ts` passa a apenas reexportar, então os 8 arquivos que o usam continuam funcionando sem alteração.

## Garantias
- Nenhuma mudança no banco de dados.
- Comentários curtos só em lógicas não óbvias.
- Novos testes para as regras extraídas (filtros, totais do painel).
- Rodar todos os testes e abrir no navegador: /app/inicio, /app/movimentacoes, /master/painel, /master/empresas, /master/planos (computador e celular, claro e escuro).
- Atualizar README, MANUAL e NOVAS-IMPLEMENTAÇÕES.
