DELETE FROM auth.users WHERE email LIKE 'uji%@example.com' OR email LIKE 'cek%@example.com' OR email LIKE 'test%@example.com';

CREATE INDEX IF NOT EXISTS idx_alumni_name_lower ON public.alumni (lower(btrim(name)));
CREATE INDEX IF NOT EXISTS idx_alumni_user_id ON public.alumni (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);