# Otimizações da página inicial do MIAnota

Sugestões por seção. Os preços, planos e as imagens da MIA continuam os mesmos. Os textos só mudam onde estiver indicado.

## 1. Topo (Hero)
- Título com destaque animado nas palavras-chave ("áudio", "foto", "texto" alternando).
- Prova social logo abaixo dos botões: "Responde em segundos · Funciona no WhatsApp · 7 dias grátis".
- Fundo com brilho que acompanha o mouse no computador. No celular, o fundo fica parado, para não pesar.
- Imagem da MIA carregada primeiro, para aparecer mais rápido.

## 2. Faixa rolante
- Velocidade suave, pausa quando o mouse passa por cima e ícones nos itens.

## 3. Como funciona (3 passos)
- Uma linha do tempo que vai se preenchendo conforme a página desce, ligando os 3 passos.
- Cada passo com uma pequena animação (microfone, câmera, gráfico).

## 4. Conheça a MIA
- Cartões que entram em sequência e um brilho sutil que segue o mouse.
- Uma mini prévia de conversa ao tocar em cada recurso.

## 5. Por dentro do painel
- Os números contam quando a seção aparece na tela.
- Abas "Mês / Categorias / Contas" para o visitante explorar.

## 6. Recursos
- Grade em mosaico com cartões de tamanhos diferentes, ícones animados e borda luminosa.

## 7. Planos
- Selo "Mais escolhido" no Basic, com brilho na borda.
- Lista comparativa que abre e fecha no celular.
- Botão do plano fixo na parte de baixo da tela quando a seção estiver visível no celular.

## 8. Perguntas frequentes
- Abrir e fechar mais suave, com um ícone que gira e um campo de busca rápida nas perguntas.

## 9. Chamada final (degradê + MIA)
- Brilho animado no degradê, botão com efeito de pulso e a MIA "respirando" (leve flutuação).

## 10. Geral (velocidade e celular)
- Seções mais pesadas carregadas só quando estão perto de aparecer na tela.
- Imagens otimizadas em formato mais leve.
- Respeito à opção de "reduzir movimento" do aparelho.
- Barra de chamada fixa no celular com o botão "Começar grátis".
- Barra de progresso de leitura no topo.
- Menu que destaca a seção atual.

## Detalhes técnicos
- Animações com `motion` (já instalado); números com `@number-flow/react`.
- Seções abaixo da dobra com `React.lazy` + IntersectionObserver.
- Imagens em WebP com `loading="lazy"`, exceto a do topo, que é carregada primeiro.
- Arquivos: `finance-landing.tsx`, `landing-hero.tsx`, `landing-mia.tsx`, `landing-dashboard.tsx` e `styles.css`.
- As regras atuais da conversa no WhatsApp continuam iguais: só animação local, um único temporizador e pausa fora da tela.
