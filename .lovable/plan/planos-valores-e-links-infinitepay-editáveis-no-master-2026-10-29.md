# Planos, valores e links InfinitePay editáveis no Master

## O que muda em /master/planos
- Cada plano continua com nome, descrição, valor mensal e limites editáveis (isso já existe).
- O campo de link externo passa a se chamar **"Link de Checkout InfinitePay"**, com explicação curta:
  - Plano Basic → Link 1 (R$ 29,90)
  - Plano Pro → Link 2 (R$ 49,90)
- Mostra se o link é válido (precisa começar com `https://checkout.infinitepay.io/`) e um botão "Testar link" que abre o checkout em nova aba.
- Na lista de planos, cada cartão mostra "InfinitePay configurado" ou "Sem link de checkout".
- O Link 1 que você enviou já é preenchido no plano Basic. O Link 2 do Pro continua salvo em segurança até você colá-lo aqui também.

## Como o resto do app passa a usar isso
- **Botão "Assinar … agora":** usa o link salvo no plano. Se o plano estiver sem link, usa o Link 1/Link 2 já salvos em segurança como reserva.
- **Valores:** o preço que você colocar no Master passa a valer para tudo, inclusive para conferir o pagamento recebido. Não há mais valores fixos escondidos no código.
- **Reconhecimento do pagamento:** o plano é identificado pelo valor pago comparado aos preços atuais dos planos ativos. Por isso, dois planos ativos não podem ter o mesmo preço, e o Master vai avisar se isso acontecer.

## Detalhes técnicos
- `infinitepay-rules.ts`: remove `INFINITEPAY_PLAN_PRICES_CENTS`; `planSlugForAmount(cents, plans)` e `checkoutLinkForPlan(plan, envLinks)` recebem os planos do banco (link do plano > env por slug starter/pro). `isInfinitePayLink(url)` para validar. Testes atualizados.
- `createInfinitePayCheckout`: lê `checkout_url` do plano.
- Webhook: carrega planos ativos (`slug, preco_cents`) e confere o valor com `isPaymentAcceptable`.
- `master/planos.tsx`: novos rótulos e textos, validação de link e de preço duplicado, selo na lista. Salvamento continua pelo mesmo fluxo atual.
- Dados: preencher `checkout_url` do plano `starter` com o Link 1.
