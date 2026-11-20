# Manual Completo de Implementações, Melhorias e Integrações do MIAnota

> **Documento de Referência Técnica e Operacional**  
> **Data de Atualização**: 20 de Novembro de 2026  
> **Status do Sistema**: 100% Operacional em Desenvolvimento e Homologação  
> **Suíte de Testes**: 56/56 arquivos aprovados (312 testes passando) | TypeScript: 0 erros

---

## Índice

1. [Visão Geral do MIAnota](#1-visão-geral-do-mianota)
2. [Substituição do WhatsApp: Evolution API → Go (whatsmeow)](#2-substituição-do-whatsapp-evolution-api--go-whatsmeow)
   - [2.1 Motivação e Arquitetura](#21-motivação-e-arquitetura)
   - [2.2 Estrutura do Microserviço em Go](#22-estrutura-do-microserviço-em-go)
   - [2.3 Persistência de Sessões com PostgreSQL (sqlstore)](#23-persistência-de-sessões-com-postgresql-sqlstore)
   - [2.4 Protocolo de Identificadores WhatsApp: LID vs PN](#24-protocolo-de-identificadores-whatsapp-lid-vs-pn)
   - [2.5 Fluxos Multimodais: Texto, Áudio, Imagem (OCR) e PDF](#25-fluxos-multimodais-texto-áudio-imagem-ocr-e-pdf)
   - [2.6 Painel de Conexão QR Code (/master/whatsapp-qr)](#26-painel-de-conexão-qr-code-masterwhatsapp-qr)
   - [2.7 Central de Atendimento (/master/conversas)](#27-central-de-atendimento-masterconversas)
   - [2.8 Docker Compose e Inicialização](#28-docker-compose-e-inicialização)
3. [Integração de E-mails com o Resend](#3-integração-de-e-mails-com-o-resend)
   - [3.1 Credenciais e Configuração](#31-credenciais-e-configuração)
   - [3.2 Painel de E-mails (/master/emails)](#32-painel-de-e-mails-masteremails)
   - [3.3 Webhooks de Entrega e Verificação Criptográfica](#33-webhooks-de-entrega-e-verificação-criptográfica)
   - [3.4 Boas-Vindas e Notificações de Cobrança](#34-boas-vindas-e-notificações-de-cobrança)
4. [Gateway de Pagamento Exclusivo: InfinitePay](#4-gateway-de-pagamento-exclusivo-infinitepay)
   - [4.1 Por que apenas InfinitePay?](#41-por-que-apenas-infinitepay)
   - [4.2 Remoção Completa de Kiwify, Cakto, PerfectPay e Stripe](#42-remoção-completa-de-kiwify-cakto-perfectpay-e-stripe)
   - [4.3 Fluxo de Pagamento e Verificação Atômica (payment_check)](#43-fluxo-de-pagamento-e-verificação-atômica-payment_check)
   - [4.4 Webhook de Cobrança (/api/public/billing/infinitepay)](#44-webhook-de-cobrança-apipublicbillinginfinitepay)
   - [4.5 Depreciação da Rota Legada de Webhook (/api/public/billing/webhook)](#45-depreciação-da-rota-legada-de-webhook-apipublicbillingwebhook)
5. [Inteligência Artificial e Atendimento Financeiro (MIA)](#5-inteligência-artificial-e-atendimento-financeiro-mia)
   - [5.1 Catálogo de Modelos e Seleção de Provedor](#51-catálogo-de-modelos-e-seleção-de-provedor)
   - [5.2 Regras Financeiras Rígidas](#52-regras-financeiras-rígidas)
   - [5.3 Proteção contra Injeção de Prompt e Respostas Confiáveis](#53-proteção-contra-injeção-de-prompt-e-respostas-confiáveis)
6. [Segurança, Isolamento de Sessões e Governança](#6-segurança-isolamento-de-sessões-e-governança)
   - [6.1 Real-Time Dual Auth (Assinante vs Master)](#61-real-time-dual-auth-assinante-vs-master)
   - [6.2 Criptografia de Chaves e Segredos de Integração](#62-criptografia-de-chaves-e-segredos-de-integração)
   - [6.3 Scripts de Verificação de Invariantes](#63-scripts-de-verificação-de-invariantes)
7. [Identidade Visual e Ativos de Marca](#7-identidade-visual-e-ativos-de-marca)
8. [Guia de Operação e Solução de Problemas (Troubleshooting)](#8-guia-de-operação-e-solução-de-problemas-troubleshooting)

---

## 1. Visão Geral do MIAnota

O **MIAnota** é uma plataforma SaaS de assistência e gestão financeira pessoal e empresarial orientada por Inteligência Artificial conversacional (MIA).

- **Frontend / Fullstack Framework**: React + TanStack Start (TypeScript), Vite, Tailwind CSS, Shadcn UI.
- **Backend de Dados & Autenticação**: Supabase (PostgreSQL, RLS, Edge Functions, Auth Realms).
- **Canais de Entrada**: WhatsApp (via microserviço nativo Go + whatsmeow), Web App e Notificações Push Web.
- **Comunicação Transacional**: Resend (API e Webhooks com assinatura).
- **Monetização e Cobrança**: InfinitePay (Checkout via links oficiais com reconciliação atômica por webhook seguro).

---

## 2. Substituição do WhatsApp: Evolution API → Go (whatsmeow)

### 2.1 Motivação e Arquitetura
Anteriormente, o sistema utilizava a Evolution API, que exigia uma infraestrutura Node.js externa, consumia memória excessiva e apresentava instabilidades no pareamento por QR Code e no mapeamento de identificadores LID/PN.

A nova arquitetura introduz um microserviço nativo em **Go**, posicionado em `services/whatsapp-go/`, utilizando a biblioteca oficial de alta performance **whatsmeow** (`go.mau.fi/whatsmeow`):

```
+-------------------------------------------------------------+
|                      Rede WhatsApp                          |
+-------------------------------------------------------------+
                              ▲
                              │ Conexão WebSocket Multi-Device
                              ▼
+-------------------------------------------------------------+
|        Serviço Go whatsmeow (Porta 8085)                    |
|        - Autenticação e Criptografia do WhatsApp            |
|        - Download de mídias (áudio, fotos, pdfs)            |
|        - Persistência de sessões no PostgreSQL (sqlstore)   |
|        - Resolução de LID vs PN                             |
+-------------------------------------------------------------+
                              ▲
                              │ HTTP / JSON (Porta 8085)
                              ▼
+-------------------------------------------------------------+
|        Backend MIAnota (TanStack Start / Remix)             |
|        - /api/public/support-whatsapp-webhook (Webhook)      |
|        - /master/whatsapp-qr (Pareamento e Estado)          |
|        - /master/conversas (Central de Atendimento)         |
|        - Inteligência Financeira e Agente MIA               |
+-------------------------------------------------------------+
```

### 2.2 Estrutura do Microserviço em Go

O código fonte está localizado em `services/whatsapp-go/`:
- `main.go`: Ponto de entrada do serviço HTTP, inicialização dos handlers, conexão com PostgreSQL e ciclo de vida do cliente whatsmeow.
- `go.mod` e `go.sum`: Dependências Go fixadas (`go.mau.fi/whatsmeow`, `github.com/lib/pq`, `google.golang.org/protobuf`).
- `whatsapp-go.exe` / `Dockerfile`: Executáveis para execução local nativa no Windows ou encapsulamento em container Docker Linux.

#### Variáveis de Ambiente Obrigatórias:
| Variável | Finalidade | Exemplo |
|---|---|---|
| `DATABASE_URL` | Conexão PostgreSQL para persistir sessões criptografadas | `postgres://user:pass@host:5432/postgres` |
| `PORT` | Porta de escuta HTTP da API do microserviço | `8085` |
| `WHATSAPP_GO_API_KEY` | Chave de segurança para proteger chamadas internas | `mianota_whatsapp_go_secret_key` |
| `WEBHOOK_URL` | URL de destino dos eventos enviados para o MIAnota | `http://localhost:8080/api/public/support-whatsapp-webhook?t=TOKEN` |
| `WEBHOOK_TOKEN` | Token de autenticação registrado no banco para o canal | UUID do canal central |

### 2.3 Persistência de Sessões com PostgreSQL (sqlstore)
O whatsmeow utiliza a tabela nativa `whatsmeow_device` no PostgreSQL do Supabase via `sqlstore.New("postgres", dbURL, nil)`:
- Ao reiniciar o microserviço Go, ele reconecta automaticamente sem exigir nova leitura de QR Code.
- A sessão sobrevive à recriação de containers Docker ou reinicializações do sistema operacional.
- O endpoint `/instance/connect` e o evento `Pairing` sincronizam o status e recuperam a chave de dispositivo registrada.

### 2.4 Protocolo de Identificadores WhatsApp: LID vs PN
Um dos maiores desafios resolvidos foi o erro clássico:
> `recipient is not on WhatsApp: no LID found for 46832759623887@s.whatsapp.net from server`

#### Causa Raiz:
O WhatsApp introduziu o **LID (Linked Identity)** para contas com privacidade ativada ou canais corporativos (identificador de 14-15 dígitos sem código de país válido). Ao anexar `@s.whatsapp.net` a esses números, os servidores da Meta rejeitavam a mensagem imediatamente.

#### Soluções Implementadas no MIAnota:
1. **Resolução de Destinatário (`resolveConversationRecipient`)**:
   - Se o contato possui um número de telefone canônico (`pn_jid`), o envio utiliza `user@s.whatsapp.net`.
   - Se os dígitos correspondem a um LID ou se não há PN associado, o envio é despachado estritamente para `user@lid` (`types.HiddenUserServer`).
2. **Consulta na Tabela de Mapeamento do whatsmeow (`GetAltJID`)**:
   - O microserviço Go consulta o mapa interno de identidades vinculadas da biblioteca para traduzir LID para PN e vice-versa de maneira transparente.
3. **Formatação Visual Segura (`formatContactPhone`)**:
   - A interface nunca renderiza dígitos brutos de LID como se fossem telefone (exibe `"Número indisponível"` quando não há número telefônico associado).

### 2.5 Fluxos Multimodais: Texto, Áudio, Imagem (OCR) e PDF
O sistema processa 4 formatos de dados pelo WhatsApp:
1. **Texto**: Lançamentos diretos como *"Gastei R$ 120 no posto no cartão de crédito"*.
2. **Áudio (Mensagens de Voz)**: O microserviço baixa a mídia criptografada do WhatsApp, disponibiliza em base64 via `/chat/getBase64FromMediaMessage/`, e o backend executa `transcribeAudioBase64`, submetendo a transcrição à assistente MIA.
3. **Imagem (Cupons Fiscais e Comprovantes Pix)**: Análise via visão computacional e OCR. Ambiguidades (ex.: saber se é envio ou recebimento) geram perguntas de confirmação sem alterar saldos previamente.
4. **Documentos PDF (Extratos e Faturas)**: O leitor extrai lançamentos individuais. A IA foi instruída a **nunca somar o total da fatura aos itens individuais**, evitando duplicidades financeiras.

### 2.6 Painel de Conexão QR Code (`/master/whatsapp-qr`)
Localizado em `src/components/master/whatsapp-setup.tsx` e `src/routes/master/whatsapp-qr.tsx`:
- Renderização do QR Code gerado pelo whatsmeow em tempo real.
- Status do serviço: Porta, Uptime, Dispositivo conectado (`pushName`, `JID`).
- Ações: Reconectar, Desconectar sessão e Atualizar estado.
- Resolução do erro visual de importação (`RadioTower`).

### 2.7 Central de Atendimento (`/master/conversas`)
Página completa de suporte multicanal em tempo real (`src/routes/master/conversas.tsx` e `src/components/master/conversas/`):
- **Lista de Conversas**: Foto, Nome, Telefone formatado, Tag de status (*Aguardando*, *Em atendimento*, *Resolvidas*), badge de não lidas e data/hora.
- **Identificação de Mensagens**:
  - Mensagens do cliente (Entrada).
  - Respostas automáticas da MIA financeira.
  - Mensagens manuais do operador humano.
  - Mensagens enviadas diretamente pelo celular do suporte (`fromMe: true`), identificadas com a tag *"Celular vinculado"*, sem disparar loops de IA.
- **Tipos de Mensagens Suportadas no Envio e Recebimento**:
  - Texto simples e formatado.
  - Gravação de áudio em tempo real pelo navegador (PTT) com prévia sonora antes do envio.
  - Envio de imagens, vídeos e arquivos PDF.
  - Compartilhamento de localização GPS (latitude, longitude e nome do local).
- **Gestão de Atendimento**:
  - "Assumir atendimento" (atribui ao atendente logado).
  - "Resolver conversa" (arquiva o ticket).
  - "Devolver à fila" (retorna para *Aguardando*).
  - "Excluir conversa".

### 2.8 Docker Compose e Inicialização
O arquivo `docker-compose.yml` foi padronizado para orquestrar o microserviço Go:

```yaml
services:
  whatsapp-go:
    build:
      context: ./services/whatsapp-go
      dockerfile: Dockerfile
    container_name: mianota-whatsapp-go
    restart: unless-stopped
    ports:
      - "8085:8085"
    environment:
      - DATABASE_URL=postgres://...
      - PORT=8085
      - WHATSAPP_GO_API_KEY=mianota_whatsapp_go_secret_key
      - WEBHOOK_URL=http://app:8080/api/public/support-whatsapp-webhook?t=...
      - WEBHOOK_TOKEN=...
```

Para subir em produção ou homologação:
```bash
docker compose up -d whatsapp-go
```

---

## 3. Integração de E-mails com o Resend

### 3.1 Credenciais e Configuração
A integração oficial de e-mails transacionais do MIAnota utiliza a infraestrutura da **Resend**:

- **Conta Administradora**: `mbarrosdev13@gmail.com`
- **Chave de API (`RESEND_API_KEY`)**: Configurada no `.env` do backend
- **Segredo de Assinatura de Webhook (`RESEND_WEBHOOK_SIGNING_SECRET`)**: Configurado no `.env` do backend
- **Remetente Padrão**: `MIAnota <notificacoes@mianota.com.br>` (ou `onboarding@resend.dev` em modo de teste inicial).

As variáveis estão salvas no `.env` e criptografadas na tabela `platform_integration_secret`.

### 3.2 Painel de E-mails (`/master/emails`)
Interface em `src/routes/master/emails.tsx` permitindo:
- Diagnóstico em tempo real da conexão com a API do Resend.
- Envio imediato de e-mails de teste para validar entrega e template.
- Log de status e histórico de envios com badges de status (*sent*, *delivered*, *bounced*, *failed*).

### 3.3 Webhooks de Entrega e Verificação Criptográfica
O webhook em `src/routes/api/public/email-webhook.ts` processa eventos de entrega do Resend com validação via `svix` utilizando o `RESEND_WEBHOOK_SIGNING_SECRET`.
Eventos processados:
- `email.delivered`: Atualiza o status do e-mail para entregue.
- `email.bounced`: Marca rejeição na caixa de correio do destinatário.
- `email.complained`: Alerta de spam para isolar e proteger a reputação do domínio.

### 3.4 Boas-Vindas e Notificações de Cobrança
Implementado em `src/lib/email/welcome-email.server.ts` e `src/lib/email/resend.server.ts`:
- E-mails de boas-vindas disparados via `sendRegistrationWelcome` após o cadastro ou ativação de nova assinatura.
- **Idempotência Garantida**: Uma flag atômica na tabela de empresas impede que reloads ou repetições de webhook enviem múltiplos e-mails de boas-vindas para o mesmo usuário.

---

## 4. Gateway de Pagamento Exclusivo: InfinitePay

### 4.1 Por que apenas InfinitePay?
Para eliminar dispersão de taxas, inconsistências de reconciliação e custos adicionais com múltiplos gateways, o MIAnota consolidou a **InfinitePay** como seu gateway de pagamento único e oficial.

### 4.2 Remoção Completa de Kiwify, Cakto, PerfectPay e Stripe
Todas as plataformas anteriores foram completamente expurgadas do código e da interface:
- **Painel de Pagamentos (`/master/pagamentos`)**: Removido o card de "Links externos (Kiwify, Cakto, PerfectPay)".
- **Configurações Gerais (`/master/configuracoes`)**: Removidos os campos de Webhook Secret e Tokens das 3 plataformas. O filtro de eventos de cobrança aceita unicamente `infinitepay`.
- **Onboarding Master (`/master/onboarding`)**: Atualizados textos de suporte para referenciar unicamente aprovações da InfinitePay.
- **Banco de Dados**: Colunas legadas do Stripe e chaves históricas foram mantidas como inertes no banco para garantir compatibilidade retroativa, mas sem nenhum uso ou chamada ativa no código.

### 4.3 Fluxo de Pagamento e Verificação Atômica (payment_check)
O modelo de segurança da InfinitePay adotado pelo MIAnota opera de forma antifraude:
1. Cada plano possui seu link oficial gerado pela InfinitePay cadastrado em `/master/planos`.
2. Quando a InfinitePay notifica o pagamento, o backend **não confia cegamente** no payload recebido.
3. O servidor efetua uma requisição direta (`payment_check`) para os servidores da InfinitePay:
   `https://api.infinitepay.io/invoices/public/checkout/payment_check`
4. Apenas após a confirmação da InfinitePay com status de pago, o evento é processado pela rotina central `applyEvent` (`src/lib/billing/apply.server.ts`).

### 4.4 Webhook de Cobrança (`/api/public/billing/infinitepay`)
- Endpoint dedicado: `POST /api/public/billing/infinitepay`
- Mapeia o plano contratado pelo valor pago (centavos únicos por plano ativo).
- Vincula a assinatura à empresa através do e-mail do comprador.
- Atualiza permissões, status da assinatura para `active` e provisiona cotas da assistente MIA.

### 4.5 Depreciação da Rota Legada de Webhook (`/api/public/billing/webhook`)
A rota legada de webhook genérico foi mantida apenas para retornar `HTTP 410 (Gone)`:
```typescript
// src/routes/api/public/billing/webhook.ts
export const APIRoute = createAPIFileRoute("/api/public/billing/webhook")({
  POST: async () => {
    return json({
      error: "Legacy payment providers (Kiwify, Cakto, PerfectPay, Stripe) are discontinued. MIAnota exclusively supports InfinitePay via /api/public/billing/infinitepay."
    }, { status: 410 });
  }
});
```
Isso impede que tentativas antigas de webhooks externos gerem erros 500 ou poluam os logs do sistema.

---

## 5. Inteligência Artificial, Orquestração e Busca Semântica (MIA)

### 5.1 Substituição Completa do Lovable AI e Suporte a 6 Provedores Oficiais
A dependência de runtime do gateway Lovable AI foi completamente eliminada do sistema. O MIAnota agora conta com um orquestrador desacoplado (`src/lib/ai/ai-orchestrator.server.ts` e `ai-provider.server.ts`) com integração direta aos 6 principais provedores de ponta do mercado:

1. **Google Gemini (Direto)**: Modelo padrão da MIA (`gemini-3.8-flash`) via API oficial Google AI (`generativelanguage.googleapis.com`). Alto desempenho, raciocínio rápido e suporte multimodal nativo (texto, áudio, imagem e PDF).
2. **OpenRouter**: Roteador unificado para modelos abertos e proprietários (DeepSeek, Llama, Qwen, Claude, etc).
3. **DeepSeek**: Acesso direto à API da DeepSeek (`deepseek-chat`, `deepseek-reasoner`).
4. **xAI (Grok)**: API oficial Grok (`grok-2-latest`, `grok-beta`).
5. **OpenAI**: Modelos GPT-4o e GPT-4o-mini diretos.
6. **Anthropic**: Claude 3.5 Sonnet e Claude 3.5 Haiku diretos.

### 5.2 Orquestrador Resiliente com Fallback Automático e Circuit Breaker
- **Orquestração (`ai-orchestrator.server.ts`)**: Todo fluxo conversacional do app e do WhatsApp passa por `orchestratedAiChat`, que gerencia tentativas, controle de timeout e auditoria na tabela `ai_execution_log`.
- **Fallback Automático de LLM**: O superadministrador pode ativar o fallback em `/master/ia-creditos` e selecionar qualquer provedor/modelo secundário. Se o provedor principal responder com erro 429, 500, 503 ou sofrer timeout, a MIA comuta transparentemente para o fallback sem interromper o atendimento do assinante.
- **Circuit Breaker (`ai-circuit-rules.ts`)**: Monitora falhas consecutivas e pausa temporariamente provedores indisponíveis para evitar latência acumulada no WhatsApp.

### 5.3 Motor de Busca Semântica Vetorial (pgvector + Gemini Embedding 2)
Implementado via migração `0025_ai_orchestration_and_embeddings.sql` no Supabase:
- **Extensão PostgreSQL**: `vector` (pgvector v0.8.2 ativo).
- **Embedding Principal**: Google Gemini direto com o modelo `gemini-embedding-2` (dimensão 768). Suporta também OpenAI `text-embedding-3-small` e OpenRouter.
- **Tabela de Vetores (`fin_lancamento_embedding`)**: Armazena os vetores normalizados com hash de conteúdo (`content_hash`) para evitar re-indexações desnecessárias quando o lançamento não for modificado.
- **Função RPC (`search_lancamentos_semantic`)**: Executa cálculo de distância por cosseno (`<=>`) diretamente no banco de dados com limite de linhas e escopo por empresa (`company_id`).
- **Indexação em Segundo Plano**: Lançamentos criados pelo WhatsApp ou pelo app são indexados assincronamente sem bloquear a confirmação do usuário.
- **Fallback Transparente**: Se a busca vetorial falhar ou o provedor de embedding estiver fora do ar, o sistema comuta instantaneamente para busca textual SQL `ILIKE`.

### 5.4 Transcrição de Áudio Direta (Voz da MIA)
A transcrição de mensagens de áudio (`src/lib/ai/audio-transcribe.server.ts`) envia o áudio em formato inline base64 diretamente ao Google Gemini 3.8 Flash, que transcreve e pontua mensagens em português brasileiro (incluindo gírias e valores monetários informais). Áudios inaudíveis ou com ruído excessivo retornam de forma determinística `[áudio inaudível]`, impedindo que a IA invente transações fantasmas.

### 5.5 Regras Financeiras Rígidas e Concorrência
1. **Armazenamento de Valores**: Valores monetários são manipulados estritamente como **centavos inteiros** (`valor_cents`), prevenindo erros de arredondamento de ponto flutuante.
2. **Fuso Horário Obrigatório**: Todas as datas e filtros de período utilizam o fuso `America/Sao_Paulo` com limites de data `gte` e `lt` (inclusivo/exclusivo), prevenindo vazamento de contas futuras nos resumos de "hoje" e "este mês".
3. **Idempotência de Cobrança e Comandos**: Execuções vinculadas a `ai_command_id` e chaves de evento de cobrança previnem duplicidade de registros financeiros e estornos indevidos.
4. **Rollback de Divisão (Splits)**: Edições de divisão de categorias preservam o estado anterior e restauram os registros caso a nova inserção falhe.
5. **Chat em Tempo Real sem Race Conditions**: O painel `/master/conversas` implementa travas de submissão no envio (`isSubmittingRef`), preservação de rascunhos por conversa e descarte de requisições assíncronas defasadas com `reqSeqRef`.

---

## 6. Segurança, Isolamento de Sessões e Governança

### 6.1 Real-Time Dual Auth (Assinante vs Master)
O MIAnota possui duas personas que podem navegar no mesmo navegador simultaneamente sem colisão de cookies ou sessões:
- **Sessão do Assinante**: Utiliza a chave padrão de storage do Supabase para acessar `/entrar` e rotas `/app/*`.
- **Sessão do Administrador Master**: Utiliza uma chave dedicada (`superadminSupabase`, definida em `src/lib/auth/superadmin-client.ts`) para acessar `/superadmin` e `/master/*`.
- O script `scripts/verify-auth-realms.mjs` é executado na pipeline de build para validar que nenhum código do Master vaze para rotas de assinantes e vice-versa.

### 6.2 Criptografia de Chaves e Segredos de Integração
- Chaves de API (Resend, InfinitePay, Provedores de IA, WhatsApp) são armazenadas com criptografia **AES-256-GCM** na tabela `platform_integration_secret`.
- Apenas funções no servidor (`src/lib/common/integration-secrets.server.ts`) têm acesso de leitura. As chaves **nunca** são enviadas para o cliente/navegador em texto claro.

### 6.3 Scripts de Verificação de Invariantes
O projeto conta com comandos automatizados de verificação que devem ser rodados antes de qualquer deploy:
- `bun run test`: Executa os 56 arquivos de teste do Vitest.
- `bun run test:clone-security`: Executa a bateria de verificação de segurança:
  1. `scripts/verify-owner-routing.mjs` (Invariantes de roteamento de dono).
  2. `scripts/verify-auth-realms.mjs` (Isolamento de sessões auth).
  3. `scripts/verify-clone-brand-onboarding.mjs` (Ativos de marca e onboarding).
  4. `scripts/verify-service-onboarding.mjs` (Serviços e integrações).
  5. `scripts/verify-app-responsiveness.mjs` (Responsividade de telas).
  6. `scripts/verify-master-setup.mjs` (Checklist de configuração do Superadmin).

---

## 7. Identidade Visual e Ativos de Marca

Os arquivos de identidade da MIA e do MIAnota estão centralizados e padronizados:
- `public/favicon.png`: Favicon do navegador.
- `public/mianota-logo.png` / `public/mianota-logo-dark.png` / `public/mianota-logo-light.png`: Logotipos oficiais da marca.
- `public/mia-avatar.png` e `public/perfil-mia.png`: Avatar oficial da inteligência artificial MIA utilizado nos chats e no WhatsApp.
- Configuração central em `src/config/brand.ts`.

---

## 8. Guia de Operação e Solução de Problemas (Troubleshooting)

### Pergunta 1: Como reiniciar o serviço de WhatsApp Go em desenvolvimento?
```powershell
# Execução direta no terminal (PowerShell)
$env:DATABASE_URL="postgres://..."
$env:PORT="8085"
$env:WHATSAPP_GO_API_KEY="mianota_whatsapp_go_secret_key"
$env:WEBHOOK_URL="http://localhost:8080/api/public/support-whatsapp-webhook?t=..."
$env:WEBHOOK_TOKEN="..."
Set-Location "services\whatsapp-go"
.\whatsapp-go.exe
```
Ou via Docker:
```bash
docker compose restart whatsapp-go
```

### Pergunta 2: O que fazer se uma mensagem der erro de "no LID found"?
O sistema já possui a correção nativa via `resolveConversationRecipient` e `inst.Client.Store.GetAltJID`. Se ocorrer com um número específico, verifique se a conversa em `/master/conversas` possui o campo `lid_jid` preenchido. O sistema despachará automaticamente para `@lid`.

### Pergunta 3: Como testar se o envio de e-mail do Resend está funcionando?
1. Acesse o painel Master em `http://localhost:8080/master/emails`.
2. Insira um e-mail de destino no card de teste.
3. Clique em **"Enviar e-mail de teste"**.
4. Verifique a mensagem de sucesso com o `id` retornado pela API do Resend.

### Pergunta 4: Como simular uma confirmação de pagamento da InfinitePay?
Envie uma requisição POST para o webhook com o formato esperado da InfinitePay:
```bash
curl -X POST http://localhost:8080/api/public/billing/infinitepay \
  -H "Content-Type: application/json" \
  -d '{
    "event": "invoice.paid",
    "data": {
      "id": "inv_teste_123",
      "amount": 2990,
      "customer": {
        "email": "usuario@exemplo.com"
      }
    }
  }'
```

### Pergunta 5: Como rodar todos os testes para garantir integridade?
```bash
bun run test
bun run test:clone-security
npx tsc --noEmit
```
Todas as três checagens devem retornar sucesso com 0 erros.
