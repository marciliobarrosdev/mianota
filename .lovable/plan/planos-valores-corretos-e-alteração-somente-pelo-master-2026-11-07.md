# Planos: valores corretos e alteração somente pelo Master

## O que encontrei
- Hoje no banco: Grátis ativo e sem custo (7 dias), **Basic R$ 29,00** (errado), Pro R$ 49,90, Business inativo.
- Os três foram alterados hoje às 01:24 UTC pela tela `/master/planos` — que grava direto do navegador, sem registro de quem mudou nem histórico.
- A mensagem "Escolha o plano Basic ou Pro…" aparece sempre que o plano pedido no cadastro não está ativo naquele momento (ex.: Grátis desativado). O texto também ignora o Grátis.

## O que vou fazer
1. **Corrigir valores**: Grátis = sem custo (ativo, 7 dias), Basic = R$ 29,90/mês, Pro = R$ 49,90/mês, todos ativos.
2. **Só o Super Administrador altera planos**: criar, editar, ativar, desativar, excluir e atualizar passam a ser feitos apenas por ações protegidas do servidor, chamadas da página `/master/planos`, que conferem o acesso Master. O navegador deixa de poder gravar planos diretamente.
3. **Excluir plano**: novo botão com confirmação. Se o plano já tiver assinantes, a exclusão é bloqueada e oferece desativar (para não quebrar assinaturas).
4. **Histórico de alterações**: toda mudança de plano fica registrada no log de segurança do Master (quem, quando, valor antes/depois).
5. **Proteção extra no banco**: uma trava impede qualquer alteração de plano que não venha dessas ações do Master (nenhuma rotina automática consegue mudar preço ou desativar plano).
6. **Confirmação antes de desativar o Grátis**: aviso de que novos cadastros grátis ficarão bloqueados.
7. **Mensagem do cadastro**: trocar para "Este plano não está disponível no momento. Escolha um dos planos ativos." e mostrar os planos ativos.
8. **Teste completo**: cadastro no Grátis abre o formulário; preços aparecem R$ 29,90 e R$ 49,90 na página inicial, checkout e Master; editar e salvar mantém o valor após recarregar.

## Detalhes técnicos
- Dados: `UPDATE plan` para `starter` (2990) e garantir `free`/`pro` ativos.
- Migração: remover política `plans super admin write` (escrita via cliente); manter leituras. Trigger `BEFORE INSERT/UPDATE/DELETE` que exige flag de sessão `app.plan_admin_write = 'on'` definida por RPC `SECURITY DEFINER` `master_upsert_plan / master_set_plan_active / master_delete_plan` que validam `is_super_admin()`; RPC grava `master_audit_log` com diff.
- `src/routes/master/planos.tsx`: substituir `supabase.from("plan").insert/update` por server functions em `master.functions.ts` (`requireSupabaseAuth` + `assertSuper`) que chamam as RPCs.
- `listPlansBasic`: remover a desativação automática de `business` e a inserção automática (seed vira só leitura).
- `plan-selection.ts`: nova mensagem; testes Vitest para valores 2990/4990/free e para bloqueio de escrita por não-admin.
