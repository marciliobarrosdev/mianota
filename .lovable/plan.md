# Plano: canal central único, onboarding pós-compra e "IA e créditos"

## 1. O que já existe (confirmado na leitura)

- **Canal central**: tabela `platform_support_channel` com uma única linha (`id = true`) e campo `provider` (texto). Mostra o provedor "atual", mas nada no banco impede que Evolution e Meta fiquem configurados e recebendo mensagens ao mesmo tempo. Os dois webhooks (`api/public/whatsapp-webhook.ts` e `support-whatsapp-webhook.ts`) aceitam eventos sem conferir qual canal está ativo.
- **Envio**: `master-whatsapp.functions.ts` já bloqueia texto livre na Meta fora da janela de 24h, mas ainda não existe envio por template. A Meta é chamada direto via `graph.facebook.com`, com as credenciais do proprietário guardadas criptografadas (`resolveIntegration("whatsapp_meta")`).
- **Pareamento**: `fin_whatsapp_pairing` (código + validade + data de uso) e `fin_whatsapp_identity` já existem. `central-finance-whatsapp.server.ts` reconhece um código numa mensagem recebida e vincula a identidade.
- **Cobrança**: Kiwify, Cakto e PerfectPay passam por `billing/webhook.ts` + `normalize.ts`; a Stripe tem rota própria. Os eventos são registrados em `billing_event_log`, com `event_key` único (já há idempotência por evento). A normalização captura **apenas o e-mail**: nome e telefone do comprador são descartados.
- **Créditos e trial**: `consume_ai_credit`, `refund_ai_credit`, `grant_company_trial`, `topup_plan_credits` e `credit_ledger` existem e não serão alterados.
- **Menu do Master**: não há área "IA e créditos" nem fila de onboarding.

## 2. O que falta

1. Garantir no banco que só um canal fique ativo, com troca auditada.
2. Capturar nome e telefone do comprador nos 4 provedores.
3. Uma fila de onboarding pós-compra com estados, idempotência e reenvio.
4. Envio por template da Meta (nome e idioma configuráveis).
5. Pareamento iniciado pela compra e primeira pergunta da IA.
6. Tela "IA e créditos" e configuração de IA própria (BYOK) desativada por padrão.
7. Testes de tudo isso.

## 3. Banco de dados (uma migração, sem apagar dados)

- **`platform_support_channel`**: adicionar `active_provider text check in ('evolution','meta') null`, `switched_at` e `switched_by`. Preencher com o `provider` atual quando o status estiver conectado. Como a tabela tem uma linha só, isso garante fisicamente um único canal ativo.
- **`platform_channel_switch_log`** (nova): de/para, quem trocou, diagnóstico (JSON sem segredos) e data. Somente superadmin pode ler.
- **RPC `switch_central_channel(_to text, _confirm text)`** (security definer, exige `is_super_admin()`): grava o diagnóstico, troca `active_provider` em uma única transação e registra no log. Bloqueia a troca se o destino não tiver passado no último teste (`platform_integration_status.test_ok`).
- **`platform_meta_template_config`**: nome do template de "compra aprovada", idioma e últimos status/data de verificação.
- **`purchase_onboarding`** (nova): `id`, `billing_event_id` único (idempotência), `company_id`, `provider_pagamento`, `buyer_name`, `buyer_phone_e164`, `buyer_email`, `channel_provider`, `status`, `status_detail`, `pairing_id`, `provider_message_id` único, `attempts`, `next_attempt_at`, `sent_at`, `delivered_at`, `read_at`, `failed_at`, `last_error`, `created_at`, `updated_at`.
  - Status possíveis: `awaiting_phone`, `awaiting_channel`, `awaiting_template`, `queued`, `sending`, `sent`, `delivered`, `read`, `failed`, `paired`, `cancelled`.
  - Um gatilho impede que um status recebido mais tarde rebaixe outro mais avançado (por exemplo, `sent` não sobrescreve `read`).
- **`purchase_onboarding_event`**: histórico de cada transição, para auditoria.
- **`whatsapp_status_inbox`**: status da Meta ou da Evolution que chegam antes de existir a linha de envio. Ficam pendentes e são reconciliados depois.
- **`ai_provider_config`** (uma linha): `mode in ('lovable','openai','anthropic')` com padrão `lovable`, `model`, `optimized boolean`, `tested_at`, `test_ok`. A chave BYOK fica em `platform_integration_secret` (já criptografada e sem acesso pelo app), nunca nesta tabela.
- **RLS e permissões**: todas as tabelas novas ficam fechadas para o público. Só o serviço tem acesso total; leitura apenas por superadmin, via `is_super_admin()`. Nenhuma tabela do assinante muda.

## 4. Servidor

- **`normalize.ts`** e o webhook da Stripe passam a extrair `buyerName` e `buyerPhone`:
  - Kiwify: `Customer.full_name` / `Customer.mobile`
  - Cakto: `customer.name` / `customer.phone`
  - PerfectPay: `customer.full_name` / `customer.phone_*`
  - Stripe: `customer_details.name` / `customer_details.phone`
- **Novo `src/lib/phone.ts` → `normalizeBrPhone`**: aceita DDI, DDD e o 9º dígito, devolve E.164 ou `null`. **`normalizeName`**: remove espaços extras, limita o tamanho e coloca maiúsculas nas iniciais.
- **`billing/webhook.ts` e `stripe-webhook.ts`**: depois de ativar a assinatura e conceder os créditos (sem mudar essa ordem), chamam `enqueuePurchaseOnboarding(eventId)`. Essa chamada nunca derruba a compra: qualquer erro vira status `failed` ou `awaiting_*` na fila.
- **Novo `src/lib/purchase-onboarding.server.ts`**:
  - `enqueue`: cria a linha com `on conflict (billing_event_id) do nothing`.
  - `process(id, {dryRun})`: reserva a linha (`sending`), lê `active_provider` e:
    - sem telefone → `awaiting_phone`;
    - sem canal ativo ou canal não conectado → `awaiting_channel`;
    - gera o pareamento (código de 6 dígitos com `secure-random.server.ts`, validade de 72h, vinculado ao `company_id` e ao dono);
    - **Evolution**: texto livre "Compra aprovada… responda com o código X para ativar sua MárcIA";
    - **Meta**: template configurado, com o código como parâmetro; sem template configurado ou aprovado → `awaiting_template`;
    - grava `provider_message_id`, `sent` e o evento, e reconcilia o inbox de status.
  - Em **dry-run**, monta o envio completo e grava o histórico, mas nada é enviado ao WhatsApp e o status final não muda.
  - Recuperação: a cada webhook de WhatsApp recebido, processa até 5 linhas em `queued` ou `failed` com `next_attempt_at` vencido (rodízio justo). O Master também tem o botão "Processar fila".
- **`master-whatsapp.server.ts`**: novas funções `sendMetaTemplate(number, name, lang, params)` e `listMetaTemplates()` (para mostrar se o template está aprovado). `updateMetaDeliveryStatus` também atualiza `purchase_onboarding`.
- **Webhooks de WhatsApp**: ignoram e respondem 200 aos eventos do provedor inativo, com um log curto sem conteúdo da mensagem. Na primeira resposta com código válido, `central-finance-whatsapp.server.ts`:
  - marca o pareamento como usado;
  - cria `fin_whatsapp_identity` (só se o telefone não estiver ativo em outra conta);
  - muda a fila para `paired`;
  - responde com a primeira pergunta útil ("Qual sua renda mensal aproximada…?").
  - Uma resposta sem código não cria vínculo.
- **Novo `master-onboarding.functions.ts`** (exige superadmin): listar com filtros, informar ou corrigir o telefone (que volta para `queued`), reenviar (gera novo pareamento e invalida o anterior; bloqueado se já estiver `paired`), cancelar e simular em dry-run.
- **Novo `ai-config.functions.ts`**:
  - ler a configuração;
  - salvar modo e modelo;
  - salvar a chave BYOK (só grava; a leitura devolve apenas "configurada: sim/não" e os 4 últimos caracteres);
  - testar (chamada mínima ao provedor escolhido);
  - métricas reais vindas do `credit_ledger`: consumos e reembolsos por período, por assinante e o total.
  - `lovable-ai.server.ts` passa a escolher o provedor por `ai_provider_config`, com fallback para a Lovable AI.

## 5. Telas (Master)

- **WhatsApp QR Code / API oficial Meta**: um cartão no topo mostra "Canal ativo: X". Na página do canal inativo aparece "Inativo — ativar este canal desativa o outro", com um diálogo que mostra o diagnóstico e pede para digitar ATIVAR. A página da Meta ganha a seção "Template de compra aprovada" (nome, idioma, status lido da Meta).
- **Novo menu "Onboarding pós-compra"** (`/master/onboarding`): tabela no computador e cartões no celular, filtros por status, contadores por estado e linha do tempo de eventos. Ações: corrigir telefone, reenviar, simular e cancelar.
- **Novo menu "IA e créditos"** (`/master/ia-creditos`), com três blocos didáticos:
  1. **Créditos dos assinantes**: o que é 1 crédito, saldo por assinante, consumo e reembolsos no período, e links para Planos (créditos por plano e dias de trial continuam configuráveis lá).
  2. **Seu custo de IA**: explica que a cobrança é na Lovable (Cloud → Usage) e que o app não lê esse saldo. Mostra apenas o que o app consegue contar: chamadas e falhas.
  3. **Provedor**: Lovable AI recomendado (ativo), mais OpenAI ou Anthropic como opção futura, só um de cada vez. Inclui seleção de modelo, modo otimizado, orientação de custo/qualidade e botão Testar. Nenhuma chave é pedida neste trabalho.
- O checklist "Comece aqui" ganha os passos "Escolha o canal central", "Template de compra aprovada (só Meta)" e "Revise IA e créditos".

## 6. Testes (`tests/` + `scripts/verify-*.mjs`)

- `phone-normalize.test.ts`: números de celular e fixo, com e sem DDI, inválidos; normalização de nomes.
- `billing-normalize.test.ts`: payloads de exemplo dos 4 provedores devolvem nome, telefone e e-mail.
- `purchase-onboarding.test.ts` (com banco simulado):
  - idempotência: o mesmo evento repetido 2 vezes gera 1 linha e 1 envio;
  - compra sem telefone → `awaiting_phone`, e a ativação acontece normalmente;
  - Evolution → texto livre;
  - Meta sem template → `awaiting_template`; Meta com template → payload de template;
  - status fora de ordem não rebaixa;
  - dry-run não chama nenhum fetch.
- `pairing.test.ts`: código expirado, usado, de outra conta ou telefone já vinculado em outra conta → sem vínculo.
- `verify-central-channel.mjs`: a migração contém a coluna única com check, a RPC exige superadmin e os webhooks ignoram o provedor inativo.
- `verify-credits-unchanged.mjs`: as funções de crédito e trial não foram alteradas e o fluxo de cobrança continua chamando os mesmos RPCs.
- Verificação de RLS: consultar `pg_policies` das tabelas novas (só superadmin).
- Ao final: typecheck, `bun test ./tests/`, os scripts de verificação existentes e o build.

## 7. Critérios de aceite

- Não é possível ter os dois canais ativos, nem pela tela nem por chamada direta.
- Uma compra aprovada sem telefone ativa a assinatura e aparece na fila como "Aguardando telefone".
- Reenviar o mesmo webhook não gera segunda mensagem.
- Com a Meta ativa e sem template, a fila mostra "Aguardando template" com o motivo claro.
- Uma simulação dry-run mostra a mensagem exata que seria enviada.
- A tela "IA e créditos" não mostra nenhum valor inventado e nunca exibe uma chave.

## 8. O que só será provado com WhatsApp real

- Entrega real pelo Evolution depois de escanear o QR.
- Aprovação do template pela Meta (até 48h) e o envio por template.
- Status entregue/lido vindos dos provedores.
- O assinante responder com o código e receber a primeira pergunta.
- Webhooks reais de Kiwify, Cakto, PerfectPay e Stripe trazendo telefone (depende de o checkout pedir esse campo).
- Teste do BYOK (exige uma chave que não será pedida agora).

## Detalhes técnicos

- Arquivos novos: `src/lib/purchase-onboarding.server.ts`, `src/lib/master-onboarding.functions.ts`, `src/lib/ai-config.functions.ts`, `src/routes/master/onboarding.tsx`, `src/routes/master/ia-creditos.tsx` e os testes e scripts listados acima.
- Arquivos alterados: `billing/normalize.ts`, `api/public/billing/webhook.ts`, `api/public/stripe-webhook.ts`, `api/public/whatsapp-webhook.ts`, `api/public/support-whatsapp-webhook.ts`, `master-whatsapp.server.ts` e `.functions.ts`, `central-finance-whatsapp.server.ts`, `lovable-ai.server.ts`, `lib/phone.ts`, `components/master/whatsapp-setup.tsx`, `routes/master.tsx` (menu), checklist e `AGENTS.md` (uma regra sobre canal único e fila de onboarding).
- A Meta continua sendo chamada com as credenciais próprias do dono (modelo atual do clone), não pelo conector da Lovable, para preservar a arquitetura de clones.
- Nenhum segredo aparece em log, resposta ou tela. Os diagnósticos de troca de canal guardam apenas status e códigos de erro.
