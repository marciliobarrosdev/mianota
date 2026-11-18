ALTER TABLE public.ai_provider_config
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paused_until timestamptz;