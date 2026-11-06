CREATE TABLE public.master_lead (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid UNIQUE,
  user_id uuid,
  nome text NOT NULL,
  email text,
  telefone text,
  empresa text,
  origem text NOT NULL DEFAULT 'manual',
  stage text NOT NULL DEFAULT 'novo',
  position double precision NOT NULL DEFAULT 0,
  temperatura text NOT NULL DEFAULT 'morno',
  valor_cents integer NOT NULL DEFAULT 0,
  responsavel text,
  tags text[] NOT NULL DEFAULT '{}',
  observacoes text,
  motivo_perda text,
  plano_convertido text,
  auto_moved boolean NOT NULL DEFAULT false,
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT master_lead_stage_chk CHECK (stage IN ('novo','contato','experimental','migracao','convertido','perdido')),
  CONSTRAINT master_lead_temp_chk CHECK (temperatura IN ('frio','morno','quente'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_lead TO authenticated;
GRANT ALL ON public.master_lead TO service_role;
ALTER TABLE public.master_lead ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage leads" ON public.master_lead FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TABLE public.master_lead_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.master_lead(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'nota',
  body text NOT NULL,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX master_lead_activity_lead_idx ON public.master_lead_activity(lead_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_lead_activity TO authenticated;
GRANT ALL ON public.master_lead_activity TO service_role;
ALTER TABLE public.master_lead_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage lead activity" ON public.master_lead_activity FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TABLE public.master_lead_task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.master_lead(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  due_at timestamptz,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX master_lead_task_lead_idx ON public.master_lead_task(lead_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_lead_task TO authenticated;
GRANT ALL ON public.master_lead_task TO service_role;
ALTER TABLE public.master_lead_task ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage lead tasks" ON public.master_lead_task FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

INSERT INTO public.master_lead (company_id, user_id, nome, email, telefone, empresa, origem, stage, created_at, stage_changed_at)
SELECT DISTINCT ON (f.company_id) f.company_id, f.user_id, COALESCE(c.nome, f.email, 'Lead'), f.email, c.telefone, c.nome,
  'plano_gratis', 'experimental', f.created_at, f.created_at
FROM public.free_plan_usage f
LEFT JOIN public.company c ON c.id = f.company_id
WHERE f.company_id IS NOT NULL
ON CONFLICT (company_id) DO NOTHING;