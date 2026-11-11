# Prévia de compartilhamento (OG Image) do MIAnota

## O que muda
Somente metadados de compartilhamento e o arquivo da imagem. Nenhuma mudança visual no site.

## Imagem
- A imagem enviada tem 1774×887 (proporção 2:1). Será gerada uma versão 1200×630 em PNG, redimensionada sem cortar nada (a MIA e o texto ficam inteiros; faixas mínimas nas bordas com a cor de fundo da própria imagem). O original fica preservado.
- Publicada em endereço público fixo: `https://mianota.lovable.app/og-mianota.png` (arquivo em `public/`, sem login).

## Metadados da página inicial (no HTML entregue pelo servidor, sem depender de JavaScript)
- title / og:title / twitter:title: "MIAnota | Sua Assistente Financeira Inteligente"
- description / og:description: texto informado
- twitter:description: "Organize suas finanças com Inteligência Artificial, diretamente pelo WhatsApp."
- og:type website, og:site_name MIAnota, og:locale pt_BR, og:url e canonical `https://mianota.lovable.app/`
- og:image (+ secure_url, width 1200, height 630, type image/png, alt) e twitter:image com a mesma URL; twitter:card summary_large_image

## Detalhes técnicos
- Tags ficam no `head()` de `src/routes/index.tsx` (rota folha), sobrescrevendo as do `__root` por name/property, sem duplicatas. `__root` mantém apenas padrões gerais (twitter:card raiz passa a summary_large_image; sem og:image na raiz).
- Validação: `curl` do HTML do servidor local conferindo cada tag única, e `curl -I` da imagem (200, image/png).

## Observação
A URL pública só mostrará a nova prévia após você publicar. WhatsApp/Facebook guardam prévias antigas; após publicar, dá para forçar atualização no depurador de compartilhamento do Facebook.
