# MIAnota — Registro de Novas Implementações

> "Sua assistente financeira na palma da mão." · Assistente: **MIA**
> Atualizado em 10/11/2026. Site: https://mianota.lovable.app

---

## 1. Estado atual do sistema

| Item | Situação |
|---|---|
| Compilação | Sem erros |
| Testes automáticos (10/11) | 252 passaram em 43 arquivos; uma verificação SQL histórica é ignorada explicitamente porque a migração original não foi copiada. Sete verificações de segurança passaram. |
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
InfinitePay (único checkout integrado) · Evolution (WhatsApp QR) · Meta WhatsApp · Lovable AI · OpenAI/Anthropic (opcional) · Notificações web (VAPID) · Google · Lovable Cloud (banco, login, arquivos).

## 11. URLs importantes
- Sucesso do pagamento: `https://mianota.lovable.app/app/sucesso`
- Webhook InfinitePay: `https://mianota.lovable.app/api/public/billing/infinitepay`

## 12. Pendências e não verificado
- Corrigido em 07/11: chamadas ao servidor enviam somente a sessão do domínio da aba; removido o middleware gerado concorrente.
- 3 telas ainda gravam direto no banco (Master/Planos, nome em Configurações, Conversas).
- Não testados de ponta a ponta: pagamento real, mensagens/áudio/PDF reais no WhatsApp, envio agendado de relatório, telas do Master após a refatoração.
- Guia: faltam banner na Visão do mês, ocultar guia e mensagem de boas-vindas; versão demo removida por decisão do proprietário.
- Segredos de Cakto/Kiwify/PerfectPay/Evolution/Google não atualizados.

## 13. Limpeza para uso real (07/11/2026)
- Excluídas todas as rotas e pastas Demo, dados financeiros fictícios, chat roteirizado e prévias simuladas da página inicial.
- Catálogo público carregado por função de leitura anônima de planos ativos e consulta compartilhada; sem planos, preços, benefícios ou limites fictícios de reserva. Cadastro também não presume planos em falhas de conexão.
- Cinco páginas já redirecionadas foram reduzidas a redirecionamentos: Agenda, Financeiro, Operação, Ordens e detalhe de Ordem; URLs antigas preservadas, interfaces inacessíveis removidas.
- Excluídos cinco arquivos órfãos: preparação de armazenamento de marca, configuração de servidor vazia, descrição IA de serviços, diálogo de conclusão de OS e respectiva função.
- Organização de `src/lib` mantida por domínio; somente `utils.ts` permanece na raiz. Regras, acesso a dados e interface continuam separados.
- Testes padronizados em Vitest, com comando `bun run test`; simulações isoladas nos testes preservadas para não cobrar IA, enviar WhatsApp ou modificar clientes durante regressões.
- Metadados próprios das páginas não são mais sobrescritos pelo provedor visual de marca.
- Verificação no navegador: catálogo real, formulário de cadastro Basic, telas desktop/celular sem excesso horizontal e `/demo/dashboard` retornando página não encontrada; nenhum erro JavaScript observado.
- Os dados consultados nesta verificação apresentaram Basic R$ 49,00 e Pro R$ 69,00, sem plano gratuito ativo; foram preservados, não corrigidos nem substituídos por valores fictícios nesta limpeza.
- Nenhum cadastro, lançamento, lead, segredo ou histórico real foi apagado; nenhuma migração foi removida ou aplicada.
- Não validado nesta rodada: telas conectadas de assinantes/Master, compra e WhatsApp reais; sessão autorizada indisponível. Esta limpeza não equivale a uma reescrita integral ou atualização indiscriminada de todas as dependências.

## 14. Validação autenticada após refatoração (07/11/2026)
- Sessão da conta explicitamente autorizada: Master, Assinantes, Planos e formulário Novo assinante abriram; edição carregou os dados reais completos. Nenhum cadastro novo foi criado nem dados de contato alterados.
- Acesso “Entrar como” à empresa da própria conta autorizada: Início, Movimentações, Planejamento e Configurações carregaram; retorno ao Master preservou a sessão administrativa.
- Movimentações: leitura de nove lançamentos reais de outubro pelo filtro Mês passado; salário de R$ 3.000,00, despesas de R$ 513,00 e saldo líquido de R$ 2.487,00. Formulário manual apresentou entrada/saída e sete formas de pagamento.
- Planejamento: alternância para Semana e formulário Nova conta com formas de pagamento e recorrência abriram sem erro.
- Corrigidos rótulos de resultado na Visão do mês e Planejamento: totais restritos às contas/período não são mais chamados de saldo acumulado; aviso de resultado negativo explicita que não inclui sobras anteriores. Valores e regras de cálculo não foram modificados.
- Auditoria de fontes e links na tela Master: nenhum link de execução para Demo; acesso direto à antiga demonstração retorna 404.
- Nenhum erro JavaScript observado; 206 testes passaram, um histórico foi ignorado, sete verificações de segurança passaram e compilação sem erros.
- Limites: não foram salvos cadastros, receitas ou despesas artificiais em contas reais; criação, edição e confirmação de pagamento continuam sem validação de gravação ponta a ponta. Acesso do assinante foi exercitado pela impersonação Master, não por login independente de assinante.
- Divergência preservada e identificada: planos salvos continuam Basic R$ 49,00, Pro R$ 69,00 e Gratuito inativo; esta verificação não alterou preços nem ativação de planos.

## 15. Salvamentos de teste autorizados (07/11/2026)
- Cadastro isolado: **TESTE AUTORIZADO MIAnota 20261107 0114**, contato `teste-mianota-20261107-0114@example.com`; lista Master confirmou persistência após recarregar.
- Corrigido bloqueio de criação: o trigger de créditos desconsiderava a data futura explicitamente liberada pelo Master quando o plano tinha zero dias padrão; migração 0016 respeita a validade futura, mantendo trial sem validade bloqueado. Não altera dados de clientes existentes.
- A conta preservada na falha inicial foi reutilizada; nenhum cadastro real foi removido. Trial administrativo de sete dias e cinco créditos liberado pela interface, sem chamada à IA ou checkout.
- Primeiros passos concluídos pela interface com conta financeira de teste; entrada **R$ 1.000,00**, saída **R$ 234,00**, ambas PIX no dia 07/11; conta planejada **R$ 345,00**, PIX, pendente em 10/11. Todos possuem descrição TESTE AUTORIZADO.
- Persistência confirmada na interface após recarregar cada gravação, e leitura dos três registros confirmou valores em centavos, status, vencimento e forma de pagamento. Planejamento mostrou entrada R$ 1.000,00, saída R$ 234,00, a pagar R$ 345,00 e resultado previsto R$ 421,00.
- Nenhum pagamento iniciado, nenhuma chamada de IA realizada; saldo de cinco créditos permaneceu íntegro. Os registros de teste ficam identificados e separados para inspeção; não foram apagados registros reais.
- Escopo validado: criação pelo Master, onboarding e gravações manuais com impersonação autorizada. Signup público com confirmação de e-mail, compra e lançamento via MIA/WhatsApp não foram exercitados nesta rodada.

## 16. Remoção autorizada dos registros de validação (07/11/2026)
- Removidos somente o cadastro **TESTE AUTORIZADO MIAnota 20261107 0114** (`337501f9-36e1-4ba1-b594-09163a5f82dc`) e a conta de autenticação `teste-mianota-20261107-0114@example.com` (`93fe37d2-91d3-48de-89bb-1c544211c245`), com conferência prévia de nome, e-mail e vínculos exclusivos.
- Removidos seus três lançamentos de teste (entrada R$ 1.000,00, saída R$ 234,00 e planejamento R$ 345,00), uma conta financeira, dez categorias, quatro etapas CRM, dois avisos, assinatura experimental, concessão de créditos, vínculo de proprietário, provisionamento e perfil exclusivos da validação.
- Conferência posterior: nenhuma referência à identificação deste teste nas tabelas públicas; conta de autenticação de teste ausente. Permanecem os mesmos dois cadastros, 38 lançamentos e quatro contas de autenticação anteriores à validação.
- A comparação integral dos registros públicos fora do escopo de teste produziu o mesmo resumo criptográfico antes e depois (`cea5db3292d592eb4677f5419ff8c163`), confirmando que nenhum desses registros foi alterado ou removido.
- Nenhuma cobrança, chamada de IA, alteração de plano, mudança de código funcional ou migração foi realizada. Mantidas as correções e os testes automatizados da validação anterior.

## 17. Webhook Resend publicado e validado (07/11/2026)
- A rota POST `https://mianota.lovable.app/api/public/email/resend` já estava corretamente incluída em `src/routeTree.gen.ts`; o 404 era da versão publicada anterior. Publicação solicitada e endpoint publicado confirmado com resposta HTTP 401 para assinatura inválida, em vez de 404.
- Verificação básica de segurança sem problemas apontados; quatro testes de assinatura Svix e mapeamento passaram. Nenhuma alteração no código do webhook foi necessária.
- Envio autorizado pela página Master, com remetente existente `mianota@zapyertech.com` e destinatário `admzapyer@gmail.com`, aceito pelo Resend. Eventos reais `email.sent` e `email.delivered` recebidos às 02:22 UTC e persistidos para a mensagem `01a1b3d0-4b53-76f8-8f1a-2ceaa00a4c3b`.
- Recebimento real comprova que a assinatura fornecida pelo Resend foi aceita pela versão publicada; requisição de assinatura inválida foi rejeitada. Interface Master autenticada exibiu Enviado e Entregue após recarregar, com confirmação adicional por leitura do banco.
- Nenhum cadastro, lançamento, preço, configuração de remetente ou registro preexistente foi editado ou excluído. Foram acrescentados somente a auditoria do envio autorizado e os eventos reais correspondentes. Nenhuma cobrança ou chamada de IA realizada.

## 18. Boas-vindas automáticas por Resend (07/11/2026)
- Cadastro público confirmado e criação pelo Master chamam o envio de boas-vindas somente depois de gravar o assinante; remetente vem da configuração existente, destinatário da conta confirmada e plano da assinatura salva. E-mail contém acesso em `https://mianota.lovable.app/entrar`; planos com pagamento pendente não prometem acesso já liberado.
- Migração 0019 deixa os dois cadastros antigos inelegíveis e marca exclusivamente novas inserções. Uma atualização condicional reserva o envio antes da chamada ao Resend, com chave estável por empresa; tentativas repetidas e concorrentes não reenviam.
- Envio limitado a 15 segundos; falhas não desfazem cadastro e são registradas. Após tentativa ambígua, não há reenvio automático, evitando duplicidades. Eventos reais continuam no webhook e Master E-mails.
- Dezoito testes passaram, incluindo cadastro antigo, disputa pela reserva e envio isolado com plano/contato salvos; compilação sem erros. Nenhum cadastro ou envio novo real foi realizado nesta rodada; confirmar o fluxo completo requer publicação e um novo cadastro autorizado.

## 19. Validação publicada das boas-vindas (07/11/2026)
- Implementação publicada e exercitada no site `https://mianota.lovable.app`, com sessão Master autorizada. Criado **TESTE AUTORIZADO BOAS-VINDAS 20261107 0229**, e-mail `admzapyer+teste-mianota-20261107-0229@gmail.com` (alias de teste da caixa autorizada), no plano **Gratuito**, sem checkout ou cobrança.
- Cadastro `af27d33f-a42a-40b7-a42d-dd84bcd76ff6` persistiu após recarregar; plano Gratuito e status trial confirmados no banco. Reserva e confirmação do envio registradas às 02:30 UTC.
- Boas-vindas enviadas automaticamente por `mianota@zapyertech.com`, mensagem `01a1b3d7-bdd4-7a44-be93-4ca03ec11d82`; eventos reais Enviado e Entregue recebidos no webhook e visíveis em Master E-mails após recarregar a página publicada. Nenhum erro JavaScript observado.
- Os dois cadastros anteriores continuam sem reserva ou envio de boas-vindas. Nenhum registro existente foi editado ou excluído, nenhuma chamada de IA ou cobrança realizada. Cadastro de teste preservado e claramente identificado.
- Plano do conteúdo deriva da assinatura Gratuito e link configurado no corpo é `https://mianota.lovable.app/entrar`. Consulta do corpo efetivamente armazenado no Resend retornou 401 porque a chave permite somente envio; leitura visual na caixa de entrada permanece não verificada. A entrega real foi confirmada pelo evento do provedor, não por leitura da caixa de entrada.

## 20. Limpeza exclusiva do teste de boas-vindas (07/11/2026)
- Removidos exclusivamente o cadastro **TESTE AUTORIZADO BOAS-VINDAS 20261107 0229**, sua conta de autenticação `admzapyer+teste-mianota-20261107-0229@gmail.com`, perfil, uso gratuito e vínculos de provisionamento, assinatura e etapas exclusivos do teste. Identidades e ausência de outros vínculos foram verificadas antes da remoção.
- Nenhuma referência remanescente aos identificadores do teste nos campos de empresa/usuário das tabelas públicas; cadastro e conta de autenticação ausentes. A interface Master confirmou a ausência do assinante.
- Histórico integral de eventos de e-mail preservado: resumo criptográfico `2ad64d2968acae6f036c5c13ac59aa0a` idêntico antes/depois, incluindo Enviado e Entregue da mensagem `01a1b3d7-bdd4-7a44-be93-4ca03ec11d82`, ainda visíveis no Master E-mails. Auditoria administrativa não removida.
- Os dois cadastros reais mantêm conteúdo integral idêntico antes/depois (`f4ecff99ae8bfe7524c47c282724af80`). Nenhum pagamento, envio de e-mail, alteração de código funcional ou migração realizada nesta limpeza.

## 21. Organização geral do código (07/11/2026)
- Nomes internos antigos "marcia" trocados por "mia": funções da conversa com a MIA (`useMiaFinanceChat`), notificações (`useMiaNotifications`), sincronização com Google Agenda (`syncMiaAppointmentToGoogle`), avisos internos entre telas (`mia:finance-updated`, `mia:notifications-changed`, `mia:request-install`), animações (`mia-float`, `mia-thinking` etc.) e imagem `mia-avatar-640.png`.
- **Preservados de propósito** para não perder dados: nomes das tabelas do banco (`marcia_*`), chave salva no aparelho do aviso de instalação, sal de criptografia das chaves de integração, prefixos de instâncias WhatsApp/idempotência já criadas e a limpeza de caches antigos no service worker.
- Removido o gerador de ícones antigo (`scripts/generate-pwa-icons.swift`), que referenciava arquivos inexistentes. Verificação de onboarding agora confere a página real `/app/mia`; `/app/marcia` segue apenas redirecionando.
- Busca por arquivos e imagens sem uso não encontrou outros itens órfãos.
- README reescrito para MIAnota (InfinitePay, Resend, estrutura de pastas); manual atualizado para MIA.
- Resultado: 227 testes passaram em 39 arquivos (1 ignorado historicamente) e as sete verificações de segurança passaram. Nenhum comportamento, preço, plano ou dado alterado.
- Divisão dos arquivos grandes concluída na seção 22.

## 22. Divisão de Notificações, Planos e comandos da MIA (07/11/2026)
- **Comandos financeiros da MIA** (969 linhas → 3 arquivos): `finance-command-rules.ts` (regras puras: limpar resposta da IA, juntar respostas, ligar categorias/contas, o que perguntar, prévia, histórico), `finance-command.server.ts` (acesso, contexto real, IA, resumo, gravação) e `finance-command.functions.ts` (só as entradas chamadas pelo app). Mesmo fluxo: nada é salvo sem confirmação; trava contra clique duplo e reaproveitamento por pedido mantidos.
- **Notificações** (947 → 271 linhas na página): dados em `use-notification-inbox.ts`, regras em `notification-center-rules.ts` e peças em `src/components/notifications/` (aviso, cartão de push, preferências, relatório mensal).
- **Master → Planos** (988 → 156 linhas na página): regras do formulário em `src/lib/billing/plan-form-rules.ts` e peças em `src/components/master/plans/` (cartão, editor, catálogo Stripe, campo). O catálogo Stripe agora carrega ao aparecer, em vez de em dois pontos separados.
- Comentários adicionados nas regras não óbvias: preço único por plano (InfinitePay reconhece pelo valor), soma única por conta no resumo semanal, adiamento de conta atrasada, trava otimista de execução, idempotência por pedido, estorno de crédito de IA.
- **Preservados:** tabelas `marcia_*`, preferências salvas, assinaturas de push, integrações Stripe/InfinitePay/WhatsApp e todas as mensagens exibidas.
- **Novos testes (20):** `finance-command-rules`, `notification-center-rules` e `plan-form-rules` (inclui Plano 1 R$ 29,90 e Plano 2 R$ 49,90, preço duplicado, plano grátis). Total: 247 testes passaram em 42 arquivos; sete verificações de segurança ajustadas aos novos arquivos e aprovadas; compilação sem erros.

## 23. Cookies e consentimento (LGPD) (10/11/2026)

**Como funciona**
- O aviso aparece em qualquer página enquanto não houver escolha válida, com **Aceitar todos**, **Rejeitar opcionais** e **Personalizar**. Rolar, navegar ou fechar o aviso não grava nada e não equivale a aceite.
- A escolha é registrada no navegador em `mia-cookie-consent`: categorias ligadas, data da decisão, versão da política (`CONSENT_POLICY_VERSION`) e validade de 365 dias. Sem dados pessoais, financeiros, mensagens, senhas ou chaves.
- Registro ausente, malformado, de outra versão da política ou vencido faz o aviso voltar; subir a versão da política pede nova escolha em todos os aparelhos.
- Gravações opcionais passam por `setPreference` (só escreve com a categoria ligada) e leituras por `hasConsent`; o cookie do menu lateral é escrito só com autorização. Scripts de análise/marketing entram por `loadOptionalScript`, que espera a autorização chegar.
- Revogar apaga na hora os itens de "Preferências" (tema, menu recolhido, filtro de conversas, aviso de instalação, cookie `sidebar_state`) e, se alguma ferramenta de análise/marketing existir, os cookies dela quando a categoria estiver desligada. A sessão de login e o próprio registro de consentimento não são tocados.

**Categorias**

| Categoria | Padrão | O que guarda |
|---|---|---|
| Essenciais | sempre ativos (não desligáveis) | sessões de assinante e Master, registro da escolha de cookies, cache público da marca, service worker e notificações ativadas |
| Preferências | desligado | tema claro/escuro, menu lateral recolhido, filtro da tela de conversas, aviso de instalação do app |
| Análise | desligado | nenhuma ferramenta em uso no momento |
| Marketing | desligado | nenhuma ferramenta em uso no momento |

**Pontos de acesso às preferências**
- Aviso de cookies, fixo no rodapé da tela, em qualquer página (montado uma vez em `__root.tsx`);
- **Preferências de cookies** no rodapé da página inicial, ao lado do link "Política de Cookies";
- **Configurações → Privacidade** no app do assinante;
- Página **/politica-de-cookies** (tabela com fornecedor, finalidade, categoria e duração de cada item), que também abre a central;
- A rota **/privacidade** aponta para a Política de Cookies.

**Arquivos e verificação**
- Regras puras em `src/lib/common/consent-rules.ts`, funções do navegador em `src/lib/common/consent.ts`, aviso e central em `src/components/consent/cookie-consent.tsx`, página em `src/routes/politica-de-cookies.tsx`.
- Cinco testes em `tests/consent-rules.test.ts` (validade, expiração, versão, bloqueio e registro padrão). No navegador: o aviso continua após rolar, rejeitar persiste ao recarregar, "Personalizar" salva só o que foi ligado, revogar apaga o tema e nenhuma requisição de análise/marketing é disparada.
- Pendente do responsável: razão social, CNPJ e e-mail do encarregado de dados (DPO), marcados na seção 5 da política.

## 24. Pausa automática da IA e Saúde do sistema (18/11/2026)
- **Pausa automática do provedor de IA**: depois de 3 falhas seguidas do provedor próprio (OpenRouter, OpenAI, Anthropic ou Gemini), a MIA passa 5 minutos respondendo direto pela Lovable AI, sem esperar o tempo limite a cada mensagem. Depois tenta de novo; uma resposta certa ou uma nova ativação no Master encerra a pausa.
- **Saúde do sistema (Master → Visão geral)**: cartão com o estado do provedor de IA, comandos da MIA com erro (24h), mensagens do WhatsApp travadas, avisos de pagamento com erro (7 dias), envios automáticos com erro e webhooks com erro (24h). Só leitura e só para o Super Admin.
- **Prévia de compartilhamento** mais leve (≈330 KB) para o WhatsApp exibir a imagem.
- Testes: `tests/ai-circuit-rules.test.ts` e `tests/system-health-rules.test.ts`.

## 25. Organização do painel financeiro, movimentações e funções do Master (18/11/2026)

Divisão em arquivos menores, sem mudar comportamento, dados ou integrações.

- **Painel financeiro:** `src/components/finance/finance-overview.tsx` (816 → 240 linhas) virou composição; blocos em `src/components/finance/overview/` (`overview-cards`, `overview-planning`, `overview-charts`, `overview-lists`, `overview-shared`). `money` e os tipos continuam exportados do arquivo original.
- **Movimentações:** `src/components/finance/transactions-view.tsx` (737 → 379 linhas); peças em `src/components/finance/transactions/` (`tx-constants`, `tx-parts`, `edit-dialog`). Formatação de datas do extrato passou para `formatTxDate`/`formatTxDayHeader` em `src/lib/finance/transactions-rules.ts`.
- **Funções do Master:** `src/lib/master/master.functions.ts` (1017 linhas) agora só reexporta de `master-kpis`, `master-companies`, `master-plans` e `master-admins` (`*.functions.ts`); a checagem de Super Admin está em `master-guards.ts`.
- **Testes:** novo `tests/transactions-format-rules.test.ts` (Hoje/Ontem, inclusive na virada do mês). 265 testes passando em 46 arquivos.
- **Verificado no navegador:** Visão do mês e Movimentações (assinante) e Visão geral, Assinantes e Planos (Master), no computador e no celular, temas claro e escuro, sem erros.

## 26. Alerta de carregamento ao abrir áreas protegidas sem sessão (18/11/2026)

- **Causa:** abrir direto `/master/*` ou `/app/*` sem sessão fazia o redirecionamento para o login acontecer no meio da primeira montagem; o roteador perdia a tela em montagem (`reading 'routeId'`) e o React refazia a página inteira. Não dependia do tema.
- **Correção:** `src/lib/common/hydration-gate.ts` (`guardAfterHydration` + `markHydrated` na raiz). Na primeira carga, redirecionamentos das guardas esperam a página hidratar (teto de 1,5 s); depois seguem imediatos. Regras e destinos de acesso não mudaram.
- **Verificado:** sem sessão (Master e Assinante, computador/celular, claro/escuro) chega ao login sem erros; com sessão, Master e Assinante carregam sem erros. Testes e `verify-auth-realms` ok.

## 27. Visão geral do Master em partes menores (18/11/2026)

- `src/routes/master/painel.tsx` (588 → 116 linhas) só carrega os dados e monta os cartões na mesma ordem.
- Cartões em `src/components/master/overview/`: `overview-header`, `setup-progress-card`, `overview-metrics`, `signups-chart-card`, `attention-card`, `recent-companies-card`, `quick-actions-card`, peças em `overview-parts` e tipos em `overview-types`.
- Regras puras em `src/lib/master/overview-rules.ts` (atalhos de período, datas, rótulos, % de conversão), testadas em `tests/master-overview-rules.test.ts`.
- Verificado como Super Admin no computador e no celular, claro e escuro; troca de período (7d, 1 ano) e de data atualiza o gráfico, sem erros.

## 28. Remoção da integração com Stripe (18/11/2026)

- **Regra:** a InfinitePay é a única integração de pagamento. Links externos (Kiwify, Cakto, PerfectPay) continuam aceitos, por escolha do proprietário.
- **Removido:** checkout Stripe do assinante, webhook `/api/public/stripe-webhook`, catálogo de preços Stripe no editor de planos, cartão "Stripe integrado" em Master → Pagamentos, credenciais e teste de conexão do Stripe, filtro "stripe" em Configurações e o script `verify-stripe-catalog.mjs`.
- **Planos:** todo plano pago usa o campo "Link de Checkout InfinitePay"; a conferência "Prontos para cobrar" e o progresso de implantação passam a olhar só esse link.
- **Dados preservados:** nenhum plano nem cobrança usava Stripe; as colunas/tabelas antigas `stripe_*` continuam no banco, vazias e sem uso, para não apagar nada.
- **Verificação:** testes automáticos passaram (268) e as telas Master → Pagamentos e Master → Planos foram abertas logado.

## 29. Refatoração por etapas — etapas 1 e 2 (19/11/2026)

- **Verificação de Super Admin única:** as 11 cópias espalhadas foram trocadas por `assertSuperAdmin` em `src/lib/master/master-guards.ts`. Mensagem igual em todo o Master; o erro técnico do banco fica só no registro do servidor. Testado em `tests/master-guards.test.ts`.
- **Falhas visíveis:** consultas auxiliares da Evolution e os selos de crédito agora registram a falha em vez de ignorá-la. Em Assinantes, o aviso de senha temporária só diz "(copiada)" quando a cópia realmente aconteceu.
- **Próximas etapas:** listas com "Carregar mais", divisão dos arquivos grandes, carregamento antes de abrir a tela, tipagem e documentação (ver roadmap.md).

## 30. Refatoração por etapas — etapa 3: listas com "Carregar mais" (19/11/2026)

Nenhuma lista corta mais registros em silêncio. Cada uma mostra "Mostrando X de Y" com o total real do banco e um botão **Carregar mais** enquanto houver itens.

| Tela | Antes | Agora |
| --- | --- | --- |
| Master → Conversas | até 250 conversas; só as 500 mensagens **mais antigas** (as novas sumiam em conversas longas); contadores contavam só o que estava carregado | 30 conversas por vez; filtros e busca (inclusive nome/e-mail do assinante) feitos no servidor; abre nas 100 mensagens mais recentes com **Mensagens anteriores**; contadores contam todas as conversas |
| Master → Assinantes | páginas Anterior/Próxima; cartões do topo liam no máximo 1000 empresas; "Atividade" podia faltar | 20 por vez com **Carregar mais**; cartões contados direto no banco; última movimentação lida por assinante |
| Master → Leads | leitura única limitada a 1000 leads/tarefas | todos os leads e tarefas lidos em blocos (métricas e regras automáticas completas); colunas mostram 30 cartões e a lista 50, cada uma com **Carregar mais** |
| Master → Acesso e segurança | avisos de pagamento e registro limitados a 200; resumo e filtros só sobre o que estava carregado | 50 por vez; filtros (plataforma, status, e-mail, tipo de ação) e resumos (hoje, processados, erros, último aviso) contados no banco inteiro; "Ações registradas" mostra sempre o total geral |
| Assinante → Configurações → Privacidade | 200 atividades, grupos filtrados no navegador | 20 por vez, grupo (Acessos, Lançamentos e dados, Conta e plano) filtrado no servidor com a mesma regra |

Também corrigido: no celular, "voltar" na conversa não reabre mais sozinha a primeira conversa a cada 8 segundos; abrir outra conversa desce até a última mensagem; aviso de estrutura de página em Leads; a lista de conversas no celular cortava o texto à direita; em Leads (computador) os botões Atualizar/CSV/Novo Lead e o cartão Receita convertida ficavam fora da tela; a busca de Assinantes saía da tela no celular.

**Como funciona:** regra comum em `src/lib/common/pagination-rules.ts` (janela que cresce, blocos de até 1000 linhas, total real, busca segura). Testes: `tests/pagination-rules.test.ts` e `tests/audit-group-filter.test.ts` (o filtro do banco escolhe exatamente o mesmo grupo de antes).

**Conferido no navegador** (Super Admin, computador e celular): totais iguais aos do banco — 2 conversas, 225 mensagens (100 → 200 → 225), 3 assinantes, 1 lead, 17 ações (5 de `plan.update`), 1 aviso de pagamento. Com páginas simuladas menores, Conversas (1 → 2), Assinantes (1 → 2 → 3) e Registro (5 → 10 → 15 → 17) carregaram corretamente. O histórico do assinante não tem atividades gravadas hoje; os quatro filtros responderam sem erro.

## 31. Refatoração por etapas — etapa 4, parte 1: painel financeiro (19/11/2026)

- `src/lib/finance/finance-dashboard.functions.ts` passou de 888 para 497 linhas, sem mudar nenhum resultado:
  - **`finance-dashboard-rules.ts`** (novo): todos os cálculos — saldo, entrou/saiu, a receber/a pagar, sobra prevista, maiores categorias, evolução por dia, orçamentos, metas, dica da MIA e a expansão das contas recorrentes do Planejamento.
  - **`finance-dashboard-types.ts`** (novo): os formatos usados pelas telas (as telas continuam importando do arquivo antigo).
  - O arquivo de funções ficou só com a leitura do banco e as permissões.
- Testes novos em `tests/finance-dashboard-rules.test.ts` (totais, categoria líder, orçamento acima de 100%, meta limitada a 100%, recorrência sem repetir data já lançada).
- **Conferido no navegador** (visualização de um assinante real, sem gravar nada), computador e celular, tema claro e escuro: Início, Movimentações, Planejamento e MIA mostram Entrou R$ 719,74 e Saiu R$ 1.388,48 em novembro — os mesmos valores somados direto no banco.

## 32. Refatoração por etapas — etapa 4, parte 2: WhatsApp financeiro (19/11/2026)

- `src/lib/finance/finance-whatsapp.server.ts` (726 linhas) virou quatro partes, sem mudar o comportamento:
  - **`finance-whatsapp-rules.ts`**: regras puras — leitura do JSON da IA, rascunho, categorias/contas reais, o que falta perguntar, prévia, VINCULAR/CONFIRMAR/CANCELAR e o texto do resumo.
  - **`finance-whatsapp-ai.server.ts`**: a leitura da mensagem/comprovante pela IA.
  - **`finance-whatsapp-actions.server.ts`**: banco — plano com o recurso, categorias/contas, resumo e gravação do pedido confirmado (sem gravar duas vezes).
  - **`finance-whatsapp.server.ts`** (261 linhas): só o fluxo da mensagem, com o passo a passo comentado no topo.
- **Comparação antes/depois:** 14 situações simuladas (vincular ok/vencido, sem plano, celular não vinculado, cancelar, confirmar, sem créditos, pergunta de pagamento, prévia, conta a pagar, resumo, falha da IA com devolução do crédito) deram exatamente as mesmas respostas e as mesmas leituras/gravações nas duas versões.
- Testes permanentes em `tests/finance-whatsapp-rules.test.ts`.
- Tela WhatsApp do assinante conferida no computador e no celular, claro e escuro. Corrigido no tema escuro: o topo da tela ficava branco com o título quase invisível, o aviso "Dados separados por conta" ficava cinza e o item "Falar com MIA" do menu clareava.
- **Achado (não alterado):** responder só com o número da lista de formas de pagamento (ex.: "1") não é aceito; a MIA repete a pergunta. Responder com o nome (PIX, cartão…) funciona. Decisão do responsável: manter assim (só pelo nome).
