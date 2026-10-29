# Melhorias da página "Comece aqui" (/app/guia)

## O que existe hoje
- 3 passos (falar com a MIA, WhatsApp, agendar contas), mas só o primeiro é detectado como concluído; WhatsApp e calendário aparecem sempre como "Falta fazer".
- Barra mostra "0 de 1 essencial" — confunde, pois há 3 passos.
- Só donos/admins acessam; membros são mandados para a Visão do mês.
- Cores roxas fixas, fora do padrão de tema; avatar antigo em vez da foto nova da MIA.

## O que vamos fazer

### 1. Progresso real (integração com os dados)
Cada passo marca "Concluído" automaticamente:
- Primeiro lançamento registrado (app, WhatsApp ou importação).
- WhatsApp vinculado ao celular.
- Pelo menos uma conta agendada ou recorrência criada.
- Notificações ativadas no aparelho.
- Personalidade da MIA ajustada (/app/agente).
- Um orçamento ou meta criado.
- Plano pago ativo (ou dias restantes do Trial com botão "Ativar plano").
Barra passa a mostrar "X de 7" com percentual correto; essenciais x opcionais separados.

### 2. Novos passos e atalhos
- Importar extrato bancário (leva a Movimentações com a importação aberta).
- Ativar notificações (leva a /app/notificacoes).
- Ensinar a MIA (leva a /app/agente).
- Criar orçamento/meta (Planejamento).
- Cada passo com exemplo pronto: "Gastei R$ 45 no mercado" abre o chat da MIA já com a frase.

### 3. Visual
- Topo com a foto nova da MIA, nome e slogan "Sua assistente financeira na palma da mão."
- Linha do tempo vertical numerada (passo atual destacado), em vez de cards soltos.
- Comemoração ao concluir tudo (cartão "Tudo pronto!" com links para Visão do mês e MIA).
- Cores via tema (funciona em modo escuro), layout bom no celular.
- Botão "Ocultar guia" quando completo; link "Comece aqui" some do menu ou vira "Guia".

### 4. Integrações com o sistema
- Faixa na Visão do mês "Faltam N passos" levando ao guia enquanto incompleto.
- Página de sucesso do pagamento (/app/sucesso) direciona ao guia.
- Mensagem de boas-vindas no WhatsApp/aviso com link para o guia (uma vez só).
- Membros da conta (não donos) também acessam, vendo só os passos que podem fazer.
- Versão demo com progresso fictício.

## Detalhes técnicos
- Nova função de servidor `getOnboardingProgress` lendo lançamentos, `fin_whatsapp_identity`, recorrências/contas futuras, push subscriptions, `company.finance_profile`, orçamentos/metas e assinatura; regras puras em `src/lib/onboarding-rules.ts` com testes.
- Componente compartilhado em `src/components/finance/` usado por /app e /demo.
- Sem mudanças de banco, exceto opcionalmente guardar "guia oculto" em `finance_profile`.
