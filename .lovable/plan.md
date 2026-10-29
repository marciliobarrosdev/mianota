# Melhorias da página "Personalidade e regras" (/app/agente)

## O que encontrei hoje
- A página salva nome preferido, estilo (Direta/Didática/Motivadora), % de alerta de orçamento, resumo semanal, insights proativos e "confirmar antes de salvar".
- **Nenhuma dessas escolhas é usada pela MIA hoje.** As respostas no chat e no WhatsApp não leem o perfil, o alerta de orçamento usa o limite da própria categoria e o resumo semanal não é enviado.
- O visual usa cores fixas (roxo e branco), que não acompanham a marca nem o modo escuro, e o exemplo de resposta nunca muda.

## Parte 1 — Fazer as escolhas valerem de verdade (prioridade)
1. A MIA passa a chamar a pessoa pelo nome escolhido e a responder no estilo escolhido, no chat do app, na demonstração e no WhatsApp.
2. O "% de alerta" vira o padrão dos avisos de orçamento. Se uma categoria tiver um limite próprio, vale o da categoria.
3. "Resumo semanal" envia toda segunda-feira um aviso com o resumo da semana (gastos, maiores categorias, contas da próxima semana), pelo app, celular e WhatsApp, respeitando as preferências de avisos.
4. "Insights proativos" liga ou desliga os avisos de aumento de gasto e de risco.
5. "Confirmar antes de salvar" continua travado como ligado, com uma explicação clara do motivo.

## Parte 2 — Novas regras e personalidade
- **Objetivo principal** (controlar gastos, quitar dívidas, juntar dinheiro, investir): muda o foco das dicas e se liga às Metas.
- **Regras personalizadas**: até 10 frases curtas, como "Mercado sempre na categoria Alimentação" ou "Não me mande dica de investimento".
- **Categorias automáticas**: palavra ou loja leva sempre a uma categoria. Isso usa as categorias existentes.
- **Tamanho das respostas** (curta ou detalhada) e **uso de emojis** (sim ou não).
- **Limite de gasto único**: avisar quando um único gasto passar de um valor (R$).
- **Horário de silêncio da MIA no WhatsApp**: usa as preferências de avisos que já existem.

## Parte 3 — Integrações com outras páginas
- Atalhos para Orçamento, Metas, Categorias, Notificações (preferências) e a conexão do WhatsApp.
- Cartão "O que a MIA já sabe sobre você": número de lançamentos, categorias mais usadas e celular conectado.
- O botão "Testar a MIA" abre o chat com uma pergunta de exemplo no estilo escolhido.
- A tela Configurações mostra o mesmo objetivo principal, para os dados ficarem sempre iguais.

## Parte 4 — Visual
- Trocar as cores fixas pelas cores do sistema (marca e modo escuro).
- Usar abas ou seções: Conversa, Regras, Alertas, Integrações.
- Prévia ao vivo: o exemplo de resposta muda conforme o estilo, o nome, o tamanho e os emojis escolhidos.
- Mostrar "alterações não salvas" e salvar com a barra fixa no rodapé no celular.
- Usar o seletor e o interruptor padrão (com melhor acessibilidade), e trocar o carregamento vazio por blocos de espera.
- Ajustar o título da aba para "Personalidade e regras".

## Detalhes técnicos
- Manter `company.finance_profile` (jsonb) e ampliar o tipo com: `response_length`, `use_emojis`, `custom_rules[]`, `large_expense_cents` e `category_rules[]` (palavra para `fin_categoria.id`). Não é preciso mudar a tabela. As regras puras ficam em `src/lib/assistant-profile-rules.ts` (normalização, limites e montagem de um trecho do prompt), com testes.
- Ler o perfil no ponto único de montagem do prompt (chat do app e `finance-whatsapp.server.ts`) e acrescentar o trecho do prompt. As regras do usuário entram como preferências e nunca substituem as regras de segurança.
- `notification-jobs.server.ts`: alerta de orçamento usa `alerta_percentual ?? alert_budget_percent`. Novo trabalho `weekly_summary`, que não se repete na mesma semana. Os insights ficam condicionados a `proactive_insights`. O alerta de gasto grande entra ao criar um lançamento.
- Salvar por uma função no servidor com validação, em vez de atualizar direto pelo navegador, e só para owner ou admin.
- Atualizar a demonstração (`finance-demo-data`) para mostrar o mesmo comportamento.

## Pergunta
Implemento tudo em sequência (1 → 4) ou só as Partes 1 e 4 primeiro?
