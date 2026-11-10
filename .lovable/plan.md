# Nova logo nas barras laterais (Master e Assinante)

## O que muda
- **Barra lateral aberta:** no lugar do ícone redondo + "Master / MIAnota · admin" (Master) e da marca atual (Assinante), aparece a logo completa **logo2-mianota** (ícone + "MIAnota").
- **Barra lateral recolhida:** aparece só o ícone **ícone-sidebar-recolhida**.
- **Botão de recolher/abrir:** hoje as duas barras laterais não recolhem. Vou adicionar um botão para recolher (fica estreita, mostrando só os ícones do menu) e abrir de novo. A escolha fica lembrada no navegador.
- **Modo escuro:** a logo tem letras roxo-escuras; no tema escuro ela ganha um fundo claro arredondado para continuar legível.

## Regra
- Essa logo e esse ícone aparecem **somente** nas barras laterais do Master e do Assinante.
- Topo no celular, página inicial, /entrar, /superadmin, favicon e ícones do app **não mudam** (aguardando a outra variação que você vai enviar).
- A regra fica salva na memória do projeto.

## Detalhes técnicos
- Subir as duas imagens com lovable-assets (logo convertida para WebP otimizado ~600px de largura; ícone para 128px).
- Novo componente `src/components/sidebar-brand.tsx` (`collapsed` prop) usado em `src/routes/master.tsx` (aside) e `src/components/app-shell.tsx` (aside desktop). `BrandLogo` continua para os demais locais.
- Estado recolhido via hook `useSidebarCollapsed(key)` com localStorage lido em useEffect (sem erro de hidratação); largura 260/276px → 76px, rótulos do menu ocultos com `title` para dica.
- Verificar no navegador (Master e assinante via "ver como assinante"), aberta e recolhida, tema claro e escuro.
