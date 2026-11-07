# Plano Grátis visível em Assinantes, Assinaturas e Leads

## O que muda para você
Todo novo assinante do Plano Grátis — venha do cadastro público, do botão "Novo assinante" no Master ou da ação "Liberar pagamento" com plano grátis — aparece nas três páginas: Assinantes, Assinaturas (como assinatura em teste) e um card em "Novos Leads" no Kanban.

## Situação atual (conferida no código)
- Cadastro público grátis: já cria assinante, assinatura e card de lead.
- "Novo assinante" no Master com plano grátis: cria assinante e assinatura, mas **não cria card em Leads**.
- "Liberar pagamento" para o plano grátis: atualiza a assinatura, mas **não cria card em Leads**.

## O que será feito
1. Criar o card de lead também nos dois caminhos do Master (sem duplicar se já existir; nunca quebra o cadastro se falhar).
2. Recuperar uma única vez assinantes grátis já existentes que estejam sem card em Leads (sem alterar dados reais, só adicionar o card que falta).
3. Conferir que a página Assinaturas lista a assinatura grátis (status teste, valor "Sem custo") e corrigir se não listar.
4. Teste automático: cadastro grátis pelo Master gera lead; plano pago não gera.
5. Validação no navegador com um cadastro de teste identificado, conferindo as 3 páginas, e depois remover apenas esse teste.

## Detalhes técnicos
- `createLeadFromFreeSignup` (upsert com `onConflict company_id, ignoreDuplicates`) chamado após `free_plan_usage` em `createCompanyWithOwner` e em `releaseCompanyPlan` (ramo free), em `src/lib/master/master.functions.ts`.
- Backfill via insert idempotente em `master_lead` para empresas com `free_plan_usage` e sem lead.
