# Melhorias sugeridas para o MIAnota

Pontos levantados a partir do sistema atual. Escolha quais quer implementar (posso fazer todos, em ordem).

## 1. MIA mais rápida quando o provedor de IA falha (prioridade alta)
- Hoje, se o OpenRouter falhar, a pessoa pode esperar até ~50 s (25 s + 25 s da reserva).
- Reduzir a espera do primeiro provedor (~12 s) e adicionar pausa automática: após falhas seguidas, a MIA usa direto a reserva por alguns minutos.
- Registrar qual provedor respondeu cada mensagem, visível no Master.

## 2. Prévia de compartilhamento no WhatsApp (prioridade alta)
- A imagem atual tem ~790 KB; o WhatsApp costuma ignorar imagens acima de ~600 KB.
- Gerar versão visualmente igual com menos de 300 KB.

## 3. Dados legais pendentes (prioridade alta, depende de você)
- Política de cookies ainda sem razão social, CNPJ e e-mail do encarregado (DPO).

## 4. Organização de telas grandes (prioridade média)
- Dividir os maiores arquivos restantes (painel financeiro, movimentações, funções do Master) no mesmo padrão já usado em Notificações e Planos, com testes.

## 5. Monitoramento (prioridade média)
- Painel no Master com falhas recentes (pagamentos, WhatsApp, IA) e alerta por e-mail quando algo falhar repetidamente.

## 6. Leitura de PDF pela MIA (prioridade baixa)
- O modelo atual não lê PDF; hoje é convertido antes. Sugerir no catálogo um modelo com suporte nativo.

## Detalhes técnicos
- Item 1: `src/lib/ai/ai-request.server.ts` (timeout 25 s), circuit breaker com estado no banco, coluna de provedor no log de comandos.
- Item 2: recomprimir `public/og-mianota.png` (quantização/JPEG de alta qualidade), mantendo 1200×630 e a mesma URL.
- Item 4: `finance-dashboard.functions.ts` (888 linhas), `master.functions.ts` (1017), `finance-overview.tsx` (816), `transactions-view.tsx` (737).
