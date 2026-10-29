ALTER TABLE public.notification_preference
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_categories text[] NOT NULL DEFAULT ARRAY['finance','budget','system']::text[],
  ADD COLUMN IF NOT EXISTS monthly_report boolean NOT NULL DEFAULT true;
ALTER TABLE public.marcia_notification
  ADD COLUMN IF NOT EXISTS whatsapp_status text,
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at timestamptz;