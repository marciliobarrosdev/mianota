CREATE OR REPLACE FUNCTION public.master_save_plan(_id uuid, _payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _before jsonb; _new_id uuid; _r public.plan;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso restrito ao Super Administrador.' USING ERRCODE='42501';
  END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'Dados do plano inválidos.' USING ERRCODE='22023';
  END IF;
  PERFORM set_config('app.plan_admin_write','on',true);
  IF _id IS NULL THEN
    _r := jsonb_populate_record(NULL::public.plan, _payload - 'id' - 'created_at' - 'updated_at');
    _r.id := gen_random_uuid();
    _r.created_at := now();
    _r.updated_at := now();
    INSERT INTO public.plan SELECT (_r).* RETURNING id INTO _new_id;
  ELSE
    SELECT to_jsonb(p) INTO _before FROM public.plan p WHERE id = _id;
    IF _before IS NULL THEN RAISE EXCEPTION 'Plano não encontrado.'; END IF;
    -- Merge: saved values, overwritten only by the plan fields the caller sent.
    _r := jsonb_populate_record(NULL::public.plan, _before || (_payload - 'id' - 'created_at' - 'updated_at'));
    UPDATE public.plan SET
      slug = _r.slug, nome = _r.nome, descricao = _r.descricao,
      preco_cents = _r.preco_cents, moeda = _r.moeda, intervalo = _r.intervalo,
      trial_days = _r.trial_days, limite_mensagens = _r.limite_mensagens,
      limite_instancias = _r.limite_instancias, limite_usuarios = _r.limite_usuarios,
      limite_contatos = _r.limite_contatos, features = _r.features,
      destaque = _r.destaque, ativo = _r.ativo, ordem = _r.ordem,
      paddle_product_id = _r.paddle_product_id, paddle_price_id = _r.paddle_price_id,
      stripe_product_id = _r.stripe_product_id, stripe_price_id = _r.stripe_price_id,
      checkout_url = _r.checkout_url, creditos_mensais = _r.creditos_mensais,
      creditos_trial = _r.creditos_trial, checkout_mode = _r.checkout_mode,
      is_free = _r.is_free, free_days = _r.free_days,
      updated_at = now()
    WHERE id = _id;
    _new_id := _id;
  END IF;
  INSERT INTO public.master_audit_log(actor_id, actor_email, action, target, details)
  VALUES (auth.uid(), auth.jwt()->>'email', CASE WHEN _id IS NULL THEN 'plan.create' ELSE 'plan.update' END, _new_id::text,
    jsonb_build_object('before', _before, 'after', (SELECT to_jsonb(p) FROM public.plan p WHERE id = _new_id)));
  RETURN _new_id;
END $function$;

REVOKE ALL ON FUNCTION public.master_save_plan(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.master_save_plan(uuid, jsonb) TO authenticated, service_role;