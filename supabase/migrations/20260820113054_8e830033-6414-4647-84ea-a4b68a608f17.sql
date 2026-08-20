-- ALUMNI: hilangkan akses baca anonim
DROP POLICY IF EXISTS "Alumni viewable by everyone" ON public.alumni;
DROP POLICY IF EXISTS "Alumni are viewable by everyone" ON public.alumni;
DROP POLICY IF EXISTS "alumni_select_public" ON public.alumni;
DROP POLICY IF EXISTS "Anyone can view alumni" ON public.alumni;

CREATE POLICY "Alumni readable by authenticated users"
ON public.alumni FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.alumni FROM anon;

-- USER ROLES: hanya milik sendiri atau admin
DROP POLICY IF EXISTS "Roles viewable by everyone" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_public" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.user_roles FROM anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;