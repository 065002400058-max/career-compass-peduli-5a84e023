REVOKE EXECUTE ON FUNCTION public.link_or_create_alumni(uuid, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.link_or_create_alumni(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_graduate_status(text, integer, text, text, text, text, text) TO authenticated;