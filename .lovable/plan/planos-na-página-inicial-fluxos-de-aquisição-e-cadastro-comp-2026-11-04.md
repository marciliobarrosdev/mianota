# Planos na página inicial, fluxos de aquisição e cadastro completo

## 1. Seção "08 · Planos simples"
- Ordem fixa: Grátis, Basic, Pro, em uma única linha no computador (3 colunas, centralizadas, largura maior).
- Tablet e celular: 1 plano por linha, centralizado.
- Preços sempre com duas casas: "SEM CUSTO", "R$ 29,90/mês", "R$ 49,90/mês" (o formato atual corta o zero final).

## 2. Regras de troca de plano (aplicadas no servidor e na tela de checkout)
| Plano atual | Pode ir para | Condição |
|---|---|---|
| Nenhum (conta nova) | Grátis, Basic, Pro | Grátis só 1 vez por conta |
| Grátis (ativo, expirado ou sem créditos) | Basic, Pro | Pagamento confirmado |
| Basic | Basic (renovar), Pro (upgrade) | Pagamento confirmado; nunca volta ao Grátis |
| Pro | Pro (renovar), Basic (downgrade) | Pagamento confirmado; cotas trocadas para as do Basic |

- Grátis: 7 dias; ao expirar ou acabar os créditos de IA, a conta fica bloqueada até pagar Basic ou Pro.
- Renovação/troca paga: ao confirmar o pagamento, cotas e créditos são renovados conforme o plano escolhido.
- A página de checkout mostra só as opções permitidas para a conta.

## 3. Cadastro único para os 3 planos
- Todos os botões "Testar grátis", "Começar com Gratuito/Basic/Pro" levam ao novo formulário público de cadastro com o plano escolhido.
- O formulário tem os mesmos campos do Novo Assinante do Master (foto, dados pessoais, CPF/CNPJ, empresa, telefone, e-mail, endereço) mais senha.
- Os dados aparecem em "/master/assinantes".
- Grátis: acesso liberado ao concluir o cadastro (após confirmar e-mail).
- Basic/Pro: conta criada como "aguardando pagamento", segue para o checkout InfinitePay; acesso e cotas só liberados após confirmação do pagamento.

## 4. Desativar a demonstração
- Remover o link dos botões "Ver a demo", "Explorar sistema completo", "Ver dashboard completo", "Navegar pela demo", "Entrar na demonstração", "Demonstração" no rodapé e "Ver demo" no menu (ficam ocultos).
- As páginas de demo continuam existindo, só sem acesso pela página inicial.

## Detalhes técnicos
- `finance-landing.tsx`: grid `grid-cols-1 lg:grid-cols-3 max-w-6xl mx-auto`, ordenação por `is_free` e preço, formatação via `src/lib/common/money.ts` (centavos → "29,90").
- Nova regra pura `src/lib/billing/plan-transition-rules.ts` + testes (cada linha da tabela acima vira um teste); usada por `/app/checkout` e pela criação do checkout no servidor.
- Bloqueio de Grátis expirado/sem créditos via status da assinatura existente.
- Formulário público: reaproveitar campos de `/master/novo-assinante` em componente compartilhado; `entrar.tsx` com `modo=signup` passa a usar esse componente; server function grava `company` (tipo_pessoa maiúsculo, foto 256px) e respeita `free_plan_usage`.
- Basic/Pro criam assinatura pendente; `applyEvent` do webhook ativa.
