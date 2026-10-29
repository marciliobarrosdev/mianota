CREATE TABLE public.free_plan_usage (
  email text PRIMARY KEY,
  user_id uuid,
  company_id uuid,
  plan_id uuid,
  source text NOT NULL DEFAULT 'master',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.free_plan_usage TO service_role;
ALTER TABLE public.free_plan_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read free plan usage" ON public.free_plan_usage FOR SELECT TO authenticated USING (public.is_super_admin());
GRANT SELECT ON public.free_plan_usage TO authenticated;
CREATE INDEX free_plan_usage_user_idx ON public.free_plan_usage(user_id);

-- Backfill: accounts already on a free plan count as having used it.
INSERT INTO public.free_plan_usage (email, user_id, company_id, plan_id, source)
SELECT DISTINCT ON (lower(u.email)) lower(u.email), u.id, s.company_id, s.plan_id, 'backfill'
FROM public.subscription s
JOIN public.plan p ON p.id = s.plan_id AND p.is_free
JOIN public.company_user cu ON cu.company_id = s.company_id AND cu.role = 'owner'
JOIN auth.users u ON u.id = cu.user_id
WHERE u.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;