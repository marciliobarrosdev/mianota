ALTER TABLE public.company ADD COLUMN welcome_email_eligible boolean NOT NULL DEFAULT false;
ALTER TABLE public.company ADD COLUMN welcome_email_claimed_at timestamptz;
ALTER TABLE public.company ADD COLUMN welcome_email_sent_at timestamptz;
CREATE FUNCTION public.prepare_new_company_welcome_email() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.welcome_email_eligible := true; NEW.welcome_email_claimed_at := NULL; NEW.welcome_email_sent_at := NULL; RETURN NEW; END; $$;
CREATE TRIGGER prepare_new_company_welcome_email BEFORE INSERT ON public.company FOR EACH ROW EXECUTE FUNCTION public.prepare_new_company_welcome_email();
COMMENT ON COLUMN public.company.welcome_email_eligible IS 'Only companies inserted after this migration are eligible for registration welcome email; existing companies remain excluded.';