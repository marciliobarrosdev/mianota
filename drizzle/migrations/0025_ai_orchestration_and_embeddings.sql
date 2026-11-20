-- 0025_ai_orchestration_and_embeddings.sql
-- Habilita extensão pgvector, expande catálogo para os 6 provedores, adiciona orquestrador com fallback e tabela de embeddings

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Expansão de ai_provider_config para fallback de LLM, embeddings e transcrição
ALTER TABLE public.ai_provider_config DROP CONSTRAINT IF EXISTS ai_provider_config_mode_check;
ALTER TABLE public.ai_provider_config ADD CONSTRAINT ai_provider_config_mode_check 
  CHECK (mode = ANY (ARRAY['gemini','openrouter','deepseek','xai','openai','anthropic','lovable']));

ALTER TABLE public.ai_provider_config ADD COLUMN IF NOT EXISTS fallback_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.ai_provider_config ADD COLUMN IF NOT EXISTS fallback_mode text;
ALTER TABLE public.ai_provider_config ADD COLUMN IF NOT EXISTS fallback_model text;
ALTER TABLE public.ai_provider_config ADD COLUMN IF NOT EXISTS embedding_provider text NOT NULL DEFAULT 'gemini';
ALTER TABLE public.ai_provider_config ADD COLUMN IF NOT EXISTS embedding_model text NOT NULL DEFAULT 'gemini-embedding-2';
ALTER TABLE public.ai_provider_config ADD COLUMN IF NOT EXISTS embedding_dimension integer NOT NULL DEFAULT 768;
ALTER TABLE public.ai_provider_config ADD COLUMN IF NOT EXISTS embedding_fallback_provider text;
ALTER TABLE public.ai_provider_config ADD COLUMN IF NOT EXISTS embedding_fallback_model text;
ALTER TABLE public.ai_provider_config ADD COLUMN IF NOT EXISTS embedding_fallback_dimension integer;
ALTER TABLE public.ai_provider_config ADD COLUMN IF NOT EXISTS media_transcription_provider text DEFAULT 'gemini';
ALTER TABLE public.ai_provider_config ADD COLUMN IF NOT EXISTS media_transcription_model text DEFAULT 'gemini-3.8-flash';

-- 2. Expansão de ai_model_catalog para suportar todos os 6 provedores e tipos LLM / Embedding
ALTER TABLE public.ai_model_catalog DROP CONSTRAINT IF EXISTS ai_model_catalog_provider_check;
ALTER TABLE public.ai_model_catalog ADD CONSTRAINT ai_model_catalog_provider_check 
  CHECK (provider = ANY (ARRAY['gemini','openrouter','deepseek','xai','openai','anthropic']));

ALTER TABLE public.ai_model_catalog ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'llm';
ALTER TABLE public.ai_model_catalog DROP CONSTRAINT IF EXISTS ai_model_catalog_kind_check;
ALTER TABLE public.ai_model_catalog ADD CONSTRAINT ai_model_catalog_kind_check 
  CHECK (kind = ANY (ARRAY['llm','embedding']));

ALTER TABLE public.ai_model_catalog ADD COLUMN IF NOT EXISTS supports_structured boolean NOT NULL DEFAULT true;
ALTER TABLE public.ai_model_catalog ADD COLUMN IF NOT EXISTS supports_vectors boolean NOT NULL DEFAULT false;
ALTER TABLE public.ai_model_catalog ADD COLUMN IF NOT EXISTS supported_dimensions integer[];

-- 3. Inserção / atualização do catálogo oficial dos 6 provedores
INSERT INTO public.ai_model_catalog (provider, model_id, label, kind, supports_vision, supports_pdf, supports_audio, supports_structured, supports_vectors, supported_dimensions, sort)
VALUES
  -- Google Gemini (Direto)
  ('gemini', 'gemini-3.8-flash', 'Gemini 3.8 Flash (Padrão)', 'llm', true, true, true, true, false, NULL, 1),
  ('gemini', 'gemini-3.6-flash', 'Gemini 3.6 Flash', 'llm', true, true, true, true, false, NULL, 2),
  ('gemini', 'gemini-3.5-flash-lite', 'Gemini 3.5 Flash Lite', 'llm', true, true, true, true, false, NULL, 3),
  ('gemini', 'gemini-3.1-pro-preview', 'Gemini 3.1 Pro', 'llm', true, true, true, true, false, NULL, 4),
  ('gemini', 'gemini-embedding-2', 'Gemini Embedding 2 (Padrão)', 'embedding', false, false, false, false, true, ARRAY[768], 10),
  ('gemini', 'text-embedding-004', 'Gemini Text Embedding 004', 'embedding', false, false, false, false, true, ARRAY[768], 11),

  -- OpenRouter
  ('openrouter', 'google/gemini-3.8-flash', 'Gemini 3.8 Flash (OpenRouter)', 'llm', true, true, true, true, false, NULL, 1),
  ('openrouter', 'anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet (OpenRouter)', 'llm', true, true, false, true, false, NULL, 2),
  ('openrouter', 'deepseek/deepseek-chat', 'DeepSeek Chat (OpenRouter)', 'llm', false, false, false, true, false, NULL, 3),
  ('openrouter', 'meta-llama/llama-3.3-70b-instruct', 'Llama 3.3 70B (OpenRouter)', 'llm', false, false, false, true, false, NULL, 4),
  ('openrouter', 'google/gemini-embedding-2', 'Gemini Embedding 2 (OpenRouter)', 'embedding', false, false, false, false, true, ARRAY[768], 10),
  ('openrouter', 'mongodb/voyage-4', 'Voyage 4 (OpenRouter)', 'embedding', false, false, false, false, true, ARRAY[1024], 11),
  ('openrouter', 'mongodb/voyage-4-large', 'Voyage 4 Large (OpenRouter)', 'embedding', false, false, false, false, true, ARRAY[1536], 12),

  -- DeepSeek
  ('deepseek', 'deepseek-chat', 'DeepSeek Chat', 'llm', false, false, false, true, false, NULL, 1),
  ('deepseek', 'deepseek-reasoner', 'DeepSeek Reasoner (R1)', 'llm', false, false, false, true, false, NULL, 2),

  -- xAI / Grok
  ('xai', 'grok-4.7', 'Grok 4.7', 'llm', true, false, false, true, false, NULL, 1),
  ('xai', 'grok-2-1212', 'Grok 2', 'llm', true, false, false, true, false, NULL, 2),

  -- OpenAI
  ('openai', 'gpt-6-sol', 'GPT-6 Sol', 'llm', true, false, false, true, false, NULL, 1),
  ('openai', 'gpt-6-luna', 'GPT-6 Luna', 'llm', true, false, false, true, false, NULL, 2),
  ('openai', 'gpt-5-mini', 'GPT-5 Mini', 'llm', true, false, false, true, false, NULL, 3),
  ('openai', 'text-embedding-3-small', 'Text Embedding 3 Small', 'embedding', false, false, false, false, true, ARRAY[1536], 10),
  ('openai', 'text-embedding-3-large', 'Text Embedding 3 Large', 'embedding', false, false, false, false, true, ARRAY[3072], 11),

  -- Anthropic
  ('anthropic', 'claude-sonnet-5-5', 'Claude Sonnet 5.5', 'llm', true, true, false, true, false, NULL, 1),
  ('anthropic', 'claude-haiku-5-5', 'Claude Haiku 5.5', 'llm', true, true, false, true, false, NULL, 2)
ON CONFLICT (provider, model_id) DO UPDATE SET
  label = EXCLUDED.label,
  kind = EXCLUDED.kind,
  supports_vision = EXCLUDED.supports_vision,
  supports_pdf = EXCLUDED.supports_pdf,
  supports_audio = EXCLUDED.supports_audio,
  supports_structured = EXCLUDED.supports_structured,
  supports_vectors = EXCLUDED.supports_vectors,
  supported_dimensions = EXCLUDED.supported_dimensions,
  sort = EXCLUDED.sort,
  active = true;

-- 4. Tabela de Embeddings dos lançamentos financeiros (busca semântica com pgvector)
CREATE TABLE IF NOT EXISTS public.fin_lancamento_embedding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id uuid NOT NULL REFERENCES public.fin_lancamento(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  provider text NOT NULL,
  model text NOT NULL,
  dimension integer NOT NULL,
  index_version integer NOT NULL DEFAULT 1,
  is_primary boolean NOT NULL DEFAULT true,
  embedding vector NOT NULL,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fin_lancamento_embedding_unique UNIQUE (lancamento_id, provider, model)
);

CREATE INDEX IF NOT EXISTS idx_fin_lancamento_embedding_company ON public.fin_lancamento_embedding(company_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_fin_lancamento_embedding_model ON public.fin_lancamento_embedding(provider, model);

ALTER TABLE public.fin_lancamento_embedding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members view their embeddings" ON public.fin_lancamento_embedding;
CREATE POLICY "Company members view their embeddings" ON public.fin_lancamento_embedding
  FOR SELECT TO authenticated
  USING (public.has_company_access(company_id));

DROP POLICY IF EXISTS "Service role manages embeddings" ON public.fin_lancamento_embedding;
CREATE POLICY "Service role manages embeddings" ON public.fin_lancamento_embedding
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5. Tabela de Auditoria e Logs de Execução de IA (sem dados financeiros sensíveis)
CREATE TABLE IF NOT EXISTS public.ai_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.company(id) ON DELETE CASCADE,
  operation_id text NOT NULL,
  requested_provider text NOT NULL,
  requested_model text NOT NULL,
  effective_provider text NOT NULL,
  effective_model text NOT NULL,
  modality text NOT NULL DEFAULT 'text',
  duration_ms integer NOT NULL,
  tokens_prompt integer,
  tokens_completion integer,
  tokens_total integer,
  switch_reason text,
  attempts integer NOT NULL DEFAULT 1,
  status text NOT NULL,
  error_type text,
  error_message text,
  credits_charged integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_execution_log_company ON public.ai_execution_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_execution_log_op ON public.ai_execution_log(operation_id);

ALTER TABLE public.ai_execution_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins manage AI execution logs" ON public.ai_execution_log;
CREATE POLICY "Superadmins manage AI execution logs" ON public.ai_execution_log
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Service role logs AI executions" ON public.ai_execution_log;
CREATE POLICY "Service role logs AI executions" ON public.ai_execution_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 6. Migração suave de instâncias legadas com modo 'lovable' para 'gemini'
UPDATE public.ai_provider_config
SET 
  mode = 'gemini',
  model = COALESCE(model, 'gemini-3.8-flash'),
  embedding_provider = 'gemini',
  embedding_model = 'gemini-embedding-2',
  embedding_dimension = 768
WHERE mode = 'lovable';

-- 7. Função RPC para busca semântica em fin_lancamento com pgvector
CREATE OR REPLACE FUNCTION public.search_lancamentos_semantic(
  _company_id uuid,
  _query_vector text,
  _limit integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  descricao text,
  valor_cents bigint,
  tipo public.fin_tipo,
  status public.fin_status,
  competencia date,
  vencimento date,
  pago_em date,
  anexo_url text,
  observacao text,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    l.id,
    l.descricao,
    l.valor_cents,
    l.tipo,
    l.status,
    l.competencia,
    l.vencimento,
    l.pago_em,
    l.anexo_url,
    l.observacao,
    (1 - (e.embedding <=> _query_vector::vector)) AS similarity
  FROM public.fin_lancamento_embedding e
  JOIN public.fin_lancamento l ON l.id = e.lancamento_id
  WHERE e.company_id = _company_id
    AND l.company_id = _company_id
    AND l.status != 'cancelado'
    AND e.is_primary = true
  ORDER BY e.embedding <=> _query_vector::vector ASC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_lancamentos_semantic TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_lancamentos_semantic TO service_role;

