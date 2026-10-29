CREATE TABLE public.push_dispatch_secret (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex')
);
GRANT ALL ON public.push_dispatch_secret TO service_role;
ALTER TABLE public.push_dispatch_secret ENABLE ROW LEVEL SECURITY;
INSERT INTO public.push_dispatch_secret (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.dispatch_marcia_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _token text;
BEGIN
  SELECT token INTO _token FROM public.push_dispatch_secret WHERE id;
  IF _token IS NULL THEN RETURN NEW; END IF;
  BEGIN
    PERFORM net.http_post(
      url := 'https://mianota.lovable.app/api/public/push/dispatch',
      headers := jsonb_build_object('Content-Type','application/json','x-push-token',_token),
      body := jsonb_build_object('notificationId', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_marcia_push() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS marcia_notification_push ON public.marcia_notification;
CREATE TRIGGER marcia_notification_push AFTER INSERT ON public.marcia_notification
FOR EACH ROW EXECUTE FUNCTION public.dispatch_marcia_push();