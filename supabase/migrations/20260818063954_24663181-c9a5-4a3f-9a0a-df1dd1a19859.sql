-- Fix security warnings for the sync_profile_role function
ALTER FUNCTION public.sync_profile_role() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.sync_profile_role() FROM PUBLIC;

-- Fix security warnings for the has_role function (though already set search_path, let's be sure)
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
