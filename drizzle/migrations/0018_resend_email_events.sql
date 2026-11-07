CREATE TABLE public.email_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  svix_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  message_id text,
  recipient text,
  subject text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_event_received_idx ON public.email_event (received_at DESC);
GRANT SELECT ON public.email_event TO authenticated;
GRANT ALL ON public.email_event TO service_role;
ALTER TABLE public.email_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin reads email events" ON public.email_event FOR SELECT TO authenticated USING (public.is_super_admin());

CREATE TABLE public.email_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  from_name text NOT NULL DEFAULT 'MIAnota',
  from_email text,
  reply_to text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.email_settings TO authenticated;
GRANT ALL ON public.email_settings TO service_role;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manages email settings" ON public.email_settings FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
INSERT INTO public.email_settings (id) VALUES (true) ON CONFLICT DO NOTHING;