DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='r'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.jobs TO anon;
GRANT SELECT ON public.partners TO anon;
GRANT SELECT ON public.universities TO anon;
GRANT SELECT ON public.scholarships TO anon;
GRANT SELECT ON public.alumni_stories TO anon;
GRANT SELECT ON public.cbt_tests TO anon;
GRANT SELECT ON public.cbt_categories TO anon;
GRANT SELECT ON public.psikotes_tests TO anon;
GRANT SELECT ON public.psikotes_categories TO anon;

REVOKE ALL ON public.login_attempts FROM anon, authenticated;
GRANT ALL ON public.login_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR coalesce(current_setting('request.jwt.claim.role', true), current_user) = 'service_role'
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.role := OLD.role;
  NEW.account_status := OLD.account_status;
  NEW.activated_at := OLD.activated_at;
  NEW.invited_at := OLD.invited_at;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM anon, authenticated, public;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE ALL ON public.user_roles FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;