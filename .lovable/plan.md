# Página inicial: versão "obra de arte"

## O que muda

### 1. MIA sem cortes
- A foto da MIA é vertical, mas hoje é exibida dentro de círculos, e por isso ela aparece cortada.
- Ela passa a aparecer de corpo inteiro, sem fundo, numa moldura alta com brilho atrás.
- Nos lugares pequenos (topo, barra do celular, chat), só o rosto fica num círculo, centralizado no rosto e nunca cortado pela metade.

### 2. Abertura mais realista
- Um celular de verdade, com moldura, ilha no topo, hora, bateria e a tela do WhatsApp com fundo e balões iguais aos reais.
- A conversa animada mostra áudio com onda, foto de nota sendo lida e resposta com cartão de lançamento.
- A MIA aparece em pé ao lado do celular no computador. Cartões flutuantes ("+ R$ 5.200 Salário", "Conta de luz vence amanhã") reagem ao movimento do mouse, com profundidade.
- Fundo com aurora animada suave e o título entrando palavra por palavra.

### 3. Painel igual à "Visão do mês"
É uma réplica visual da tela /app/inicio, com valores de exemplo:
- atalhos rápidos (Nova despesa, Nova receita, Importar extrato, Planejamento, PDF do mês);
- 4 indicadores: Saldo do período, Entrou, Saiu e Sobra prevista, com números que sobem em contagem;
- gráfico de Evolução (Entrou, Saiu e Saldo acumulado) desenhado ao aparecer;
- Maiores categorias, num gráfico de rosca com lista;
- Últimas movimentações e Próximos 14 dias.

No computador, o painel aparece dentro de uma janela de navegador inclinada em 3D, que se endireita ao rolar. No celular, aparece dentro de um celular, com os cartões em 2 colunas.

### 4. Movimento e acabamento
- Animações fluidas ao rolar: entrada, parallax e cartões que inclinam ao toque ou ao passar o mouse.
- Números animados.
- Seção "Conheça a MIA" com a imagem de corpo inteiro e os recursos orbitando em volta.
- Tudo continua leve no celular e respeita quem prefere menos movimento.

## Detalhes técnicos
- Vou adicionar `motion` (Framer Motion), para scroll, parallax, tilt e entradas, e `@number-flow/react`, para os contadores. Os gráficos serão feitos com `recharts`, que já está instalado.
- Vou gerar uma versão recortada da MIA (PNG transparente, corpo inteiro, a partir de `marcia-avatar-640.png`) com edição de imagem, e criar um avatar de rosto com `object-position` ajustado.
- Novos componentes em `src/components/landing/`:
  - `landing-hero.tsx`
  - `landing-phone.tsx` (refeito)
  - `landing-dashboard.tsx`, com dados fixos de exemplo e o rótulo "Ilustração"
  - `landing-mia.tsx`
- `finance-landing.tsx` fica só fazendo a composição. As props, os planos e os links continuam iguais.
- Os gráficos com recharts serão carregados só no navegador (via `ClientOnly`/lazy), para não quebrar a renderização no servidor.
- Vou verificar no Playwright em 375px e 1280px, incluindo o painel e a MIA inteira.
