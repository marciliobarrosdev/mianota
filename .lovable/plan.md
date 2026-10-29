# Corrigir o formulário "Novo assinante"

## Problema (confirmado)
- A lista de planos do formulário só busca os planos "Basic" e "Pro" por nome fixo. Hoje existe também o plano ativo "Gratuito" (7 dias), que fica de fora. Qualquer plano novo criado em Master → Planos também ficaria de fora.
- O formulário não tem os dados de contato e endereço que o cadastro do assinante já aceita (WhatsApp, e-mail da empresa, endereço etc.).

## O que muda
1. **Todos os planos ativos aparecem**, ordenados como em Master → Planos. Cada cartão mostra o nome, o preço (ou "Grátis · X dias") e os limites principais (mensagens, usuários, créditos de IA).
2. **Plano Gratuito:** ao escolhê-lo, o campo "Dias de teste grátis" vira "Dias de acesso grátis", já vem com o limite de dias do plano e fica travado nesse valor. Planos pagos usam os dias de teste definidos no próprio plano.
3. **Campos novos** (todos opcionais, menos nome e e-mail):
   - WhatsApp do responsável (com máscara do Brasil)
   - Nome do responsável
   - Pessoa jurídica: nome fantasia, inscrição estadual, e-mail da empresa, site
   - Endereço: CEP, rua, número, complemento, bairro, cidade, estado
4. **Os dados são salvos** no cadastro do assinante e aparecem nos detalhes em Master → Assinantes.
5. Sem plano ativo cadastrado, aparece um aviso com um atalho para Master → Planos.

## Detalhes técnicos
- `listPlansBasic` (src/lib/master.functions.ts): tirar o `.in("slug", ["starter","pro"])`, devolver todos os planos com `ativo = true`, ordenados por `ordem` e depois preço, incluindo `is_free`, `free_days` e os limites.
- `createCompanyWithOwner`: aceitar e validar os novos campos (telefone convertido para o formato internacional por `src/lib/phone.ts`, e-mail por `normalizeEmail`, UF com 2 letras, CEP com 8 dígitos). Para plano gratuito, os dias vêm de `free_days` no servidor (o valor do navegador é ignorado), seguindo a regra de que cada conta usa o gratuito só uma vez. Gravar os campos em `company` depois de criar o assinante.
- `src/routes/master/novo-assinante.tsx`: novos campos organizados em seções (Responsável, Empresa, Endereço, Plano).
- Teste: quais planos aparecem (ativos sim, inativos não) e os dias usados no plano gratuito.
- Para valer em mianota.lovable.app, será preciso publicar.
