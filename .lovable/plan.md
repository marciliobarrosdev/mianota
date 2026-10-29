# Faixa do Trial + "Ativar plano" levando ao pagamento

## O que muda para o cliente
1. **Faixa do Trial** no topo: fundo verde-água `#4abaa8`, todos os textos em branco `#ffffff`. O botão "Ativar plano" fica roxo (cor padrão do sistema) com texto branco.
2. **Clicar em "Ativar plano"** abre a tela "Escolha seu plano" mostrando **somente os planos pagos** (Basic R$ 29,90 e PRO R$ 49,90). Hoje, quem está no trial é mandado de volta para a Visão do mês — isso será corrigido.
3. **Ao escolher um plano** e clicar em pagar, a pessoa vai direto ao **checkout da InfinitePay** daquele plano. Depois do pagamento confirmado, o plano mensal é ativado (fluxo atual do webhook) e a pessoa vê a página de sucesso.
4. **Trial / Gratuito não se repete**: quem já tem conta (está ou esteve no Trial/Gratuito) nunca vê nem consegue escolher o Trial ou plano Gratuito de novo — apenas Basic ou PRO. A regra vale também no servidor, não só na tela.

## Detalhes técnicos
- `src/components/trial-banner.tsx`: trocar `bg-red-600/border-red-800/text-red-50` por tokens novos (`--trial-banner` = #4abaa8, `--trial-banner-foreground` = #ffffff) definidos em `src/styles.css`; botão usa `bg-primary text-primary-foreground`. Link envia `search={{ modo: "upgrade" }}`.
- `src/routes/app/checkout.tsx`:
  - Aceitar `modo=upgrade`; não redirecionar quem está em trial ativo quando vier nesse modo (só redireciona assinantes já `ativo` pago).
  - Com empresa existente, filtrar a lista para planos pagos (`is_free = false` e preço > 0); nunca oferecer "iniciar teste grátis".
  - Pagamento usa `createInfinitePayCheckout` com o plano escolhido (link 1 / link 2 conforme plano).
- Servidor (`src/lib/infinitepay.functions.ts` e checkout Stripe equivalente): rejeitar plano gratuito/preço zero para empresa existente.
- Servidor (`createCheckoutCompany` / troca de plano): bloquear plano gratuito quando a conta já tem empresa ou registro em `free_plan_usage`.
- Teste novo: regra "conta existente só pode escolher plano pago" (Basic 2990 / PRO 4990 aceitos; gratuito rejeitado).
- Verificar no preview: faixa nas cores novas, clique leva à seleção com 2 planos, botão abre o link InfinitePay.
