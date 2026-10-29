# Integração com o Checkout InfinitePay

## Links para você cadastrar na InfinitePay
- **Redirecionamento de Sucesso:** `https://mianota.lovable.app/app/sucesso`
- **Webhook:** `https://mianota.lovable.app/api/public/billing/infinitepay`

## O que será feito
1. **Webhook InfinitePay** que recebe as atualizações de pagamento e responde rápido:
   - `200 OK` quando o pagamento foi registrado (ou já tinha sido — sem duplicar).
   - `400 Bad Request` quando algo falha, para a InfinitePay reenviar.
2. **Segurança:** como a InfinitePay não assina as mensagens, cada aviso recebido é conferido diretamente na InfinitePay (consulta de pagamento) antes de liberar a assinatura. Avisos falsos são ignorados.
3. **Liberação do acesso:** pagamento aprovado ativa a assinatura do plano certo, registra no histórico de cobranças e dispara a mesma boas-vindas pelo WhatsApp que as outras plataformas já usam.
4. **Botão de compra:** ao escolher um plano, o assinante é levado ao checkout InfinitePay com o valor correto, já com o link de sucesso e o webhook preenchidos.
   - Plano 1: **R$ 29,90/mês**
   - Plano 2: **R$ 49,90/mês**
5. **Credenciais:** depois de aprovado, abro um formulário seguro para você colar a InfinityTag, a API Key e o Link de Checkout (nunca ficam visíveis no app).
6. Renovação mensal: a InfinitePay não faz cobrança recorrente automática; cada mês é um novo pagamento que renova 30 dias de acesso.

## Detalhes técnicos
- Nova rota `src/routes/api/public/billing/infinitepay.ts`; provedor `infinitepay` adicionado em `src/lib/billing/normalize.ts` e reaproveitando `applyEvent` (idempotência por `event_key` = `transaction_nsu`).
- Verificação via `POST https://api.infinitepay.io/invoices/public/checkout/payment_check` com `handle`, `order_nsu`, `transaction_nsu`, `slug`; só aceita `paid=true` e valor igual ao do plano (centavos).
- Criação do link via `POST https://api.infinitepay.io/invoices/public/checkout/links` em server function, com `order_nsu` = id interno do pedido (empresa + plano), `redirect_url` e `webhook_url`.
- Segredos: `INFINITEPAY_TAG`, `INFINITEPAY_API_KEY`, `INFINITEPAY_CHECKOUT_LINK`, lidos via `resolveIntegration`.
- Preços dos 2 planos ajustados em centavos (2990 / 4990) e teste cobrindo valores e rejeição de valor divergente.
