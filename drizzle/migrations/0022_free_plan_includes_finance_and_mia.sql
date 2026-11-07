CREATE OR REPLACE FUNCTION public.company_has_plan_feature(_company_id uuid, _feature text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  _slug text;
  _is_free boolean := false;
BEGIN
  SELECT pg_catalog.lower(plan.slug), plan.is_free
    INTO _slug, _is_free
  FROM public.subscription AS subscription
  JOIN public.plan AS plan ON plan.id = subscription.plan_id
  WHERE subscription.company_id = _company_id
    AND subscription.status IN ('active', 'trialing', 'past_due')
  ORDER BY subscription.created_at DESC
  LIMIT 1;

  IF _slug IS NULL THEN
    SELECT pg_catalog.lower(plan.slug), plan.is_free
      INTO _slug, _is_free
    FROM public.company AS company
    JOIN public.plan AS plan
      ON plan.slug = company.selected_plan_slug
     AND plan.ativo = true
    WHERE company.id = _company_id
      AND company.status_cobranca = 'trial'
      AND company.trial_ate > pg_catalog.now()
    LIMIT 1;
  END IF;

  _slug := COALESCE(_slug, 'starter');
  RETURN CASE pg_catalog.lower(COALESCE(_feature, ''))
    -- Finance + MIA chat are part of every plan, including free trials.
    WHEN 'financeiro' THEN true
    WHEN 'google_calendar' THEN _slug IN ('pro', 'business')
    WHEN 'automacoes' THEN _slug IN ('pro', 'business')
    WHEN 'api_webhooks' THEN _slug IN ('pro', 'business')
    ELSE false
  END;
END;
$function$;

ALTER TABLE public.company ALTER COLUMN financeiro_ativo SET DEFAULT true;
UPDATE public.company SET financeiro_ativo = true WHERE financeiro_ativo = false;