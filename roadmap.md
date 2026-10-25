# Roadmap — canal central único, onboarding pós-compra, IA e créditos

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

## Pendências operacionais (exigem WhatsApp/contas reais)
- Escanear o QR (ou testar Meta) e ativar o canal central no Master
- Aprovação do template na Meta (até 48h) e teste do botão Começar
- Compra real em cada plataforma confirmando que o telefone chega no webhook
- Primeira resposta real "COMEÇAR código" e status entregue/lido
