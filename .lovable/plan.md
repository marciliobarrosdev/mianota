# Liberar Pagamento (Assinantes)

## O que o dono vai ver
Nova ação **"Liberar pagamento"** no menu "…" de cada assinante em /master/assinantes. Ela abre uma janela com:

1. **Plano**: lista com todos os planos ativos (Gratuito, Basic, PRO e qualquer plano criado depois), cada um com preço e se é gratuito ou pago.
2. **Período**: para planos pagos, padrão de 30 dias (pode escolher 1 a 365). Para o gratuito, usa os dias de limite do plano.
3. **Créditos de IA**: recarrega os créditos do plano escolhido (vem marcado).
4. **"Liberação do Super Administrador"**: caixa obrigatória. Sem ela marcada, o botão Liberar fica desligado.
5. **Observação** (opcional), por exemplo "pagou via Pix".
6. Um resumo: "Plano PRO liberado até 03/12/2026".

Ao clicar em **Liberar**:
- o plano é ativado na hora;
- a situação do assinante passa para Ativo (sai de Trial ou Suspenso);
- a lista se atualiza sem recarregar a página;
- o assinante recebe o aviso "Pagamento confirmado" na Central de avisos (e no WhatsApp, se estiver ativo).

Se o plano escolhido for o **Gratuito** e esse e-mail já usou o gratuito antes, a liberação é recusada com uma mensagem clara. Isso segue a regra de "gratuito só uma vez por conta".

## Onde mais aparece
- **Ficha do assinante** e **Assinaturas**: etiqueta "Liberado pelo Super Admin" com data de vencimento.
- **Acesso e segurança → registro de ações**: quem liberou, qual plano, período e observação.
- **Eventos de pagamento**: um registro "Liberação manual", para separar das cobranças reais.

## Detalhes técnicos
- Regras puras em `src/lib/master/manual-release-rules.ts` + testes Vitest: validar dias (1–365), calcular a data de vencimento (a partir de hoje, ou somando ao vencimento atual quando ainda vale), dias do plano gratuito = `free_days`, exigir a confirmação.
- Nova server function `releaseCompanyPlan` em `master.functions.ts` (requireSupabaseAuth + `assertSuper`):
  - lê o plano (precisa estar ativo); se `is_free`, confere `free_plan_usage` por e-mail normalizado/user id e grava o uso;
  - grava o evento de pagamento com `provider: "manual"` e um `event_key` único, depois chama o mesmo `applyEvent` (`purchase_approved`, `companyId`, `periodEnd`) que já ativa a assinatura, muda o status para "ativo", recarrega créditos e manda o aviso. Assim a ativação não fica duplicada;
  - para o gratuito, deixa o status como "trial" com `trial_ate`, como no cadastro;
  - `writeMasterAudit` com plano, período, observação e flag `super_admin_release`.
- Antes de implementar, confirmar se `subscription.provider` e `billing_event_log.provider` aceitam "manual" (restrição/enum). Se não aceitarem, fazer uma pequena migração que só acrescenta esse valor.
- Interface: novo diálogo `src/components/master/release-plan-dialog.tsx`; item no dropdown de `assinantes.tsx`; invalidar a lista após o sucesso.
- Verificação: testes, TypeScript e uma chamada real da função com um assinante de teste, conferindo assinatura, status e créditos no banco.
