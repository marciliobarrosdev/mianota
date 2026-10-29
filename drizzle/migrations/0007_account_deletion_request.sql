CREATE TABLE public.account_deletion_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  email text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','canceled')),
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX account_deletion_request_one_pending ON public.account_deletion_request(user_id) WHERE status = 'pending';
GRANT SELECT, INSERT, UPDATE ON public.account_deletion_request TO authenticated;
GRANT ALL ON public.account_deletion_request TO service_role;
ALTER TABLE public.account_deletion_request ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deletion requests read" ON public.account_deletion_request FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own deletion requests insert" ON public.account_deletion_request FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "own deletion requests cancel" ON public.account_deletion_request FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'pending') WITH CHECK (user_id = auth.uid() AND status = 'canceled');