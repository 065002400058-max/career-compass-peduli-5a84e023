ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.profiles
     SET must_change_password = false,
         updated_at = now()
   WHERE id = _uid;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_must_change_password() FROM public;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;