# MIAnota — Registro de Novas Implementações

> "Sua assistente financeira na palma da mão." · Assistente: **MIA**
> Atualizado em 07/11/2026. Site: https://mianota.lovable.app

---

## 1. Estado atual do sistema

| Item | Situação |
|---|---|
| Compilação | Sem erros |
| Testes automáticos (07/11) | 206 passaram em 33 arquivos; uma verificação SQL histórica é ignorada explicitamente porque a migração original não foi copiada. Sete verificações de segurança passaram. |
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
