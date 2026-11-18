# Corrigir o alerta de carregamento nas áreas Master e Assinante

## O que descobri
- O alerta não tem relação com o tema claro. Reproduzi sempre, nos dois temas: ele aparece quando alguém **sem sessão** abre direto (ou recarrega) uma página do Master ou do assinante e é mandado para a tela de login (`/superadmin` ou `/entrar`).
- A causa: as duas áreas fazem essa checagem no navegador durante a primeira montagem da página e "jogam" o redirecionamento no meio dela. O roteador perde a referência da tela que estava montando (`Cannot read properties of undefined (reading 'routeId')`) e o React refaz a página inteira para se recuperar.
- Para o usuário o resultado final é o mesmo (chega ao login), mas a página monta duas vezes, pode piscar e deixa erros no console. Vai voltar sempre que a sessão expirar ou alguém abrir um link salvo.

## Correção
1. Em `src/routes/master.tsx` e `src/routes/app.tsx`, envolver a checagem de acesso: se ela pedir redirecionamento **na primeira carga da página**, em vez de interromper a montagem, a área devolve "precisa ir para X" e o layout mostra a tela de carregamento e faz o redirecionamento logo em seguida (com `replace`, sem entrada extra no histórico).
2. Navegações dentro do app (já carregado) continuam com o redirecionamento imediato de hoje.
3. Nenhuma regra de acesso muda: mesmas condições, mesmos destinos (login, troca de senha, checkout, onboarding, Master).

## Verificação
- Abrir sem sessão `/master/painel`, `/master/planos`, `/app/inicio`, `/app/movimentacoes` (computador e celular, claro e escuro): chegar ao login sem nenhum erro no console.
- Abrir com sessão de Super Admin e de assinante: páginas carregam normalmente, sem erros.
- Rodar todos os testes e o verificador de sessões (`scripts/verify-auth-realms.mjs`).
- Registrar em NOVAS-IMPLEMENTAÇÕES.
