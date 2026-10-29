ALTER TABLE public.marcia_notification ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.marcia_notification ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
CREATE INDEX IF NOT EXISTS marcia_notification_inbox_idx ON public.marcia_notification (recipient_user_id, company_id, created_at DESC) WHERE archived_at IS NULL;

CREATE POLICY marcia_notification_recipient_delete ON public.marcia_notification FOR DELETE TO authenticated
USING (recipient_user_id = auth.uid() AND public.has_company_access(company_id));
GRANT DELETE ON public.marcia_notification TO authenticated;

CREATE TABLE public.notification_preference (
  user_id uuid PRIMARY KEY,
  push_categories text[] NOT NULL DEFAULT ARRAY['finance','budget','agenda','system']::text[],
  quiet_start smallint CHECK (quiet_start BETWEEN 0 AND 23),
  quiet_end smallint CHECK (quiet_end BETWEEN 0 AND 23),
  reminder_lead_days smallint NOT NULL DEFAULT 3 CHECK (reminder_lead_days IN (0,1,3)),
  daily_summary boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_preference TO authenticated;
GRANT ALL ON public.notification_preference TO service_role;
ALTER TABLE public.notification_preference ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_preference_own ON public.notification_preference FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());