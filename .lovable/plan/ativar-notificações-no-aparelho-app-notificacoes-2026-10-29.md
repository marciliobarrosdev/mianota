# Ativar notificações no aparelho (/app/notificacoes)

## O que já existe
- O botão "Ativar notificações" e o cadastro do aparelho no banco já existem, mas falham porque a chave pública não está configurada.
- O app em segundo plano (sw.js) já sabe exibir a notificação e abrir o app ao tocar.
- Falta o principal: nada no servidor envia as notificações para os aparelhos cadastrados.

## O que será feito
1. **Guardar as chaves com segurança**: você informa VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY num formulário seguro (a privada nunca chega ao navegador).
2. **Cadastro do aparelho funcionando**: a página busca a chave pública no servidor (não depende mais de configuração no código) e o botão passa a cadastrar o celular/computador.
3. **Envio real**: toda nova notificação da MárcIA (lembretes, agendamentos, avisos) é enviada também para os aparelhos ativos daquele usuário.
4. **Botão "Enviar teste"** no cartão, depois de ativado, para confirmar na hora que chega no aparelho.
5. **Desativar neste aparelho**: botão para parar de receber.
6. Aparelhos cuja inscrição expirou (o navegador avisa) são desativados automaticamente.

## Detalhes técnicos
- Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto do dono, fixo).
- serverFn `getPushPublicKey` substitui `import.meta.env.VITE_VAPID_PUBLIC_KEY` no hook.
- `src/lib/web-push.server.ts`: implementação Web Push (VAPID JWT ES256 + criptografia aes128gcm) só com Web Crypto, compatível com o runtime do Worker (a lib `web-push` usa Node crypto e quebra após publicar).
- `sendPushToUser(companyId, userId, payload)`: lê `marcia_push_subscription` ativas via admin, envia, marca `active=false` em 404/410.
- Disparo: trigger `AFTER INSERT` em `marcia_notification` chama via pg_net a rota `/api/public/push/dispatch`, autenticada por segredo compartilhado gerado (`PUSH_DISPATCH_SECRET`); a rota valida o segredo e envia.
- serverFns autenticadas `sendTestPush` e `deactivatePushDevice`.
- Teste unitário da criptografia/JWT (formato e tamanho) e da regra de desativar em 404/410.
- Observação: o envio automático só funciona no site publicado (mianota.lovable.app); iPhone exige app instalado na tela inicial.
