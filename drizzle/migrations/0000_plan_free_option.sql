ALTER TABLE public.plan ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;
ALTER TABLE public.plan ADD COLUMN IF NOT EXISTS free_days integer;

CREATE OR REPLACE FUNCTION public.normalize_free_plan()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF NEW.is_free THEN
    IF NEW.free_days IS NULL OR NEW.free_days < 1 OR NEW.free_days > 365 THEN
      RAISE EXCEPTION 'Plano gratuito precisa de um limite de dias entre 1 e 365';
    END IF;
    NEW.preco_cents := 0;
    NEW.trial_days := NEW.free_days;
    NEW.checkout_url := NULL;
    NEW.stripe_price_id := NULL;
  ELSE
    NEW.free_days := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_free_plan ON public.plan;
CREATE TRIGGER trg_normalize_free_plan BEFORE INSERT OR UPDATE ON public.plan
FOR EACH ROW EXECUTE FUNCTION public.normalize_free_plan();