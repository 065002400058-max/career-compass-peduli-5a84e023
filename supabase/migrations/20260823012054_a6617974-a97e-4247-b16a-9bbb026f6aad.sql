-- ============================================================
-- Login Google berbasis daftar email yang diizinkan admin
-- ============================================================

-- 1) Tabel daftar email yang diizinkan login
CREATE TABLE public.allowed_login_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'santri',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT allowed_login_emails_email_lower_chk CHECK (email = lower(btrim(email)))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_login_emails TO authenticated;
GRANT ALL ON public.allowed_login_emails TO service_role;

ALTER TABLE public.allowed_login_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hanya admin yang mengelola daftar email login"
ON public.allowed_login_emails
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Tabel audit log akses login
CREATE TABLE public.login_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  target_email text NOT NULL DEFAULT '',
  action text NOT NULL,
  old_role public.app_role,
  new_role public.app_role,
  old_status text,
  new_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.login_access_audit TO authenticated;
GRANT ALL ON public.login_access_audit TO service_role;

ALTER TABLE public.login_access_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hanya admin yang membaca audit akses login"
ON public.login_access_audit
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3) Normalisasi email (lowercase + trim) sebelum disimpan
CREATE OR REPLACE FUNCTION public.normalize_allowed_login_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.email := lower(btrim(NEW.email));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_allowed_login_email
BEFORE INSERT OR UPDATE ON public.allowed_login_emails
FOR EACH ROW EXECUTE FUNCTION public.normalize_allowed_login_email();

-- 4) Cegah admin aktif terakhir menghapus / menonaktifkan aksesnya sendiri
CREATE OR REPLACE FUNCTION public.prevent_last_admin_lockout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.role = 'admin')
     OR (TG_OP = 'UPDATE' AND OLD.role = 'admin' AND (NEW.role <> 'admin' OR NEW.status <> 'active')) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.allowed_login_emails
      WHERE role = 'admin'
        AND status = 'active'
        AND id <> OLD.id
        AND (expires_at IS NULL OR expires_at > now())
    ) THEN
      RAISE EXCEPTION 'Tidak dapat menghapus atau menonaktifkan admin aktif terakhir.';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_last_admin_lockout
BEFORE UPDATE OR DELETE ON public.allowed_login_emails
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_lockout();

-- 5) Audit otomatis untuk setiap perubahan daftar email
CREATE OR REPLACE FUNCTION public.log_allowed_login_email_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_access_audit (actor_id, target_email, action, old_role, new_role, old_status, new_status)
  VALUES (
    auth.uid(),
    CASE WHEN TG_OP = 'DELETE' THEN OLD.email ELSE NEW.email END,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'email_added'
      WHEN TG_OP = 'DELETE' THEN 'email_removed'
      WHEN OLD.role IS DISTINCT FROM NEW.role THEN 'role_changed'
      WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'active' THEN 'activated'
      WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'inactive' THEN 'deactivated'
      ELSE 'updated'
    END,
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.role END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.role END,
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.status END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.status END
  );
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_allowed_login_email_changes
AFTER INSERT OR UPDATE OR DELETE ON public.allowed_login_emails
FOR EACH ROW EXECUTE FUNCTION public.log_allowed_login_email_changes();

-- 6) Izinkan fungsi pemeriksaan akses menyinkronkan role profil secara terkendali
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR coalesce(current_setting('request.jwt.claim.role', true), current_user) = 'service_role'
     OR current_setting('app.role_sync', true) = 'on'
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.role := OLD.role;
  NEW.account_status := OLD.account_status;
  NEW.activated_at := OLD.activated_at;
  NEW.invited_at := OLD.invited_at;
  RETURN NEW;
END;
$$;

-- 7) Pemeriksaan akses login di backend (dipanggil setelah autentikasi Google)
CREATE OR REPLACE FUNCTION public.check_login_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _rec public.allowed_login_emails%ROWTYPE;
  _checks integer;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('status', 'unauthenticated');
  END IF;

  -- Rate limit: maksimal 20 pemeriksaan per menit per pengguna
  SELECT count(*) INTO _checks
  FROM public.login_access_audit
  WHERE actor_id = _uid
    AND action = 'login_check'
    AND created_at > now() - interval '1 minute';
  IF _checks >= 20 THEN
    RETURN jsonb_build_object('status', 'rate_limited');
  END IF;

  -- Email diambil dari JWT terverifikasi, dinormalisasi (trim + lowercase)
  _email := lower(btrim(COALESCE(auth.jwt() ->> 'email', '')));

  INSERT INTO public.login_access_audit (actor_id, target_email, action)
  VALUES (_uid, left(_email, 254), 'login_check');

  IF _email = '' THEN
    RETURN jsonb_build_object('status', 'unauthenticated');
  END IF;

  SELECT * INTO _rec FROM public.allowed_login_emails WHERE email = _email;

  IF NOT FOUND THEN
    INSERT INTO public.login_access_audit (actor_id, target_email, action)
    VALUES (_uid, left(_email, 254), 'login_denied_unregistered');
    RETURN jsonb_build_object('status', 'not_registered');
  END IF;

  IF _rec.status <> 'active' THEN
    INSERT INTO public.login_access_audit (actor_id, target_email, action)
    VALUES (_uid, left(_email, 254), 'login_denied_inactive');
    RETURN jsonb_build_object('status', 'inactive');
  END IF;

  IF _rec.expires_at IS NOT NULL AND _rec.expires_at < now() THEN
    INSERT INTO public.login_access_audit (actor_id, target_email, action)
    VALUES (_uid, left(_email, 254), 'login_denied_expired');
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  -- Diizinkan: sinkronkan profil & role dari database (bukan dari frontend)
  PERFORM set_config('app.role_sync', 'on', true);

  INSERT INTO public.profiles (id, full_name, email, role, account_status, must_change_password)
  VALUES (
    _uid,
    COALESCE(NULLIF(_rec.full_name, ''), split_part(_email, '@', 1)),
    _email,
    _rec.role,
    'active',
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = EXCLUDED.role,
      full_name = CASE WHEN _rec.full_name <> '' THEN _rec.full_name ELSE public.profiles.full_name END;

  DELETE FROM public.user_roles WHERE user_id = _uid AND role <> _rec.role;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _rec.role)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.login_access_audit (actor_id, target_email, action, new_role)
  VALUES (_uid, left(_email, 254), 'login_allowed', _rec.role);

  RETURN jsonb_build_object('status', 'allowed', 'role', _rec.role, 'full_name', _rec.full_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_login_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_login_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_login_access() TO service_role;

-- 8) Migrasi akun lama: semua pengguna yang sudah ada tetap bisa masuk
INSERT INTO public.allowed_login_emails (email, full_name, role, status, created_by)
SELECT lower(btrim(p.email)), p.full_name, COALESCE(p.role, 'santri'::public.app_role), 'active', NULL
FROM public.profiles p
WHERE p.email IS NOT NULL AND btrim(p.email) <> ''
ON CONFLICT (email) DO NOTHING;