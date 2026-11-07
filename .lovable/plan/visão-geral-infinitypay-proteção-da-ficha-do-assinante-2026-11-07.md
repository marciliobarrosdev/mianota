# Visão geral (InfinityPay) + proteção da ficha do assinante

## 1. Textos da Visão geral
- A Visão geral do Master já não tem mais nenhuma menção a "Stripe" (o card "Assinaturas em trial" foi corrigido antes).
- Vou revisar de novo todos os textos visíveis da Visão geral e dos cards ligados a ela e trocar qualquer frase que ainda fale de "checkout Stripe" por "checkout InfinityPay".
- Integrações, configurações e dados não serão alterados. A tela de integrações e a de planos continuam com as opções de Stripe que já existem.

## 2. O que alterou a ficha do assinante
Causa encontrada no código:
- Quando um assinante que já tem conta passa de novo pela tela de checkout (por exemplo, para assinar outro plano), o sistema reaproveita a empresa que ele já tem. Até aí, tudo certo.
- O problema vem logo depois: o sistema copia os dados do formulário de cadastro guardado na conta (nome, CPF/CNPJ, telefone, endereço, foto) **por cima** da ficha. Isso apaga as correções feitas no Master, como "Maria do Socorro" voltando a ser "Finanças de Socorro".
- Nenhuma outra rotina automática muda o nome da empresa.

Correção:
- Os dados do formulário de cadastro só serão aplicados quando a empresa for **criada agora**. Uma ficha que já existe nunca será sobrescrita.
- Mesmo numa empresa nova, só serão preenchidos os campos que ainda estão vazios. Assim, nenhum valor que já está salvo é substituído.
- O mesmo vale para o nome e o telefone do responsável.
- Nenhum dado real atual será alterado nesta correção.

## Detalhes técnicos
- `create_checkout_company_atomic` devolve o `company_id` já existente quando há vínculo ativo. Por isso, `createCheckoutCompany` (em `src/lib/billing/checkout.functions.ts`) roda o update com `signup_profile` também em empresas antigas.
- Vou ler os vínculos do usuário antes da RPC (`hadCompany`) e pular o bloco `signup_profile` quando `hadCompany` for verdadeiro.
- Vou extrair a regra pura `fillOnlyEmpty(existing, incoming)` para `src/lib/billing/signup-profile-rules.ts` e usar no update de company/profiles.
- Testes: empresa existente não recebe atualização; campos já preenchidos são mantidos; campos vazios são preenchidos.
- Vou registrar em AGENTS.md a regra: signup_profile só preenche fichas novas e campos vazios.
