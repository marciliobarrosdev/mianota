# Nova página inicial do MIAnota (mobile-first)

## Objetivo
Refazer todo o visual da página inicial para apresentar o MIAnota e a MIA de um jeito moderno, com movimento e efeitos. A página será pensada primeiro para o celular e depois ampliada para o computador. Os textos reais, os planos com os preços que vêm do Master e os botões de cadastro continuam funcionando do mesmo jeito.

## Direção visual
- Fundo escuro "noite violeta" com brilhos suaves em degradê, nas cores da marca: roxo #7c3aed, magenta e um toque de verde-limão para os valores positivos.
- Cartões com efeito de vidro e bordas iluminadas.
- Títulos grandes, numa fonte de personalidade (Sora para títulos, Manrope para textos). Nada de fontes genéricas.
- A MIA como personagem central: avatar com aura animada, balões de conversa no estilo WhatsApp sendo "digitados" e números aparecendo em contagem.

## Nova estrutura (de cima para baixo)
1. **Topo fixo**: logo e botão "Começar". No celular, um menu que abre de baixo para cima.
2. **Abertura**: frase de impacto, slogan "Sua assistente financeira na palma da mão." e um celular animado mostrando a MIA registrando um gasto por áudio e respondendo com o saldo.
3. **Faixa de números/selos**: WhatsApp, áudio, PDF, foto e relatório, rolando em loop.
4. **Como funciona**: 3 passos em cartões que vão aparecendo ao rolar a página (Fale → MIA organiza → Você decide).
5. **Conheça a MIA**: o que ela entende (texto, áudio, foto de nota, PDF) em cartões com ícones animados.
6. **Painel por dentro**: mini painel com Saldo, Entrou, Saiu e Sobra prevista, com gráfico animado. É uma ilustração, sem dados de clientes.
7. **Recursos**: grade em blocos de tamanhos variados (planejamento, lembretes, relatório mensal, notificações).
8. **Segurança e controle**: cartões de confiança.
9. **Planos**: Grátis, Basic e Pro com os valores reais. O plano do meio fica em destaque. No celular, os cartões ficam um abaixo do outro, centralizados.
10. **Perguntas frequentes**: lista que abre e fecha.
11. **Chamada final e rodapé**.

## Mobile-first
- Botões grandes, fáceis de tocar com o polegar.
- Barra fixa "Começar grátis" no rodapé do celular.
- Seções curtas e bem espaçadas.
- Animações leves, que respeitam quem prefere menos movimento.
- No computador: layouts em duas colunas, celular animado ao lado do título e efeitos que acompanham o mouse.

## Detalhes técnicos
- Vou reescrever `src/components/landing/finance-landing.tsx` e dividir em subcomponentes dentro de `src/components/landing/`. A rota, o loader de planos e as props continuam iguais.
- As cores vão virar tokens em `src/styles.css` (landing-*, gradientes, sombras). Vou remover os hex fixos espalhados no código.
- As fontes serão carregadas via `<link>` no `__root.tsx`.
- Animações com CSS e IntersectionObserver (revelar ao rolar, contadores, digitação), sem nenhuma biblioteca pesada. Vou incluir `prefers-reduced-motion`.
- Os links dos planos continuam apontando para `/entrar?modo=signup&plano=<slug>`. Os estados de "sem planos" ou "indisponível" ficam como estão.
- Vou verificar no Playwright em 375px e 1280px.
