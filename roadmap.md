# Roadmap — canal central único, onboarding pós-compra, IA e créditos

## Validação autenticada após refatoração
- [x] Sessão autorizada: Master e impersonação da própria empresa; cadastro/edição carregaram, nove lançamentos reais lidos e planejamento semanal/formulário conferidos sem alterar dados.
- [x] Nenhum link de execução para Demo encontrado; rótulos de resultado corrigidos sem alterar cálculos.
- [x] 206 testes e sete verificações passaram; resultados e limites registrados em NOVAS-IMPLEMENTAÇÕES.md.

## Limpeza e refatoração para uso real
- [x] Remover páginas, componentes, dados e arquivos exclusivos de demonstração.
- [x] Limpar referências e arquivos comprovadamente sem uso, preservando dados reais e migrações.
- [x] Consolidar organização por domínio e remover comportamentos fictícios das páginas reais.
- [x] Validar 206 testes, sete verificações de segurança, catálogo/cadastro públicos e ausência de Demo; páginas autenticadas não verificadas por falta de sessão autorizada.

## Correção do cadastro de assinantes
- [x] Corrigir formato do tipo de pessoa na criação, edição, filtros e ficha.
- [ ] Verificar salvamento e reabertura pelo Master — formulário conferido; gravação depende de dados reais de cadastro/alteração fornecidos pelo dono, para não inserir conteúdo fictício.

- [x] Migração: canal ativo exclusivo + troca auditada, template Meta, fila de onboarding, ativação de uso único, config de IA
- [x] Captura nome/telefone do comprador (Stripe + Kiwify/Cakto/PerfectPay) e phone_number_collection no checkout Stripe
- [x] Onboarding pós-compra idempotente (Evolution texto "COMEÇAR código", Meta template com botão/payload + código fallback), dry-run
- [x] Pareamento seguro na primeira resposta, renovação de vínculo existente, conflito de telefone em outro tenant
- [x] Status de entrega (enviado/entregue/lido/falhou) reconciliados
- [x] Webhooks ignoram o canal inativo
- [x] Master: fila "Onboarding pós-compra", troca de canal segura, template Meta, "IA e créditos" (BYOK com máscara), checklist
- [x] Testes + typecheck + build

## Concluído anteriormente
- Reestruturação MárcIA financeiro (Superadmin, assinante, demo) — concluída.

## Remix setup
- [x] Verify copied migrations are cleared and the PostgreSQL migration journal has no entries; database schema left unchanged.
- [ ] Replace the eight requested secrets — blocked because the secure replacement form was declined.
- [x] Verify CLONE_ACTIVATION_CODE is not referenced by the current application; ownership is automatic.

## Pendências operacionais (exigem WhatsApp/contas reais)
- Escanear o QR (ou testar Meta) e ativar o canal central no Master
- Aprovação do template na Meta (até 48h) e teste do botão Começar
- Compra real em cada plataforma confirmando que o telefone chega no webhook
- Primeira resposta real "COMEÇAR código" e status entregue/lido

## Central de avisos
- [x] Filtros, agrupamento por dia, ações (paga/adiar), arquivar/excluir, resumo semanal, carregar mais
- [x] Preferências (categorias no celular, silêncio, antecedência, resumo diário)
- [x] Rotina diária no servidor + alertas de orçamento, plano vencendo, créditos, pagamento confirmado
- [x] Sininho com contador; aviso em massa no Master
- [x] Envio dos avisos também pelo WhatsApp
- [x] Relatório mensal em PDF (baixar, WhatsApp, automático dia 1)

## Falar com MIA (/app/marcia)
- [x] Resumo do mês ao lado, sugestões por contexto, atalhos, separadores por dia, voltar ao fim, limpar conversa
- [x] Desfazer lançamento (10 min) e "Ver no extrato"; "Perguntar à MIA" nos avisos
- [ ] Editar valores no cartão antes de confirmar
- [x] Gravação de áudio real no app (transcrição + confirmação)
- [ ] Vários lançamentos numa mensagem
- [ ] Conversa unificada com WhatsApp
