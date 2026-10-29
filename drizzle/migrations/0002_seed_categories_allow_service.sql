CREATE OR REPLACE FUNCTION public.seed_finance_personal_categories(_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND NOT public.has_company_access(_company_id)
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  INSERT INTO public.fin_categoria (company_id, nome, tipo, cor) VALUES
    (_company_id, 'Salário e receitas', 'receita', '#10B981'),
    (_company_id, 'Renda extra', 'receita', '#14B8A6'),
    (_company_id, 'Moradia', 'despesa', '#8B5CF6'),
    (_company_id, 'Alimentação', 'despesa', '#F59E0B'),
    (_company_id, 'Transporte', 'despesa', '#06B6D4'),
    (_company_id, 'Saúde', 'despesa', '#EC4899'),
    (_company_id, 'Educação', 'despesa', '#6366F1'),
    (_company_id, 'Lazer', 'despesa', '#F97316'),
    (_company_id, 'Assinaturas', 'despesa', '#A855F7'),
    (_company_id, 'Outros', 'despesa', '#64748B')
  ON CONFLICT (company_id, tipo, nome) DO NOTHING;
END;
$function$;