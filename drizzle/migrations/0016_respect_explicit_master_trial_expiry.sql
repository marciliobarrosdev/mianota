CREATE OR REPLACE FUNCTION public.tg_company_trial_credits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  _trial_credits integer := 0;
  _monthly_credits integer := 0;
BEGIN
  IF NEW.selected_plan_slug IS NOT NULL THEN
    SELECT greatest(0, plan.creditos_trial), greatest(0, plan.creditos_mensais)
    INTO _trial_credits, _monthly_credits
    FROM public.plan AS plan WHERE plan.slug = NEW.selected_plan_slug;
  END IF;
  -- Honor the explicit future expiry set by the authenticated Master provisioning
  -- RPC. A public zero-day trial still has no future expiry and remains locked.
  IF NEW.status_cobranca = 'trial' AND NEW.trial_ate IS NOT NULL AND NEW.trial_ate > pg_catalog.now() THEN
    NEW.creditos_saldo := COALESCE(_trial_credits, 0);
    NEW.creditos_origem := 'trial';
    NEW.creditos_resetam_em := NEW.trial_ate;
  ELSIF NEW.status_cobranca = 'ativo' THEN
    NEW.creditos_saldo := COALESCE(_monthly_credits, 0);
    NEW.creditos_origem := 'plano';
    NEW.creditos_resetam_em := pg_catalog.now() + interval '30 days';
  ELSE
    IF NEW.status_cobranca = 'trial' THEN NEW.status_cobranca := 'checkout_pending'; END IF;
    NEW.creditos_saldo := 0;
    NEW.creditos_origem := 'trial';
    NEW.creditos_resetam_em := NULL;
  END IF;
  RETURN NEW;
END;
$function$;