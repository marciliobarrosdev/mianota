ALTER TABLE public.fin_lancamento ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS fin_lancamento_tags_idx ON public.fin_lancamento USING gin (tags);

CREATE TABLE public.fin_lancamento_split (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  lancamento_id uuid NOT NULL REFERENCES public.fin_lancamento(id) ON DELETE CASCADE,
  categoria_id uuid REFERENCES public.fin_categoria(id) ON DELETE SET NULL,
  valor_cents integer NOT NULL CHECK (valor_cents > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fin_lancamento_split_lanc_idx ON public.fin_lancamento_split(lancamento_id);
CREATE INDEX fin_lancamento_split_company_idx ON public.fin_lancamento_split(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_lancamento_split TO authenticated;
GRANT ALL ON public.fin_lancamento_split TO service_role;
ALTER TABLE public.fin_lancamento_split ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company members manage splits" ON public.fin_lancamento_split
  FOR ALL TO authenticated
  USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));