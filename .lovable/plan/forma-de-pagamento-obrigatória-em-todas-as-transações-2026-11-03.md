# Forma de pagamento obrigatória em todas as transações

## Objetivo
Toda entrada e saída precisa ter "Forma de pagamento" ao ser registrada: no formulário do sistema, no chat da MIA ou pela MIA no WhatsApp.

Opções (nesta ordem): PIX, Cartão de Crédito, Dinheiro, Transferência, Boleto, Salário, Outro.

## O que muda para o usuário
- **Formulários (novo lançamento, editar, duplicar, importar extrato, contas do planejamento):** o campo "Forma de pagamento" aparece com as 7 opções e é obrigatório. Sem ele, o botão Salvar mostra "Informe a forma de pagamento".
- **Chat da MIA (sistema):** se a mensagem não disser a forma (ex.: "gastei 50 no mercado"), a MIA pergunta "Como foi pago? PIX, Cartão de Crédito, Dinheiro, Transferência, Boleto, Salário ou Outro?", com botões de resposta rápida. A MIA só salva depois de saber a forma. Se a forma for clara ("paguei no pix", "no crédito", "recebi o salário"), ela preenche sozinha e mostra isso na confirmação.
- **MIA no WhatsApp:** faz a mesma pergunta por texto e aceita respostas como "pix", "1", "cartão", "dinheiro". Isso vale também para áudio, foto de recibo e PDF.
- **Extrato, Visão do mês, Planejamento e PDF:** cada lançamento mostra a forma de pagamento, e o extrato ganha um filtro por forma.
- **Lançamentos antigos sem forma:** continuam aparecendo como "Não informado". Na edição, a forma passa a ser obrigatória.

## Detalhes técnicos
- Banco: adicionar o valor `salario` ao enum `fin_forma`, que hoje tem pix, boleto, cartao, dinheiro, transferencia e outro. O valor `cartao` passa a ter o rótulo "Cartão de Crédito". A coluna continua aceitando vazio para manter o histórico, e a obrigatoriedade fica no servidor.
- Criar `src/lib/finance/payment-method-rules.ts` com lista e rótulos, `parsePaymentMethod(text)` (sinônimos: pix, crédito/cartão, espécie/dinheiro, ted/doc/transferência, boleto, salário/holerite, outro; aceita também números de 1 a 7) e `requirePaymentMethod`. Testes Vitest cobrem cada opção e o caso de forma ausente.
- Servidor: `finance-dashboard.functions.ts` (criar lançamento/conta), `finance-transactions.functions.ts` (editar/duplicar) e a importação passam a rejeitar lançamentos sem forma válida.
- MIA: `finance-command.functions.ts` e `finance-whatsapp.server.ts` deixam o rascunho pendente e perguntam a forma quando `paymentMethod` estiver vazio. A resposta seguinte completa o rascunho, salva sem duplicar e só então confirma. O prompt central (`ai-prompt.ts`/`mia.ts`) é atualizado para extrair a forma e nunca inventá-la.
- UI: um Select comum em `src/components/finance/*`, mais o filtro e os rótulos no extrato e no PDF. A demo é atualizada com formas de pagamento fictícias.
