# Logo "logo1-mianota" na página inicial e nas páginas de login

## Onde muda
- **Página inicial, menu do topo:** o quadrado com "M" + o texto "MIAnota" dão lugar à logo completa (ícone verde + "MIAnota" em branco).
- **Página inicial, rodapé:** mesma troca.
- **Login do assinante (/entrar):** a logo atual + o nome dão lugar à nova logo, no computador e no celular. A frase "Sua assistente financeira na palma da mão." continua abaixo.
- **Login do Master (/superadmin):** hoje essa página não mostra logo. A nova logo entra no topo, ao lado de "voltar ao site", no computador e no celular. O escudo verde do quadro de login continua igual.

## O que não muda
- As barras laterais do Master e do assinante continuam com a logo roxa (logo2).
- Favicon e ícones do app ficam iguais.

## Observação
A logo tem letras brancas, por isso ela só aparece bem em fundo escuro. As quatro páginas já usam o fundo violeta escuro.

## Detalhes técnicos
- Recortar as bordas vazias, converter para WebP com 600px de largura e enviar ao CDN como `mianota-logo-light.webp`.
- Novo componente `src/components/brand-wordmark.tsx` (altura configurável), usado em `finance-landing.tsx` (topo e rodapé), `entrar.tsx` (computador e celular) e `superadmin.tsx`.
- A logo enviada pelo dono em Master, se houver, continua tendo prioridade na página inicial (mesma regra de hoje).
- Salvar na memória: logo1 nas páginas públicas e de login, logo2 nas barras laterais.
- Conferir no navegador: página inicial, /entrar e /superadmin, no computador e no celular.
