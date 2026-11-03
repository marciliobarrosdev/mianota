# Refatoração Opção A — organizar src/lib por domínio

Objetivo: mesma aparência e comportamento; só organização. Cada fase termina com compilação limpa, 62+ testes passando e checagem das telas principais.

## Fase 1 — Mover os 93 arquivos de src/lib para pastas por domínio

```text
src/lib/
  finance/   finance-*, transactions-rules, bank-statement-rules, planner-rules,
             overview-rules, monthly-report*, notification-* , web-push, push.functions,
             onboarding*, settings*
  ai/        ai-*, lovable-ai*, audio-transcribe, assistant-profile*, marcia-chat-rules,
             marcia.ts, agent-ai
  whatsapp/  evolution*, central-finance-whatsapp, master-whatsapp*, purchase-onboarding*
  master/    master*.functions, master-access-cache, stripe-admin, integration-readiness,
             team, csat, work-order, security
  billing/   (já existe) + billing, checkout, infinitepay, stripe, credits, plan*, subscriber-*
  common/    money, phone, masks, timezone, secure-random, error-*, lovable-error-reporting,
             audit, config, tenant, brand*, integration(s)*, google*, remix-*
  auth/      (já existe)
  utils.ts   fica no lugar (usado pelas peças de interface padrão)
```

Como: um script único move os arquivos e reescreve todos os imports `@/lib/...` (~140 arquivos em src, tests, scripts). Sem arquivos "ponte" antigos. AGENTS.md e scripts de verificação recebem os novos caminhos.

## Fase 2 — Padronizar as 3 camadas
- Regras puras (`*-rules.ts`): conferir que nenhuma importa banco, servidor ou React; extrair cálculos que hoje estão dentro de componentes grandes (ex. planner-view, transactions-view, finance-overview) só quando já tiverem teste ou ganharem um.
- Dados/servidor (`*.functions.ts`, `*.server.ts`): nenhum componente importa `*.server.ts`; nenhum componente consulta o banco direto quando já existe função de servidor equivalente (listar casos e corrigir).
- Interface: componentes só interface e estado de tela.
- Entrega: lista dos pontos corrigidos e dos adiados.

## Fase 3 — Limpeza e nomes
1. Remover os 4 arquivos guardados (agent-ai, integration-readiness, team, brand-asset-uploader) se continuarem sem uso, e atualizar/aposentar os 9 scripts de verificação quebrados.
2. Renomear nomes internos de código "marcia/Marcia" para "mia/Mia" (arquivos, componentes, hooks, tipos, ex. MarciaChatController → MiaChatController, marcia-chat.tsx → mia-chat.tsx). Ficam como estão: tabelas/colunas do banco (`marcia_*`), endereço `/app/marcia` (vira só redirecionamento se for criado `/app/mia`? — não; mantido igual) e chaves salvas no navegador.
3. Varredura de imports e exports sem uso nos arquivos restantes.

## Verificação em cada fase
Compilação, testes automáticos, e abertura logada de Início, Falar com MIA, Movimentações, Planejamento, Configurações e Master/Planos.

## Riscos
- Webhooks e cron (WhatsApp, InfinitePay, push) só falham no site publicado se um import ficar errado: a compilação cobre isso, mas é preciso publicar após a refatoração e enviar uma mensagem de teste no WhatsApp.
