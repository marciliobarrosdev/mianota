# Trocar a logo clara pela nova versão "logo1--mianota"

## O que muda
A logo com o ícone verde passa a ser a nova versão: ícone magenta e "MIAnota" em branco. A troca vale para os mesmos quatro lugares:
- Página inicial: menu do topo e rodapé.
- Login do assinante (/entrar), no computador e no celular.
- Login do Master (/superadmin), no computador e no celular.

Os tamanhos e posições ficam como estão hoje. As barras laterais continuam com a logo roxa.

## Detalhes técnicos
- Recortar a nova imagem, converter para WebP com 600px e enviar ao CDN como `mianota-logo-light-v2.webp`.
- Apontar `src/components/brand-wordmark.tsx` para o novo arquivo e excluir do CDN a versão verde antiga.
- Atualizar a memória "Variações da logo" (ícone magenta).
- Conferir no navegador a página inicial e os dois logins.
