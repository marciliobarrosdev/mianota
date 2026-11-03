# Melhorias em Assinantes e Assinaturas (Master)

## Como estão hoje
- **Assinantes**: lista com busca e botões por linha (suspender, dar trial, redefinir senha, dar créditos, detalhes, entrar como). Linhas com muitos botões soltos, sem filtros e sem números no topo.
- **Assinaturas**: cards de totais (trial, ativas, inadimplentes), filtro por status, tabela e atalhos para Planos/Pagamentos. Cores das etiquetas fixas, fora do tema.

## 1. Assinantes (/master/assinantes)
- **Resumo no topo**: total, ativos, em trial, trial vencendo em 3 dias, suspensos, pedidos de exclusão pendentes.
- **Filtros**: status (ativo/trial/gratuito/suspenso/vencido), plano, WhatsApp vinculado ou não, data de cadastro; ordenar por nome, cadastro, vencimento.
- **Linha mais limpa**: nome, e-mail, plano, status, dias restantes, créditos, WhatsApp; ações agrupadas em menu "…" (fica só "Entrar como" à vista).
- **Ficha do assinante em abas**: Dados | Plano e pagamentos (histórico de cobranças InfinitePay) | Uso (lançamentos no mês, créditos de IA gastos, último acesso) | Canais (WhatsApp, avisos no celular) | Pedido de exclusão.
- **Novas ações**: trocar plano, estender vencimento, reenviar mensagem de boas-vindas no WhatsApp, abrir conversa em Conversas, copiar link de pagamento do plano.
- **Exportar CSV** da lista filtrada e ações em lote (dar créditos, estender trial).

## 2. Assinaturas (/master/assinaturas)
- **Números de receita**: receita mensal (MRR), receita do mês recebida, novos pagantes, cancelamentos, conversão trial → pago.
- **Gráfico** de receita e assinaturas ativas nos últimos 6 meses.
- **Vencimentos**: lista "vence em 7 dias" e "venceu sem pagar" (InfinitePay não renova sozinho), com botão para enviar lembrete por WhatsApp com o link do plano.
- **Filtros extras**: plano, forma de pagamento (InfinitePay/Stripe), período; incluir status Gratuito.
- **Detalhe da assinatura**: histórico de pagamentos e eventos, link para a ficha do assinante.
- **Exportar CSV**; etiquetas de status com cores do tema (modo escuro correto).

## Ligações com outras páginas
- Assinatura → ficha do Assinante → Conversas / Planos / Pagamentos.
- Painel do Master e Comece aqui mostram alerta de vencidos/inadimplentes com link para o filtro certo.

## Detalhes técnicos
- Regras puras novas em `src/lib/master/subscriber-rules.ts` (status efetivo, dias restantes, MRR, conversão) com testes em `tests/`.
- Server functions novas em `src/lib/master/master.functions.ts` protegidas por super admin: métricas, histórico de eventos de cobrança, troca de plano/vencimento, lembrete WhatsApp via canal central ativo.
- Sem mudanças de tabela previstas; dados vêm de company, subscription, plan, eventos de cobrança, créditos e identidades WhatsApp.
- Tokens de cor semânticos para status em `src/styles.css`.

## Ordem sugerida
1. Visual + filtros + resumo (ambas as páginas).
2. Ficha em abas e novas ações.
3. Receita, gráfico, vencimentos e lembretes.
4. CSV e ações em lote.
