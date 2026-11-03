# Auditoria de código morto (Opção B)

Objetivo: listar e remover com segurança o que não é mais usado, sem mudar nada que o usuário vê.

## Candidatos encontrados (nenhum outro arquivo os importa)

Componentes antigos (de versões anteriores do sistema, ex. agenda/atendimento):
- components/brand-asset-uploader, plan-usage-badge
- components/dashboard/: agent-status-card, kpi-card, message-timeline, mini-area-chart
- components/demo/: ai-studio, demo-pages
- components/landing/: cinematic-landing, feature-micro-visual, offer-proof-sections
- components/marcia/new-customer-dialog, components/master/implementation-step-card
- hooks/use-in-view-cycle

Lógica antiga:
- lib/agent-ai.functions, lib/api/example.functions, lib/business-hours, lib/demo-data
- lib/integration-readiness.functions, lib/marcia-booking.server, lib/marcia-command.functions
- lib/permissions, lib/setup-guide.functions, lib/team.functions

Peças de interface prontas não usadas (25, ex. accordion, carousel, sidebar, table): manter — são a biblioteca padrão e não pesam no site.

Falso positivo: router.tsx (usado pelo framework) — fica.

## Passos
1. Confirmar cada candidato: busca por nome, import dinâmico, uso em scripts/testes e em rotas; checar se alguma função de servidor é chamada pelo WhatsApp/cron.
2. Entregar relatório final (arquivo em Files) com: removível / manter / dúvida.
3. Remover em pequenos lotes (componentes, depois lógica), checando compilação e testes após cada lote.
4. Depois: varrer imports, variáveis e funções exportadas não usadas dentro dos arquivos que ficam (com ferramenta de análise, sem instalar no projeto).
5. Abrir o preview (Início, MIA, Movimentações, Planejamento, Master) para confirmar que nada mudou.

## Fora do escopo
Mover pastas ou renomear — fica para a etapa seguinte (Opção A).
