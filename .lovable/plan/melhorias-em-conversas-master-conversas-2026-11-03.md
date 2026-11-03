# Melhorias em Conversas (/master/conversas)

## 1. Rolagem dentro da conversa (pedido principal)
- A caixa de conversas passa a ter altura fixa, do tamanho da tela. As mensagens rolam por dentro, e a página fica parada.
- A lista de conversas à esquerda também ganha rolagem própria.
- O campo de digitar fica sempre visível embaixo.
- Botão flutuante "Novas mensagens ↓" quando você subiu para ler mensagens antigas e chega uma nova.
- Separadores de dia ("Hoje", "Ontem", "02/11") entre as mensagens.

## 2. Assinante na conversa
- A foto, o nome e o e-mail do assinante aparecem na lista e no topo da conversa, iguais às outras telas.
- Painel lateral recolhível com plano, status, dias restantes, créditos e últimos lançamentos, mais atalhos "Abrir ficha", "Entrar como assinante" e "Ver ativação pós-compra".

## 3. Atendimento mais rápido
- Respostas prontas: frases salvas que você insere com um clique, como "Seu pagamento foi confirmado" ou o link do plano.
- Enviar o link de checkout do plano (InfinitePay) direto pela conversa.
- Atalhos: Enter envia e Shift+Enter quebra a linha.
- Indicador do canal usado (QR Code ou Meta) e aviso quando a janela de 24h da Meta fechou.

## 4. Organização
- Filtros extras: por plano e por "aguardando minha resposta".
- Busca também dentro do texto das mensagens.
- Atualização automática a cada 15 segundos, com contador de não lidas no menu do Master.
- Exportar a conversa em CSV.

## Ordem sugerida
Primeiro o item 1 e a foto/nome/e-mail do item 2. Depois o painel lateral, as respostas prontas e o link de checkout. Por fim, os filtros e a atualização automática.

## Detalhes técnicos
- Section: `h-[calc(100dvh-<header>)]` com `min-h-0` nas colunas; lista e mensagens com `overflow-y-auto`; composer `shrink-0`.
- Regras puras de agrupamento por dia e de "perto do fim" em `support-inbox-rules.ts` com teste.
- Foto: reutilizar `SubscriberAvatar` e `company.logo_url`; os dados do painel vêm das funções do Master que já existem.
- As respostas prontas ficam em um campo de configuração do Master e não criam uma tabela nova.
