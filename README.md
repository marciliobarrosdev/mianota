# MIAnota

> "Sua assistente financeira na palma da mão." · Assistente: **MIA**
> Site: https://mianota.lovable.app

Assistente financeira pessoal com inteligência artificial. O assinante registra e consulta a vida financeira por voz, texto, foto ou WhatsApp; a MIA entende o contexto, pergunta apenas o que faltar e pede confirmação antes de salvar.

```text
voz / texto / foto / WhatsApp → entendimento → pergunta curta → confirmação → painel
```

## Planos

- Plano Gratuito (uma vez por conta)
- Plano 1 — R$ 29,90/mês
- Plano 2 — R$ 49,90/mês

Preços e links de pagamento são definidos pelo proprietário em **Master → Planos**. Pagamento via **InfinitePay**.

## Experiência do assinante (`/app`)

- **Início:** saldo, entradas, saídas, projeção e leitura da MIA;
- **Falar com a MIA:** central de comando por voz ou texto;
- **Movimentações:** receitas, despesas, contas futuras, anexos e recorrências;
- **Planejamento:** orçamentos e metas;
- **Notificações:** lembretes e avisos (inclusive push e WhatsApp);
- **Configurações:** perfil, assistente, WhatsApp e app instalado.

A MIA nunca salva uma ação financeira silenciosamente: falta de dado gera pergunta, e só há gravação após confirmação.

## Painel do proprietário (`/superadmin` → `/master`)

Assinantes, planos, CRM de leads, canal central de WhatsApp (QR Code ou Meta, exclusivos), provedor de IA (Lovable AI ou chave própria), e-mails Resend, integrações e auditoria.

## Cookies e privacidade (LGPD)

Nada opcional é gravado no navegador antes de uma escolha explícita. Rolar, navegar ou fechar o aviso **não** conta como aceite.

**Como funciona**
- O aviso aparece em qualquer página enquanto não houver escolha válida, com **Aceitar todos**, **Rejeitar opcionais** e **Personalizar**.
- A escolha fica salva em `mia-cookie-consent`: categorias ligadas, data da decisão, versão da política e validade de 365 dias — sem dados pessoais, financeiros, mensagens, senhas ou chaves.
- Escolha ausente, malformada, vencida ou de outra versão da política faz o aviso voltar. Subir `CONSENT_POLICY_VERSION` pede nova decisão em todos os aparelhos.
- Revogar apaga na hora os itens opcionais (tema, menu recolhido, filtro de conversas, aviso de instalação, cookie `sidebar_state`); login e segurança continuam funcionando.
- Toda gravação opcional passa por `setPreference`, toda leitura por `hasConsent`, e scripts de análise ou marketing só entram por `loadOptionalScript`, depois da autorização.

**Categorias**

| Categoria | Padrão | O que guarda |
|---|---|---|
| Essenciais | sempre ativos | sessões de assinante e Master, registro da escolha de cookies, cache público da marca, notificações que você ativar |
| Preferências | desligado | tema claro/escuro, menu lateral recolhido, filtro da tela de conversas, aviso de instalação do app |
| Análise | desligado | nenhuma ferramenta em uso no momento |
| Marketing | desligado | nenhuma ferramenta em uso no momento |

**Onde mudar a escolha**
- Aviso de cookies, em qualquer página;
- **Preferências de cookies** no rodapé do site;
- **Configurações → Privacidade** no app do assinante;
- **/politica-de-cookies**, com a tabela completa de itens, finalidades e prazos.

## Estrutura de pastas

```text
src/
  routes/          páginas (TanStack Router) e rotas de API em routes/api/public
  components/
    landing/       página inicial
    finance/       telas financeiras do assinante
    master/        telas do proprietário (master/plans: cartão, editor e Stripe dos planos)
    notifications/ peças da Central de Notificações
    mia/           peças visuais da MIA
    consent/       aviso e central de preferências de cookies
    ui/            componentes base (shadcn)
  hooks/           ganchos React (chat da MIA, caixa de avisos, push, app instalado)
  lib/
    ai/            chamadas de IA e regras da MIA
    auth/          sessões separadas de assinante e proprietário
    billing/       planos, checkout InfinitePay, transições de plano
    common/        dinheiro, telefone, e-mail, consentimento, segredos de integração
    email/         Resend e boas-vindas
    finance/       regras financeiras, notificações, push
    master/        funções do Master, CRM, auditoria
    whatsapp/      Evolution/Meta e onboarding pós-compra
supabase/          migrações do banco
scripts/           verificações automáticas de segurança
tests/             testes de regras de negócio
```

Padrão adotado nas telas grandes: a página só compõe; regras puras ficam em `*-rules.ts` (com testes em `tests/`), acesso ao banco em hooks ou `*.server.ts`, e peças visuais em `src/components/<área>/`.

Regras técnicas de arquitetura ficam em `AGENTS.md` (e em `AGENTS.md` de subpastas).

## Nomes internos preservados

Algumas tabelas do banco ainda se chamam `marcia_*` (ex.: `marcia_notification`). Renomeá-las exigiria migração de dados reais; por segurança, foram mantidas. Todo texto visível usa MIAnota / MIA.

## Desenvolvimento

```bash
bun install
bun run test                 # testes de regras
bun run test:clone-security  # verificações de segurança
bun run build
```

## Segurança

- dados isolados por conta com RLS;
- chaves de integração criptografadas no servidor, nunca enviadas ao navegador;
- sessões independentes para assinante e proprietário;
- nada opcional no navegador sem consentimento explícito (LGPD);
- avisos de pagamento reconfirmados antes de liberar plano;
- ações sensíveis do Master registradas em auditoria.

Documentação complementar: `MANUAL.md` (uso) e `NOVAS-IMPLEMENTAÇÕES.md` (histórico de mudanças).

### Organização dos módulos grandes

- Painel financeiro: blocos em `src/components/finance/overview/`; extrato em `src/components/finance/transactions/`.
- Funções do Master por assunto em `src/lib/master/master-{kpis,companies,plans,admins}.functions.ts`; `master.functions.ts` só reexporta.
