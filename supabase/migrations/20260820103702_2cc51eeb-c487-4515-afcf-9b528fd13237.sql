-- Pengetatan keamanan fungsi database (tidak mengubah perilaku aplikasi)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admin_on_new_alumni()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT user_id, 'Alumni Baru', 'Alumni baru terdaftar: ' || COALESCE(NEW.full_name, NEW.name), 'success'
  FROM public.user_roles
  WHERE role = 'admin';
  RETURN NEW;
END;
$$;

-- fungsi trigger & helper internal tidak boleh dipanggil langsung dari API
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_on_new_alumni() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_role() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.link_or_create_alumni(uuid, text, jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.submit_graduate_status(text, integer, text, text, text, text, text) FROM anon;

-- yang tetap boleh dipakai pengguna login
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_graduate_status(text, integer, text, text, text, text, text) TO authenticated;