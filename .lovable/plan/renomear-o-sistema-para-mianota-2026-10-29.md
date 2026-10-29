# Renomear o sistema para MIAnota

## O que muda para quem usa
- O nome do sistema passa de "MárcIA" para **MIAnota** em todo lugar que aparece: site, login, painel do assinante, área Master, demo, e-mails, mensagens do WhatsApp, notificações, ícone do app instalado e título das abas.
- Slogan novo: **"Sua assistente financeira na palma da mão."**
- A assistente passa a se chamar **MIA**: no chat, nas respostas do WhatsApp ("Oi, sou a MIA..."), nos avisos e nas instruções da IA.
- A identidade salva no banco (nome/slogan do Master → Marca) também é atualizada, para o site publicado já mostrar o nome novo.

## O que NÃO muda (para não quebrar nada)
- Nomes técnicos internos (tabelas `marcia_*`, funções, tipos) ficam como estão. Renomear isso arriscaria perder dados e quebrar o WhatsApp, pagamentos e notificações, e ninguém vê esses nomes.
- Endereços antigos com "marcia" (ex.: `/demo/marcia`) continuam funcionando; se houver um endereço visível com o nome, crio o novo e o antigo redireciona.

## Detalhes técnicos
1. `src/config/brand.ts`: name/shortName "MIAnota", assistantName "MIA", tagline nova.
2. Varrer os ~100 arquivos com `rg -i "m[aá]rcia"` e trocar somente textos visíveis (JSX, toasts, head() títulos/descrições, prompts de IA em `*.server.ts`, textos de WhatsApp/onboarding, manifest, push) — "MárcIA" → "MIAnota" quando é o sistema, "Márcia"/"MárcIA" → "MIA" quando é a assistente.
3. Migração: atualizar a linha de marca salva (name, short_name, assistant_name, tagline) somente se ainda estiver com os valores antigos; atualizar defaults das colunas.
4. Ajustar testes que comparam textos com o nome antigo; rodar todos os testes e `scripts/verify-*.mjs`.
5. Conferir no preview: landing, /entrar, /app e chat mostram MIAnota / MIA.
6. Atualizar memória com o nome, slogan e nome da assistente.

Publicar depois para valer em mianota.lovable.app.
