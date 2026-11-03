# Melhorias Master: Ativação pós-compra, Planos e Pagamentos

## 1. Ativação pós-compra (/master/onboarding)
- Resumo no topo: cartões clicáveis com totais por etapa (aguardando envio, enviada, aguardando resposta, vinculada, com erro) que filtram a lista.
- Busca por nome, e-mail ou telefone, e filtro por período (hoje, 7 dias, 30 dias).
- Cada compra mostra a foto, o nome e o e-mail do assinante, o plano comprado e o checkout usado (InfinitePay/Stripe), com link "Abrir ficha" para Assinantes.
- Alerta claro quando o canal de WhatsApp não está conectado, com botão para ir direto ao canal.
- Indicador de tempo: há quanto tempo cada pessoa está esperando para vincular, em destaque depois de 24h.
- Exportar a lista filtrada em CSV.
- Cores ajustadas ao tema (claro e escuro), sem verde/âmbar fixos.

## 2. Planos (/master/planos)
- Cards em grade de até 3 por linha em telas grandes, 2 em telas médias e 1 no celular, todos com a mesma altura.

## 3. Pagamentos (/master/pagamentos)
- Etiqueta verde **"Checkout de Pagamento Ativo"** no card do checkout que está 100% pronto: dados salvos, teste aprovado e ao menos um plano ativo usando esse checkout.
- Os outros cards mostram o que falta ("Falta testar", "Nenhum plano usa este checkout", "Não configurado").
- Faixa no topo da página dizendo qual checkout está recebendo pagamentos agora.

## Detalhes técnicos
- Regra pura `payment-checkout-rules.ts` (decide checkout ativo a partir de configured/testOk e do modo dos planos ativos) + teste Vitest.
- Regras de contagem/filtro do onboarding em `onboarding-queue-rules.ts` + teste; dados vêm da função já existente da fila, adicionando campos de assinante/plano se faltarem.
- Planos: trocar `md:grid-cols-2` por `md:grid-cols-2 xl:grid-cols-3` com `h-full`.
