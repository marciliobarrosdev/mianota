# Foto, nome e e-mail do assinante na área do assinante

## O que muda
Em todas as telas do assinante (`/app/*`), que compartilham o mesmo menu e topo:

1. **Topo à direita (ponto 1)**: o círculo com a letra "O" passa a mostrar a foto do assinante (a mesma cadastrada no Master). Sem foto, mostra a inicial do nome.
2. **Rodapé do menu lateral (ponto 2)**: o quadrado com a letra vira a foto do assinante.
3. **Ponto 3**: em vez de "osmkt13" (parte do e-mail), aparece o nome do assinante.
4. **Ponto 4**: em vez de "Dono", aparece o e-mail completo do assinante (cortado com "…" se for longo, com o e-mail completo ao passar o mouse).

No celular, o menu lateral aberto também mostra foto, nome e e-mail.

## Regras
- Nome: usa o nome do responsável cadastrado no assinante; se vazio, o nome da empresa/assinante; se vazio, a parte antes do "@" do e-mail.
- Foto: a foto do assinante; sem foto, inicial do nome no mesmo estilo atual.

## Detalhes técnicos
- `src/components/app-shell.tsx`: calcular `displayName` (`company.nome_responsavel` → `company.nome` → prefixo do e-mail); trocar os dois quadrados de inicial por `SubscriberAvatar` (`company.logo_url`); a segunda linha do cartão mostra `email` em vez de `roleLabel`; mesmo no menu móvel.
- Regra do nome em função pura pequena com teste.
