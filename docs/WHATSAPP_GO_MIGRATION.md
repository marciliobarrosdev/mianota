# Migração do WhatsApp: Evolution API → Go (whatsmeow)

Este documento descreve detalhadamente a arquitetura, operação, protocolo de identificadores, fluxos financeiros e procedimentos de cutover/rollback da substituição da Evolution API pelo microserviço nativo em **Go** utilizando a biblioteca **[whatsmeow](https://github.com/tulir/whatsmeow)** (`go.mau.fi/whatsmeow`) no **MIAnota**.

---

## 1. Visão Geral da Arquitetura

O serviço **WhatsApp-Go** (`services/whatsapp-go/`) opera como camada de conectividade de transporte com a rede WhatsApp Multi-Device:

- **Linguagem & Biblioteca**: Go com `go.mau.fi/whatsmeow`.
- **Persistência de Sessão**: PostgreSQL nativo via driver `sqlstore` do whatsmeow (`DATABASE_URL`), garantindo que conexões sobrevivam a reinicializações de container ou do servidor.
- **Painel Administrativo**:
  - Pareamento por QR Code: `/master/whatsapp-qr`
  - Central de Atendimento em tempo real: `/master/conversas`
  - Gestão de IA e Modelos: `/master/ia-creditos`
- **Backend Financeiro (Remix / TanStack Start)**:
  - Mantém 100% da inteligência financeira, categorização, saldo em centavos inteiros (`valor_cents`), fuso horário `America/Sao_Paulo` e controle de concorrência/idempotência.
  - A integração com **Resend** (e-mails transacionais e de boas-vindas) permanece preservada e inalterada.

---

## 2. Variáveis de Ambiente

### 2.1 Microserviço Go (`services/whatsapp-go`)
| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL para persistência de sessões (`sqlstore`) | `postgres://usuario:senha@aws-0-pooler.supabase.com:5432/postgres` |
| `PORT` | Porta HTTP exposta pelo serviço Go | `8085` |
| `WHATSAPP_GO_API_KEY` | Chave secreta de autenticação das chamadas internas | `mianota_whatsapp_go_secret_key` |
| `WEBHOOK_URL` | Endpoint no backend do MIAnota que recebe os eventos do WhatsApp | `http://localhost:8080/api/public/support-whatsapp-webhook?t=...` |
| `WEBHOOK_TOKEN` | Token secreto do webhook configurado no canal central | Token gerado em `platform_support_channel` |

### 2.2 Backend do MIAnota (`.env`)
| Variável | Valor Recomendado | Descrição |
|---|---|---|
| `WHATSAPP_PROVIDER` | `whatsmeow` | Seleciona whatsmeow e desativa chamadas para Evolution |
| `WHATSAPP_GO_URL` | `http://localhost:8085` (ou `http://whatsapp-go:8085`) | URL base do microserviço Go |
| `WHATSAPP_GO_API_KEY` | `mianota_whatsapp_go_secret_key` | Chave compartilhada com o serviço Go |
| `WHATSAPP_WEBHOOK_URL` | `http://localhost:8080/api/public/support-whatsapp-webhook?t=...` | URL registrada no canal central |
| `WHATSAPP_WEBHOOK_TOKEN` | `c15872bc-c40d-4be5-8f83-f1b823848d51` | Token de validação do canal central |

---

## 3. Protocolo de Identificadores WhatsApp: LID vs PN

### Por que essa distinção é obrigatória?
Com a introdução de contas corporativas e recursos de privacidade no WhatsApp, contatos podem interagir através de **LID (Linked Identity / JID oculto)** no formato `46832759623887@lid`, em vez do JID telefônico tradicional **PN (Phone Number)** `558796316081@s.whatsapp.net`.

### Problema Anterior (Causa do Erro do Usuário):
Se o sistema tentar enviar uma mensagem para um LID anexando `@s.whatsapp.net` (ex.: `46832759623887@s.whatsapp.net`), os servidores do WhatsApp rejeitam com o erro fatal:
> `recipient is not on WhatsApp: no LID found for 46832759623887@s.whatsapp.net from server`

### Regras Implementadas e Invariantes:
1. **Nunca concatenar `@s.whatsapp.net` a dígitos de LID**:
   - Dígitos de LID (14-15 dígitos numéricos sem código de país válido) são roteados para `types.HiddenUserServer` (`@lid`).
2. **Resolução de Destinatário (`resolveConversationRecipient`)**:
   - Se a conversa possui `pn_jid` válido (`@s.whatsapp.net`), prioriza o PN canônico.
   - Se o número de telefone armazenado for igual aos dígitos do LID ou nulo, despacha diretamente com `lid_jid` (`@lid`).
3. **Mapeamento de Loja (`GetAltJID`)**:
   - O microserviço whatsmeow consulta o catálogo local de identificadores alternativos (`inst.Client.Store.GetAltJID`) para resolver o par LID ↔ PN transparentemente.
4. **Interface Visual**:
   - `formatContactPhone(phone, lidJid)` nunca expõe os dígitos crus de um LID como se fossem telefone (exibe `"Número indisponível"` quando não há PN associado).

---

## 4. Suporte aos 4 Formatos de Entrada

1. **Texto Direto**:
   - Mensagens como *"Gastei R$ 85,90 no mercado hoje no pix"*.
   - A IA interpreta com centavos inteiros (`8590`), data no fuso de São Paulo (`America/Sao_Paulo`) e apresenta prévia para confirmação.
2. **Áudio / Mensagem de Voz**:
   - O áudio é baixado diretamente pelo whatsmeow e disponibilizado em base64 via `/chat/getBase64FromMediaMessage/`.
   - O webhook submete o áudio à transcrição (`transcribeAudioBase64`) e injeta o texto transcrito no fluxo da assistente MIA, com indicação de origem de áudio.
   - Se a transcrição falhar ou o áudio estiver corrompido, a MIA responde cordialmente solicitando reenvio ou texto, sem inventar valores.
3. **Imagem (Cupom / Comprovante)**:
   - Imagens são obtidas via `/chat/getBase64FromMediaMessage` e submetidas ao modelo multimodal com visão / OCR.
   - Ambiguidades (ex.: pagador vs recebedor em Pix) geram pergunta de esclarecimento e mantêm o saldo inalterado até a confirmação do usuário.
4. **PDF (Faturas / Extratos)**:
   - Documentos em PDF são processados identificando transações individuais.
   - O prompt e as regras garantem que o valor total da fatura **nunca** seja somado aos subitens individuais, evitando duplicidades.
   - **Proteção contra Injeção de Prompt**: instruções embutidas em comprovantes ou relatórios são tratadas estritamente como texto inerte.

---

## 5. Central de Atendimento (`/master/conversas`)

- **Tempo Real**: Mensagens recebidas do usuário, respostas automáticas da MIA, lembretes do sistema e mensagens do celular vinculado são sincronizadas instantaneamente.
- **Identificação de Celular Vinculado**: Mensagens enviadas pelo próprio celular do suporte (`fromMe: true`) aparecem identificadas como *"Celular vinculado"*, sem disparar comandos financeiros ou loops da IA.
- **Ações do Operador**: Assumir atendimento, Resolver conversa, Devolver à fila e Excluir conversa.
- **Tipos de Mídia no Envio**: Texto formatado, Gravação e prévia de áudio (PTT), Imagens, Vídeos, Documentos PDF e Envio nativo de Localização (Latitude/Longitude com nome de estabelecimento).

---

## 6. Procedimento de Ativação e Cutover (Virada para Produção)

1. **Subir o microserviço whatsmeow**:
   ```bash
   docker compose up -d whatsapp-go
   ```
2. **Verificar Conexão e Portas**:
   - Acessar `http://localhost:8085/instance/connectionState/central` e verificar status `"open"` ou `"connecting"`.
3. **Acessar `/master/whatsapp-qr`**:
   - Conectar o número comercial via leitura do QR Code.
   - A sessão é persistida automaticamente no banco PostgreSQL (`sqlstore`).
4. **Validar na Central `/master/conversas`**:
   - Enviar uma mensagem de teste do celular e confirmar chegada instantânea em tempo real.
   - Testar resposta manual pelo painel e confirmar entrega no destinatário.
5. **Desligar Evolution API**:
   - Parar containers da Evolution API (`docker compose stop evolution-api`).
   - Com `WHATSAPP_PROVIDER=whatsmeow`, nenhuma requisição ou dependência da Evolution é utilizada.

---

## 7. Procedimento de Rollback Seguro

Se durante a janela operacional for necessário retornar à Evolution API:
1. No arquivo `.env`, altere:
   ```env
   WHATSAPP_PROVIDER=evolution
   ```
2. Reinicie os serviços da aplicação:
   ```bash
   docker compose restart app
   ```
3. O sistema retoma imediatamente o uso das credenciais e rotas da Evolution API configuradas no banco (`platform_integration_secret`), sem perda de dados históricos, conversas, lançamentos ou contatos cadastrados.

---

## 8. Testes de Aceitação Automatizados (Cenários A a I)

A suíte de testes em `tests/whatsapp-acceptance-scenarios.test.ts` valida todos os 9 cenários de ponta a ponta:
- **Cenário A**: Lançamento por texto estruturado com valor exato em centavos.
- **Cenário B**: Lançamento por voz calculando a data de ontem no fuso de São Paulo.
- **Cenário C**: Imagem ambígua gera rascunho com campo pendente e não grava lançamento precipitado.
- **Cenário D**: Fatura com múltiplos itens não duplica total com subitens.
- **Cenário E**: Troca dinâmica de modelo de IA sem reiniciar o sistema.
- **Cenário F**: Notificação proativa e continuidade do contexto pelo usuário.
- **Cenário G**: Atendimento pelo painel preserva identificador do destinatário (LID/PN) e não dispara comandos.
- **Cenário H**: Reenvio de webhook com mesmo ID não duplica lançamentos (idempotência).
- **Cenário I**: Isolamento estrito entre múltiplos assinantes e empresas.
