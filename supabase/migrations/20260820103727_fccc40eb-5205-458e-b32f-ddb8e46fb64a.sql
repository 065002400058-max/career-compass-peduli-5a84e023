REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_graduate_status(text, integer, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_admin_on_new_alumni() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_profile_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_or_create_alumni(uuid, text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_graduate_status(text, integer, text, text, text, text, text) TO authenticated;