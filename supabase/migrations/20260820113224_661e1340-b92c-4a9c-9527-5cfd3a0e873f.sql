CREATE OR REPLACE FUNCTION public.public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'alumni', (SELECT count(*) FROM public.alumni),
    'jobs', (SELECT count(*) FROM public.jobs),
    'partners', (SELECT count(*) FROM public.partners),
    'events', (SELECT count(*) FROM public.events)
  )
$$;

REVOKE ALL ON FUNCTION public.public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_stats() TO anon, authenticated, service_role;