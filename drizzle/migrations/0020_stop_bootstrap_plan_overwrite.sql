CREATE OR REPLACE FUNCTION public.bootstrap_remix_instance(_company_name text DEFAULT NULL::text, _claim_owner boolean DEFAULT false, _activation_code text DEFAULT NULL::text)
 RETURNS TABLE(company_id uuid, claimed_super_admin boolean, created_company boolean, needs_onboarding boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  _company_id uuid;
  _claimed_super_admin boolean;
  _created_company boolean;
  _needs_onboarding boolean;
BEGIN
  -- Plans are never written here: only master_save_plan/master_delete_plan change plan rows.
  SELECT result.company_id, result.claimed_super_admin, result.created_company, result.needs_onboarding
    INTO _company_id, _claimed_super_admin, _created_company, _needs_onboarding
  FROM public.bootstrap_remix_instance_legacy_20261019(_company_name, _claim_owner, _activation_code) AS result;

  RETURN QUERY SELECT _company_id, _claimed_super_admin, _created_company, _needs_onboarding;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_plan_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.plan_admin_write', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Planos só podem ser alterados pelo Super Administrador em /master/planos.' USING ERRCODE = '42501';
END $function$;