# Um link InfinitePay por plano

## O que muda
- **Plano Basic (R$ 29,90):** usa o link que você já salvou (`https://checkout.infinitepay.io/marcilio-daniel-5z4/nzCPaVY6R3`).
- **Plano Pro (R$ 49,90):** ganha uma nova credencial própria para o Link 2. Vou abrir um formulário seguro para você colar esse link.
- InfinityTag e API Key continuam as mesmas para os dois planos.
- Ao clicar em "Assinar … agora", o assinante vai direto para o link do plano escolhido. Se um plano estiver sem link, o app mostra um aviso em vez de abrir o link errado.

## Como o pagamento é reconhecido
Links fixos não sabem qual empresa está pagando. Então, quando chega o aviso da InfinitePay:
1. O pagamento é conferido direto na InfinitePay, como já acontece hoje.
2. O plano é identificado pelo link/valor pago (R$ 29,90 = Basic; R$ 49,90 = Pro).
3. A empresa é encontrada pelo e-mail do comprador informado no checkout. Por isso, o assinante precisa usar no checkout o mesmo e-mail da conta.
4. Se o e-mail não bater com nenhuma conta, o pagamento fica registrado no histórico como "empresa não encontrada" e o boas-vindas pelo WhatsApp tenta vincular a conta, como já acontece nas outras plataformas.

Os nomes exatos dos campos de e-mail e valor no aviso da InfinitePay ainda não foram confirmados com um pagamento real. O primeiro pagamento de teste vai mostrar isso.

## Detalhes técnicos
- Novo campo em `infinitepay`: `checkout_link_2` → `INFINITEPAY_CHECKOUT_LINK_2`; `INFINITEPAY_CHECKOUT_LINK` passa a ser o link do plano `starter`.
- `infinitepay-rules.ts`: `checkoutLinkForPlan(slug, links)` e `planSlugForAmount(cents)` (2990→starter, 4990→pro), com testes.
- `createInfinitePayCheckout` retorna o link fixo do plano (adiciona `?email=` só se a InfinitePay aceitar, senão o link puro).
- Webhook: se `order_nsu` for de um link gerado, segue o fluxo atual; senão, usa `planSlugForAmount(paid_amount)` + e-mail do payload (`customer.email`, `payer_email` etc.) e chama `applyEvent` sem `companyId` (busca por e-mail). Idempotência continua por `transaction_nsu`.
