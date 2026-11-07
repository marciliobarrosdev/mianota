CREATE OR REPLACE FUNCTION public.guard_plan_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.plan_admin_write', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  -- Legacy seed inserts (ON CONFLICT DO NOTHING) for slugs that already exist are silently skipped.
  IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM public.plan p WHERE p.slug = NEW.slug) THEN
    RETURN NULL;
  END IF;
  RAISE EXCEPTION 'Planos só podem ser alterados pelo Super Administrador em /master/planos.' USING ERRCODE = '42501';
END $function$;