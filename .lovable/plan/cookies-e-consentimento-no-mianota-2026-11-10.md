# Cookies e consentimento no MIAnota

## O que encontrei hoje
- Nenhum rastreador de análise ou marketing (Google Analytics, Meta Pixel, etc.) está instalado.
- Só existem itens essenciais ou de preferência: sessão de login (assinante e Master), tema claro/escuro, menu lateral aberto/recolhido, cache da marca, filtro de conversas, aviso de instalação do app, notificações do app.
- A página de Privacidade cita "analytics" que não existe — será corrigida.

## O que será construído
1. **Aviso de cookies** no rodapé da tela, discreto, com o texto pedido e três botões de mesmo destaque: "Aceitar todos", "Rejeitar opcionais", "Personalizar", e link para a Política. Aparece só sem escolha válida; rolar, navegar ou fechar não conta como aceite.
2. **Central de preferências** (janela): Essenciais (sempre ligado), Preferências, Análise, Marketing — opcionais desligados por padrão, com "Salvar preferências". Análise e Marketing aparecem marcadas como "nenhuma ferramenta em uso no momento".
3. **Controle real**: preferências como tema, menu recolhido, filtro de conversas e aviso de instalação só são guardadas com "Preferências" autorizado (sem ela, funcionam na visita mas não ficam salvas). Um carregador único fica pronto para qualquer ferramenta futura de análise/marketing, que só carrega após consentimento.
4. **Salvar e revogar**: guarda categorias, data, versão da política e validade (12 meses, ajustável no código). Link "Preferências de cookies" no rodapé da página inicial, nas páginas legais e nas configurações do assinante. Ao revogar, apaga os itens opcionais, mantendo login e segurança.
5. **Página /politica-de-cookies** com tabela real (nome, fornecedor, finalidade, categoria, duração) e marcações "pendente de revisão" para razão social, CNPJ e contato do responsável (não vou inventar).
6. **Privacidade**: o registro de consentimento fica só no navegador, sem dados financeiros, mensagens, senhas ou chaves.

## Validação
Teste no navegador: primeira visita, aceitar, rejeitar, personalizar, revogar e recarregar; conferir nas requisições que nenhum rastreador opcional é chamado. Testes automáticos das regras (validade, versão, padrão desligado).

## Pendências que vou te pedir
Razão social, CNPJ e e-mail de contato do encarregado (DPO) para a política.

## Detalhes técnicos
- `src/lib/common/consent-rules.ts` (puro, testado em `tests/consent-rules.test.ts`), `src/hooks/use-consent.ts`, `src/components/consent/{cookie-banner,cookie-preferences-dialog}.tsx`, montado em `__root.tsx` via ClientOnly.
- Helper `prefStorage` gate nos `localStorage.setItem` de preferência; cookie `sidebar_state` gated.
- `loadOptionalScript(category, src)` para integrações dinâmicas; evento `mia:consent-changed`.
- Atualizar privacidade.tsx, README, MANUAL, NOVAS-IMPLEMENTAÇÕES e AGENTS.md.
