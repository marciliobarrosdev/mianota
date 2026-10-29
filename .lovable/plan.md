# Movimentações: correção do "Saldo do dia" + 4 novas funções

## Por que aparece R$ 3.023,10
O valor ao lado de "Hoje · 29 de out." soma só os lançamentos **de hoje**: R$ 3.200,00 de salário menos R$ 176,90 de saídas feitas hoje (Coca-Cola, Internet, Marmita, Mototáxi, Mercado...) = R$ 3.023,10. Os outros R$ 343,54 em saídas são de outros dias do mês. Os R$ 2.679,56 que você esperava são o saldo do **mês todo**, que já aparece no cartão "Saldo do período". A conta está certa, mas o nome confunde.

**Correção:** cada dia vai mostrar duas informações:
- "Resultado do dia: + R$ 3.023,10" (só o que entrou e saiu naquele dia)
- "Saldo até aqui: R$ 2.679,56" (soma do período até o fim daquele dia, que bate com o cartão)

## 1. Importar extrato bancário
- Botão "Importar extrato" aceita arquivos OFX e CSV (Nubank, Inter, Itaú, Bradesco, Caixa, BB e outros bancos que exportam esses formatos).
- Tela de revisão antes de salvar: data, descrição, valor, entrada/saída, categoria sugerida pela MIA (seguindo as regras que você ensinou a ela) e marcação de lançamentos repetidos (mesma data, valor e descrição) que já existem no app, para não importar duas vezes.
- Você escolhe a conta de destino, ajusta as linhas e confirma. Os lançamentos são criados como pagos, com origem "Importação", e podem ser desfeitos em lote.

## 2. Dividir um lançamento em categorias
- No menu do lançamento: "Dividir em categorias". Você reparte o valor em 2 ou mais partes (ex.: Mercado R$ 84,90 = Alimentação R$ 60,00 + Limpeza R$ 24,90).
- O app só deixa salvar quando a soma das partes é igual ao valor total. O lançamento original continua um só no extrato e mostra "Dividido".
- Orçamentos, filtro por categoria, gráfico, CSV/PDF e relatório mensal passam a contar cada parte na sua categoria.

## 3. Marcações (tags)
- Adicione tags livres a qualquer lançamento (ex.: #viagem, #trabalho), na edição, no "Novo lançamento" ou em vários selecionados de uma vez.
- Novo filtro por tag, tags visíveis na linha e incluídas no CSV/PDF.

## 4. Gráfico de despesas
- Painel recolhível acima da lista com: rosca de despesas por categoria (com divisões contadas na parte certa), barras de entradas e saídas por dia no período e comparação com o período anterior.
- Respeita os filtros ativos; clicar numa fatia filtra a lista por aquela categoria.

## Página demo
Vai receber os mesmos gráficos, tags e divisão com dados fictícios. A importação ali só mostra a tela de revisão, sem salvar nada.

## Detalhes técnicos
- Agrupamento por dia em `transactions-rules.ts`: `netCents` vira "Resultado do dia" e um novo `runningCents` é acumulado em ordem cronológica dentro do período (independe da ordenação da tela). Testes com os números de 29/10.
- Migração: `fin_lancamento_split` (lancamento_id, company_id, categoria_id, valor_cents) e `fin_lancamento.tags text[]` com índice GIN, com GRANT, RLS por `has_company_access` e um gatilho que valida soma = valor do lançamento.
- Parser OFX/CSV em código JS puro (`bank-statement-rules.ts`), detectando separador, formato de data BR/ISO e valores "1.234,56". Importação em lote por função de servidor autenticada, com `fonte: 'importacao'`, `metadata.import_batch` para desfazer e `metadata.fitid` para não repetir.
- Totais de categoria (gráfico, orçamentos, relatório PDF) usam as divisões quando existirem.
- Gráficos com recharts (já existe em `components/ui/chart`) e cores do tema.
- Testes: soma do dia/acumulado, parser OFX/CSV, detecção de repetidos, validação da soma das partes, agregação por categoria.
