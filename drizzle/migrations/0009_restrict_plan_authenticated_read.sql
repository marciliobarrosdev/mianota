DROP POLICY IF EXISTS "plans authenticated read" ON public.plan;
CREATE POLICY "plans authenticated read" ON public.plan FOR SELECT TO authenticated
USING (
  ativo = true
  OR public.is_super_admin()
  OR EXISTS (SELECT 1 FROM public.subscription s WHERE s.plan_id = plan.id AND public.has_company_access(s.company_id))
  OR EXISTS (SELECT 1 FROM public.company c WHERE c.selected_plan_slug = plan.slug AND public.has_company_access(c.id))
);