# MIAnota — Registro de Novas Implementações

> "Sua assistente financeira na palma da mão." · Assistente: **MIA**
> Atualizado em 03/11/2026. Site: https://mianota.lovable.app

---

## 1. Estado atual do sistema

| Item | Situação |
|---|---|
| Compilação | Sem erros |
| Testes automáticos | 62 (Vitest) + 70 (Bun) — passam, exceto 2 que procuram migrações do projeto original (não vieram no remix) |
| Telas verificadas logado (03/11) | Início, Falar com MIA, Movimentações, Planejamento, Configurações, Comece aqui — sem erros |
| Publicação | Necessária para levar as últimas mudanças ao site no ar |
| Pendências conhecidas | Ver seção 12 |

---

## 2. Configuração inicial (remix)
- Migrações copiadas do projeto original já estavam limpas.
- `CLONE_ACTIVATION_CODE` não é usado: a primeira conta confirmada vira dona da instalação automaticamente (`bootstrap_remix_instance`).
- Segredos CAKTO / EVOLUTION / GOOGLE / KIWIFY / PERFECTPAY não foram substituídos (formulário recusado na época).

## 3. Identidade
- Sistema renomeado de "MárcIA" para **MIAnota**; assistente **MIA**, em telas, prompts, WhatsApp, avisos e manifest.
- Foto de perfil da MIA (`perfil-mia.jpg`) no chat (cabeçalho, respostas, "digitando").
- Faixa do TRIAL na cor `#4abaa8` com texto branco; botão "Ativar plano" roxo.

## 4. Pagamentos e planos
- **InfinitePay**: checkout por plano, página de sucesso `/app/sucesso`, webhook `/api/public/billing/infinitepay` (revalida o pagamento; 200 OK / 400 para reenvio). Cada pagamento confirmado soma 30 dias (sem renovação automática).
- Preços: Plano 1 (Basic) **R$ 29,90/mês**, Plano 2 (PRO) **R$ 49,90/mês**.
- Link de checkout e preço ficam em cada plano (editáveis em `/master/planos`); links do ambiente são reserva.
- Corrigido: preços salvos voltavam para R$ 49,00 / R$ 69,00 (carga inicial sobrescrevia).
- `/master/pagamentos`: seção InfinitePay (tag, chave, 2 links, URLs de sucesso e webhook, testar).
- "Adicionar Novo Plano" com opção **Plano Gratuito** e **limite de dias** (1–365).
- Plano gratuito/trial só **uma vez por conta** (verificado no servidor, por e-mail e usuário).
- Quem já usou trial/gratuito só pode ativar plano pago (Basic ou PRO).
- Segurança: leitura de planos restrita a ativos, ao próprio plano ou ao dono.

## 5. Master (administração)
- `/master/assinantes`: formulário "Novo assinante" completo (contato, empresa, endereço) com todos os planos ativos.
- `/master/ia-creditos`: escolha entre Lovable AI, OpenAI ou Anthropic (chave própria guardada criptografada e mostrada mascarada), modelo, modo otimizado, teste do modelo.
- Pedidos de exclusão de conta aparecem para decisão do dono.

## 6. WhatsApp e MIA
- Corrigido: mensagens do celular autorizado não eram registradas.
- MIA entende **áudio**, **imagem** e **PDF** de recibos/faturas enviados pelo celular.
- Avisos também enviados por WhatsApp.
- Relatório mensal em **PDF** (download e envio por WhatsApp; envio automático dia 1 às 9h).

## 7. Notificações
- Cadastro de aparelho para notificações no navegador (chaves VAPID), teste e desativação.
- Preferências por categoria e horário silencioso.
- Teste real: servidor aceitou envio para os 2 aparelhos cadastrados.

## 8. Telas do assinante
- **Personalidade e regras** (`/app/agente`): perfil usado de fato pela MIA em app, WhatsApp e avisos; alertas de orçamento, resumo semanal, metas, regras de categoria, estilo de resposta.
- **Configurações** (`/app/configuracoes`): abas Minha Experiência, Canais, Conta e Plano, Privacidade; exportação JSON/CSV, sair de todos os aparelhos, pedido de exclusão.
- **Falar com MIA** (`/app/marcia`): resumo do mês, sugestões, desfazer lançamento por 10 min, gravação de áudio com transcrição e confirmação antes de salvar.
- **Planejamento** (`/app/planejamento`): vistas mês/semana/lista, pagar/adiar/editar/excluir no dia, arrastar contas, recorrências, orçamentos e metas, PDF por dia/semana/quinzena/mês/período, exportação de agenda. Aviso de saldo negativo só considera hoje em diante; card "Atrasadas" mostra valor (R$ 0,00).
- **Movimentações** (`/app/movimentacoes`): ações individuais e em lote, desfazer, "Resultado do dia" + "Saldo até aqui", importação de extrato OFX/CSV, divisão de lançamento entre categorias, tags, gráficos, exportação CSV/PDF.
- **Visão do mês** (`/app/inicio`): atalhos, comparação com mês anterior, alertas, projeção do saldo, orçamentos, metas, dicas da MIA.
- **Comece aqui** (`/app/guia`): 7 passos com conclusão automática a partir dos dados reais.

## 9. Refatoração e organização (03/11/2026)
- **Auditoria de código morto**: 24 arquivos sem uso removidos; 8 scripts de verificação quebrados aposentados. Relatório em Files: `auditoria-codigo-morto.md`.
- **src/lib organizado por assunto**:
  ```text
  src/lib/finance   finanças, extrato, planejamento, relatórios, avisos, push
  src/lib/ai        MIA, modelos, transcrição, perfil da assistente
  src/lib/whatsapp  Evolution, canal central, onboarding pós-compra
  src/lib/master    painel de administração
  src/lib/billing   cobrança, checkout, planos, créditos
  src/lib/common    moeda, telefone, máscaras, fuso, marca, integrações
  src/lib/auth      sessões assinante / dono
  src/lib/utils.ts  (fica na raiz)
  ```
- 3 camadas conferidas: regras puras (`*-rules.ts`) sem banco; nenhuma tela usa código só de servidor.
- Nomes internos "Marcia" → "Mia" (arquivos, componentes, hooks). Banco (`marcia_*`) e endereço `/app/marcia` mantidos.

## 10. Integrações ativas
InfinitePay · Stripe · Evolution (WhatsApp QR) · Meta WhatsApp · Lovable AI · OpenAI/Anthropic (opcional) · Notificações web (VAPID) · Google · Lovable Cloud (banco, login, arquivos).

## 11. URLs importantes
- Sucesso do pagamento: `https://mianota.lovable.app/app/sucesso`
- Webhook InfinitePay: `https://mianota.lovable.app/api/public/billing/infinitepay`

## 12. Pendências e não verificado
- Login assinante e dono são enviados juntos nas chamadas ao servidor (deveriam ser separados) — correção recomendada.
- 3 telas ainda gravam direto no banco (Master/Planos, nome em Configurações, Conversas).
- Não testados de ponta a ponta: pagamento real, mensagens/áudio/PDF reais no WhatsApp, envio agendado de relatório, telas do Master após a refatoração.
- Guia: faltam banner na Visão do mês, ocultar guia, mensagem de boas-vindas e versão demo.
- Segredos de Cakto/Kiwify/PerfectPay/Evolution/Google não atualizados.
