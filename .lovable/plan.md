# Melhorias para "Falar com MIA" (/app/marcia)

## Como está hoje
- Chat com texto, ditado pelo navegador, anexo de foto/PDF e confirmação antes de registrar.
- 4 sugestões fixas, cabeçalho simples, sem ligação com o resto do app (saldo, contas, orçamento).
- Não mostra o que a MIA já registrou na conversa nem permite desfazer.

## 1. Visual
- Cabeçalho com nome/estilo da MIA (vindo de "Personalidade e regras"), status do canal WhatsApp e atalho para configurar.
- Painel lateral (desktop) / gaveta (celular) "Resumo do mês": saldo, gastos, próximas contas, orçamento mais estourado.
- Cartões de confirmação mais claros: valor em destaque, categoria com ícone, conta/cartão, data, botões Confirmar / Editar / Cancelar.
- Separadores por dia, horário nas mensagens, estado "digitando", rolagem para a última mensagem com botão "voltar ao fim".
- Cores do tema (sem cores fixas), modo escuro, composer fixo e confortável no celular.

## 2. Novas funcionalidades
- Sugestões inteligentes que mudam conforme o contexto (conta vencendo hoje, orçamento perto do limite, fim do mês).
- Editar antes de confirmar: ajustar valor, categoria, data ou conta direto no cartão.
- Desfazer o último registro (por alguns minutos) e link "Ver no extrato".
- Gravação de áudio real (não só ditado do navegador), usando a mesma transcrição do WhatsApp — funciona em qualquer celular.
- Vários lançamentos numa só mensagem ("mercado 80 e uber 25") com confirmação em lote.
- Buscar no histórico da conversa e "Limpar conversa".
- Respostas com mini-gráficos/tabelas para perguntas como "quanto gastei com mercado?".

## 3. Integrações com outras páginas e dados
- Conversa unificada: mostrar também o que foi falado com a MIA pelo WhatsApp (com selo do canal).
- Ações rápidas que abrem a página certa: Extrato, Planejamento, Orçamentos, Cartões, Notificações.
- Usar regras de categoria, metas e limites da "Personalidade e regras" nas respostas e sugestões.
- Avisos (contas a vencer, orçamento) com botão "Perguntar à MIA" que abre o chat já com a pergunta.
- Mostrar créditos de IA restantes e aviso amigável quando acabarem, com link para "Conta e Plano".
- Demonstração (/demo) recebe o mesmo visual novo com dados fictícios.

## Detalhes técnicos
- Manter `MarciaChatController` como contrato único; novos campos opcionais (contextSummary, undo, editPending, channel por mensagem) — demo implementa versão roteirizada.
- Resumo lateral reaproveita funções de `finance-overview`/`finance-period.ts`.
- Áudio: MediaRecorder → server function que chama `audio-transcribe.server.ts`.
- Desfazer: server function que remove o lançamento criado pela confirmação, validando dono e janela de tempo; teste de regra para a janela.
- Histórico WhatsApp: ler mensagens do mesmo tenant com marcação de canal (somente leitura).

## Sugestão de ordem
1. Visual + cartão editável + desfazer. 2. Resumo do mês e sugestões por contexto. 3. Áudio gravado e lançamentos múltiplos. 4. Conversa unificada com WhatsApp e atalhos dos avisos.
