ALTER TABLE public.ai_provider_config DROP CONSTRAINT IF EXISTS ai_provider_config_mode_check;
ALTER TABLE public.ai_provider_config ADD CONSTRAINT ai_provider_config_mode_check CHECK (mode = ANY (ARRAY['lovable','openai','anthropic','openrouter','gemini']));
ALTER TABLE public.ai_provider_config ADD COLUMN IF NOT EXISTS last_test_ms integer;

CREATE TABLE public.ai_model_catalog (
  provider text NOT NULL CHECK (provider IN ('openrouter','gemini')),
  model_id text NOT NULL,
  label text NOT NULL,
  supports_vision boolean NOT NULL DEFAULT false,
  supports_pdf boolean NOT NULL DEFAULT false,
  supports_audio boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  PRIMARY KEY (provider, model_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_model_catalog TO authenticated;
GRANT ALL ON public.ai_model_catalog TO service_role;
ALTER TABLE public.ai_model_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage AI catalog" ON public.ai_model_catalog FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

INSERT INTO public.ai_model_catalog (provider, model_id, label, supports_vision, supports_pdf, supports_audio, sort) VALUES
 ('openrouter','meta/muse-spark-open','Meta Muse Spark Open',false,false,false,1),
 ('openrouter','qwen/qwen3.8-omni-flash','Qwen 3.8 Omni Flash',true,false,true,2),
 ('openrouter','xiaomi/mimo-v2.6-flash','Xiaomi MiMo v2.6 Flash',false,false,false,3),
 ('openrouter','xiaomi/mimo-v2.6-pro','Xiaomi MiMo v2.6 Pro',false,false,false,4),
 ('gemini','gemini-3.5-flash-lite','Gemini 3.5 Flash Lite',true,true,true,1),
 ('gemini','gemini-3.1-flash-lite','Gemini 3.1 Flash Lite',true,true,true,2),
 ('gemini','gemini-3.8-flash','Gemini 3.8 Flash',true,true,true,3),
 ('gemini','gemini-3.6-flash','Gemini 3.6 Flash',true,true,true,4);