# OpenRouter e Google Gemini na página "IA e créditos"

## O que muda para você
A página `/master/ia-creditos` mantém o layout e o que já existe hoje (Lovable AI, OpenAI, Anthropic, modo otimizado, créditos). Ganha dois provedores novos:

- **OpenRouter**: meta/muse-spark-open, qwen/qwen3.8-omni-flash, xiaomi/mimo-v2.6-flash, xiaomi/mimo-v2.6-pro
- **Google Gemini (API direta)**: gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-3.8-flash, gemini-3.6-flash

Em cada provedor: campo protegido para inserir ou trocar a chave (depois de salva, aparece só mascarada, por exemplo `sk-or-…a1b2`). Também: lista de modelos e os botões **Salvar configuração**, **Testar conexão** e **Ativar modelo**.

No topo fica um cartão "Ativo agora: Provedor · Modelo", com o último teste (ok/erro, horário e tempo de resposta). Só o Super administrador do Master vê e altera essas opções.

Quando você ativa um modelo, a MIA passa a usá-lo na próxima mensagem, tanto no chat do app quanto no WhatsApp. Ela continua com o mesmo nome, a mesma personalidade, as mesmas regras e o mesmo histórico. Conversas e lançamentos continuam iguais. Só um provedor fica ativo por vez. Se o ativo falhar, a MIA usa o Lovable AI para a mensagem não ficar sem resposta, e o erro aparece no cartão.

Observação: alguns nomes de modelo pedidos podem não existir hoje na OpenRouter ou no Google. O botão "Testar conexão" faz uma chamada real e mostra o erro exato do provedor. Um modelo só pode ser ativado depois de passar no teste.

## Textos, imagens, PDFs e áudios
- Texto, imagem e PDF vão para o modelo ativo no formato que cada provedor aceita (Gemini recebe o arquivo direto; na OpenRouter, imagem e PDF seguem no formato padrão dela).
- Se o modelo ativo não lê imagem, PDF ou áudio, o sistema primeiro converte o conteúdo em texto (leitura do documento ou transcrição do áudio, como já fazemos hoje) e só então envia ao modelo.
- Os lançamentos continuam passando pela validação atual (valor, data, categoria e checagem de duplicidade). A MIA só confirma "lançado" depois que tudo está gravado.

## Créditos
Cada mensagem gasta crédito uma vez só, marcada pela identificação da mensagem. Se o sistema tentar de novo ou o provedor trocar no meio, não cobra outra vez. Se der erro e nada for salvo, o crédito volta, como já acontece hoje.

## Limites de tempo e erros
Limite de 45 segundos por chamada, com uma nova tentativa só em falhas temporárias. As mensagens de erro aparecem em português para quem está usando, e os detalhes técnicos ficam registrados no servidor.

---

## Detalhes técnicos
- **Catálogo no banco**: nova tabela `ai_model_catalog` (provider, model_id, label, supports_vision/pdf/audio, active), preenchida na migração com os 8 modelos. Inclui RLS só para leitura e escrita de super-admin. Em seguida, `AI_MODEL_OPTIONS` deixa de ser a fonte dos novos provedores, e o backend valida o modelo pelo catálogo.
- **Configuração única**: o check de `ai_provider_config.mode` passa a aceitar `openrouter` e `gemini`. Também ganha `last_test_at` e `last_test_ms`. A troca de provedor continua numa única linha (`id = true`).
- **Chaves**: `resolveIntegration("ai_openrouter" | "ai_gemini")` via `integration-secrets.server.ts` (AES-GCM). As server functions devolvem só `{configured, masked}`. Todas usam `requireSupabaseAuth`, verificação de super-admin e `writeMasterAudit`.
- **Adaptadores** em `ai-provider.server.ts`: `openRouterChat`, que chama `https://openrouter.ai/api/v1/chat/completions` com os cabeçalhos HTTP-Referer/X-Title, e `geminiChat`, que chama `generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key=` e converte mensagens e partes inline_data (imagem, PDF, áudio). `maybeByokChat` passa a despachar por modo. O ponto de entrada continua sendo `lovableAiChat`, então chat, WhatsApp, imagem, PDF e áudio herdam a troca sem mudar quem chama.
- **Conversão de mídia**: a regra pura `ai-media-rules.ts` decide entre enviar o arquivo direto ou converter antes em texto, usando a capacidade de cada modelo no catálogo. Para transcrever, reutiliza `audio-transcribe.server.ts`; para ler imagem e PDF, usa o Lovable AI.
- **Idempotência de crédito**: reutilizar a chave de débito por id de mensagem (WhatsApp `message_id` / chat `client_request_id`) no controle existente, com índice único se ainda não existir. Isso será verificado antes de mudar.
- **Timeout**: `fetchAiProvider` com AbortController de 45 s e uma nova tentativa em 429/5xx.
- **Testes (Vitest)**: conversão de mensagens para Gemini, validação de modelo pelo catálogo, decisão de mídia, máscara de chave, idempotência de débito e despacho por modo (com fetch simulado). As chamadas reais acontecem pelo "Testar conexão" quando as chaves forem salvas. Sem as suas chaves, eu não consigo testar as APIs reais.
- **Interface**: dois novos cartões de provedor em `ia-creditos.tsx`, no mesmo padrão dos de OpenAI e Anthropic, e o cartão "Ativo agora" no topo.
