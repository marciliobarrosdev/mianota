# Integração Resend (envio de e-mail + webhook de eventos)

## O que você terá
- Conexão com sua conta Resend usando sua API Key (salva com segurança, nunca aparece na tela).
- Envio de e-mails do MIAnota pelo Resend, a partir do seu domínio verificado no Resend.
- Um Webhook do MIAnota para colar no Resend:
  `https://mianota.lovable.app/api/public/email/resend`
- Nova área no Master ("E-mails") mostrando: status da conexão, remetente configurado, botão "Enviar e-mail de teste" e lista em tempo real dos eventos recebidos (enviado, entregue, aberto, clicado, devolvido, reclamação, atraso).

## Passos
1. Conectar o Resend (cartão de conexão aparece no chat para você colar a API Key).
2. Criar o webhook e publicar o site (o Resend só alcança o endereço publicado).
3. Você cadastra o webhook no Resend (Webhooks → Add endpoint, marcando todos os eventos) e copia o "Signing Secret" (começa com `whsec_`).
4. Eu peço esse Signing Secret em um formulário seguro; a partir daí cada evento é verificado antes de ser aceito.
5. Configurar remetente (nome + e-mail do domínio verificado) no Master e testar envio.

## Detalhes técnicos
- Envio: função de servidor `sendResendEmail` (`src/lib/email/resend.server.ts`) via gateway de conectores (`RESEND_API_KEY` + `LOVABLE_API_KEY`), com validação Zod; erros do Resend registrados com status e corpo.
- Webhook: rota `src/routes/api/public/email/resend.ts`, verifica assinatura Svix (`svix-id`, `svix-timestamp`, `svix-signature`) com `RESEND_WEBHOOK_SECRET` sobre o corpo bruto; 401 se inválida, 200 ao gravar; idempotente pelo `svix-id`.
- Tabela `email_event` (id do evento, tipo, message_id, destinatário, assunto, payload, data) com RLS somente leitura para super admin; tabela/config de remetente via `platform_integration_secret` existente.
- Página `/master/emails` com server functions protegidas por super admin; ações sensíveis registradas em `writeMasterAudit`.
- Testes Vitest para verificação de assinatura e mapeamento de eventos.
