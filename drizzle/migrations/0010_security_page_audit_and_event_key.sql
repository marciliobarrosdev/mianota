ALTER TABLE public.billing_event_log ADD COLUMN IF NOT EXISTS event_key text;
CREATE UNIQUE INDEX IF NOT EXISTS billing_event_log_event_key_uidx ON public.billing_event_log (event_key) WHERE event_key IS NOT NULL;

CREATE TABLE public.master_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.master_audit_log TO authenticated;
GRANT ALL ON public.master_audit_log TO service_role;
ALTER TABLE public.master_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read master audit" ON public.master_audit_log
  FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE INDEX master_audit_log_created_idx ON public.master_audit_log (created_at DESC);