# Página de Sucesso do Pagamento (/app/sucesso)

## O que o usuário verá
- Ícone de confirmação e título grande: **"Pagamento Realizado com Sucesso!"**
- Mensagem curta de agradecimento, com o nome do plano quando disponível.
- **Instruções para acessar o produto**, em passos numerados:
  1. Confira seu WhatsApp: você receberá uma mensagem de ativação da MárcIA no número usado na compra.
  2. Responda a mensagem de ativação para vincular seu número à sua conta.
  3. Acesse seu painel pelo botão abaixo (ou pelo e-mail/senha cadastrados em "Entrar").
  4. Siga o guia inicial para configurar sua empresa e começar a registrar suas finanças.
- Botões: **"Acessar meu painel"** (vai para o início do app) e **"Ver guia de uso"** (vai para o guia).
- Aviso de ajuda: se a mensagem não chegar em alguns minutos, falar com o suporte.

## Comportamento
- Fica dentro da área do assinante, então exige login (quem não estiver logado vai para "Entrar" e depois volta).
- O retorno do pagamento via cartão (Stripe) passa a levar para esta página em vez da tela de checkout.
- Visual seguindo o mesmo estilo do restante do painel.

## Detalhes técnicos
- Novo arquivo `src/routes/app/sucesso.tsx` (`createFileRoute("/app/sucesso")`) renderizado dentro do layout `/app`, com `head()` próprio (título/descrição/og).
- Alterar `success_url` em `src/lib/stripe.functions.ts` para `${base}/app/sucesso`.
- Plataformas externas (Cakto, Kiwify, PerfectPay) podem ser configuradas pelo dono para redirecionar a `https://mianota.lovable.app/app/sucesso`.
