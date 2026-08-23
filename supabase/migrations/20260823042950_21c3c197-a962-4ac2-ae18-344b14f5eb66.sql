ALTER TABLE public.allowed_login_emails
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by uuid,
  ADD COLUMN IF NOT EXISTS first_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_notice_status text NOT NULL DEFAULT 'none';

UPDATE public.allowed_login_emails
SET invited_at = COALESCE(invited_at, created_at),
    invited_by = COALESCE(invited_by, created_by);

CREATE OR REPLACE FUNCTION public.check_login_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _avatar text;
  _rec public.allowed_login_emails%ROWTYPE;
  _checks integer;
  _other_profile uuid;
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

  -- Email & foto diambil dari JWT Google yang terverifikasi (bukan dari frontend)
  _email := lower(btrim(COALESCE(auth.jwt() ->> 'email', '')));
  _avatar := COALESCE(
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'avatar_url', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'picture', '')
  );

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

  -- Profil lama dengan email sama tapi id berbeda: jangan ditimpa otomatis,
  -- cukup dicatat aman agar admin dapat menindaklanjuti.
  SELECT p.id INTO _other_profile
  FROM public.profiles p
  WHERE lower(p.email) = _email AND p.id <> _uid
  LIMIT 1;
  IF _other_profile IS NOT NULL THEN
    INSERT INTO public.login_access_audit (actor_id, target_email, action)
    VALUES (_uid, left(_email, 254), 'profile_link_conflict');
  END IF;

  -- Diizinkan: sinkronkan profil & role dari database (bukan dari frontend/Google)
  PERFORM set_config('app.role_sync', 'on', true);

  INSERT INTO public.profiles (id, full_name, email, role, account_status, must_change_password, avatar_url)
  VALUES (
    _uid,
    COALESCE(NULLIF(_rec.full_name, ''), split_part(_email, '@', 1)),
    _email,
    _rec.role,
    'active',
    false,
    _avatar
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = EXCLUDED.role,
      full_name = CASE WHEN _rec.full_name <> '' THEN _rec.full_name ELSE public.profiles.full_name END,
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  DELETE FROM public.user_roles WHERE user_id = _uid AND role <> _rec.role;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _rec.role)
  ON CONFLICT DO NOTHING;

  -- Catat waktu login: dasar status "Sudah Login" / "Belum Login"
  UPDATE public.allowed_login_emails
  SET last_login_at = now(),
      first_login_at = COALESCE(first_login_at, now())
  WHERE email = _email;

  INSERT INTO public.login_access_audit (actor_id, target_email, action, new_role)
  VALUES (_uid, left(_email, 254), 'login_allowed', _rec.role);

  RETURN jsonb_build_object('status', 'allowed', 'role', _rec.role, 'full_name', _rec.full_name);
END;
$function$;