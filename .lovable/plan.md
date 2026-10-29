# Foto da MIA no chat

Trocar o ícone de estrelas pela foto enviada (perfil-mia.jpg) em todos os pontos do chat "Falar com MIA":

- Cabeçalho do chat (avatar grande ao lado de "MIA", mantendo o pontinho de online).
- Avatar ao lado de cada resposta da MIA.
- Avatar do indicador "digitando...".
- Mesmo visual na demonstração (/demo/marcia), pois usa o mesmo chat.

Menu lateral e outros ícones continuam iguais.

## Técnico
- Enviar a imagem como asset (`src/assets/perfil-mia.jpg.asset.json`).
- Criar componente `MiaAvatar` (img redonda, object-cover, alt "MIA") e usar em `marcia-chat.tsx` (linhas ~527 e ~644), `marcia-chat-shell.tsx` e no cabeçalho de `src/routes/app/marcia.tsx`.
