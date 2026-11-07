DROP POLICY IF EXISTS "plans super admin write" ON public.plan;
REVOKE INSERT, UPDATE, DELETE ON public.plan FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_plan_write() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('app.plan_admin_write', true) = 'on'
     OR current_user IN ('postgres','supabase_admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Planos só podem ser alterados pelo Super Administrador em /master/planos.' USING ERRCODE = '42501';
END $$;
DROP TRIGGER IF EXISTS trg_guard_plan_write ON public.plan;
CREATE TRIGGER trg_guard_plan_write BEFORE INSERT OR UPDATE OR DELETE ON public.plan
FOR EACH ROW EXECUTE FUNCTION public.guard_plan_write();

CREATE OR REPLACE FUNCTION public.master_save_plan(_id uuid, _payload jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _before jsonb; _new_id uuid; _cols text; _r public.plan;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Acesso restrito ao Super Administrador.' USING ERRCODE='42501'; END IF;
  PERFORM set_config('app.plan_admin_write','on',true);
  IF _id IS NULL THEN
    _r := jsonb_populate_record(NULL::public.plan, _payload);
    INSERT INTO public.plan SELECT (jsonb_populate_record(_r, jsonb_build_object('id', gen_random_uuid(), 'created_at', now(), 'updated_at', now()))).* RETURNING id INTO _new_id;
  ELSE
    SELECT to_jsonb(p) INTO _before FROM public.plan p WHERE id = _id;
    IF _before IS NULL THEN RAISE EXCEPTION 'Plano não encontrado.'; END IF;
    _r := jsonb_populate_record(NULL::public.plan, _before || (_payload - 'id' - 'created_at'));
    SELECT string_agg(format('%I = ($1).%I', k, k), ', ') INTO _cols
      FROM jsonb_object_keys(_payload - 'id' - 'created_at') k;
    IF _cols IS NOT NULL THEN
      EXECUTE format('UPDATE public.plan SET %s WHERE id = $2', _cols) USING _r, _id;
    END IF;
    _new_id := _id;
  END IF;
  INSERT INTO public.master_audit_log(actor_id, actor_email, action, target, details)
  VALUES (auth.uid(), auth.jwt()->>'email', CASE WHEN _id IS NULL THEN 'plan.create' ELSE 'plan.update' END, _new_id::text,
    jsonb_build_object('before', _before, 'after', (SELECT to_jsonb(p) FROM public.plan p WHERE id = _new_id)));
  RETURN _new_id;
END $$;

CREATE OR REPLACE FUNCTION public.master_delete_plan(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _before jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Acesso restrito ao Super Administrador.' USING ERRCODE='42501'; END IF;
  SELECT to_jsonb(p) INTO _before FROM public.plan p WHERE id = _id;
  IF _before IS NULL THEN RAISE EXCEPTION 'Plano não encontrado.'; END IF;
  IF EXISTS (SELECT 1 FROM public.subscription WHERE plan_id = _id)
     OR EXISTS (SELECT 1 FROM public.company WHERE selected_plan_slug = _before->>'slug') THEN
    RAISE EXCEPTION 'Este plano tem assinantes vinculados. Desative-o em vez de excluir.';
  END IF;
  PERFORM set_config('app.plan_admin_write','on',true);
  DELETE FROM public.plan WHERE id = _id;
  INSERT INTO public.master_audit_log(actor_id, actor_email, action, target, details)
  VALUES (auth.uid(), auth.jwt()->>'email', 'plan.delete', _id::text, jsonb_build_object('before', _before));
END $$;

REVOKE ALL ON FUNCTION public.master_save_plan(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.master_delete_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.master_save_plan(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.master_delete_plan(uuid) TO authenticated;

UPDATE public.plan SET preco_cents = 2990, ativo = true WHERE slug = 'starter';
UPDATE public.plan SET preco_cents = 4990, ativo = true WHERE slug = 'pro';
UPDATE public.plan SET preco_cents = 0, ativo = true, is_free = true, free_days = 7 WHERE slug = 'free';