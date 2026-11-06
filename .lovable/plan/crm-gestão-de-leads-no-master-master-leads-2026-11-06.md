# CRM "Gestão de Leads" no Master (/master/leads)

## O que você vai ver
- Nova seção **"Gestão de Leads"** no menu do Master, com a página **"Leads"**. Visível só para o Super Administrador (nunca para assinantes).
- Todo cliente que se cadastrar no **Plano Grátis** vira automaticamente um card em **"Novos Leads"** (planos pagos não entram).
- Funil Kanban com arrastar e soltar, animação suave e gravação instantânea:
  Novos Leads → Em Contato → Em Plano Grátis / Experimental → Em Migração → Convertido → Perdidos.
- Contador (badge) de leads e soma do valor potencial no topo de cada coluna.
- Card do lead: foto/iniciais, nome, e-mail, WhatsApp, plano, dias restantes do grátis, créditos IA, etiquetas, temperatura (frio/morno/quente) e tempo parado na etapa. Menu: **Visualizar**, **Editar Lead**, **Excluir Lead** (com confirmação).
- Botão **"Novo Lead"** com formulário (nome, e-mail, WhatsApp, empresa, origem, valor potencial, responsável, etiquetas, observações).

## Movimento automático (além do arrastar manual)
- Pagamento confirmado de Basic/Pro de um lead → vai para **Convertido** (plano registrado).
- Grátis expirado ou créditos esgotados sem pagamento por 7 dias → sugerido/movido para **Perdidos** (marcado como automático; você pode desfazer arrastando).
- Ao mover para "Perdidos", pede motivo (sem interesse, não respondeu, preço, outro).

## Novas funções de CRM
1. **Ficha do lead (Visualizar)** em painel lateral com abas: Resumo, Linha do tempo (mudanças de etapa, notas, contatos), Notas, Tarefas.
2. **Tarefas e follow-ups** com data; alerta de atrasadas no card e na ficha.
3. **Ações rápidas**: abrir WhatsApp com mensagem pronta, copiar e-mail, ver assinante em /master/assinantes.
4. **Métricas no topo**: total de leads, novos no mês, taxa de conversão, leads em grátis expirando em 2 dias, tarefas atrasadas, receita convertida.
5. **Filtros e busca**: texto, etiqueta, origem, temperatura, período; alternar visão **Kanban / Lista**; exportar CSV.
6. Registro de auditoria nas exclusões e mudanças manuais.

## Visual / UX
- Colunas com cor própria por etapa, rolagem horizontal no desktop e abas por etapa no celular.
- Destaque do card ao arrastar, área de soltar iluminada, estados vazios amigáveis, carregamento em esqueleto, avisos de sucesso/erro com desfazer.

## Detalhes técnicos
- Biblioteca: `@dnd-kit/core` + `@dnd-kit/sortable` (acessível, teclado, animação). Atualização otimista com TanStack Query e rollback se falhar.
- Novas tabelas: `master_lead` (etapa, posição, contato, company_id/user_id opcional, origem, temperatura, valor, tags, motivo de perda, stage_changed_at), `master_lead_activity` (linha do tempo/notas), `master_lead_task`. RLS somente `is_super_admin()`; grants a authenticated/service_role.
- Criação automática: no `createCheckoutCompany` quando o plano é grátis (idempotente por company_id) + backfill dos cadastros grátis existentes em `free_plan_usage`.
- Conversão automática chamada no fluxo compartilhado `applyEvent` de pagamento (sem quebrar o webhook).
- Server functions em `src/lib/master/leads.functions.ts`, regras puras em `src/lib/master/lead-pipeline-rules.ts` (etapas, transições automáticas, métricas) com testes Vitest.
- Rota `src/routes/master/leads.tsx`, componentes em `src/components/master/leads/*`, item no menu de `src/routes/master.tsx`.
