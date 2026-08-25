-- 1. Log permintaan AI untuk rate limiting per pengguna
CREATE TABLE IF NOT EXISTS public.ai_request_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_request_log TO service_role;
ALTER TABLE public.ai_request_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_request_log_own_select" ON public.ai_request_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS ai_request_log_user_time_idx
  ON public.ai_request_log (user_id, created_at DESC);

-- 2. Helper: pengguna aktif berdasarkan whitelist (email dari JWT terverifikasi)
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_login_emails a
    WHERE a.email = lower(btrim(COALESCE(auth.jwt() ->> 'email', '')))
      AND a.status = 'active'
      AND (a.expires_at IS NULL OR a.expires_at > now())
  )
$$;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated, service_role;

-- 3. Gate server-side untuk endpoint AI (dipanggil hanya oleh edge function)
CREATE OR REPLACE FUNCTION public.ai_access_gate(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _rec public.allowed_login_emails%ROWTYPE;
  _per_min integer;
  _per_hour integer;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  SELECT lower(btrim(COALESCE(email, ''))) INTO _email
  FROM public.profiles WHERE id = _user_id;

  IF _email IS NULL OR _email = '' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_registered');
  END IF;

  SELECT * INTO _rec FROM public.allowed_login_emails WHERE email = _email;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_registered');
  END IF;
  IF _rec.status <> 'active' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'inactive');
  END IF;
  IF _rec.expires_at IS NOT NULL AND _rec.expires_at < now() THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'expired');
  END IF;
  IF _rec.role NOT IN ('santri', 'alumni', 'admin') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'role_not_allowed');
  END IF;

  SELECT count(*) INTO _per_min FROM public.ai_request_log
  WHERE user_id = _user_id AND created_at > now() - interval '1 minute';
  IF _per_min >= 10 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limited_minute');
  END IF;

  SELECT count(*) INTO _per_hour FROM public.ai_request_log
  WHERE user_id = _user_id AND created_at > now() - interval '1 hour';
  IF _per_hour >= 50 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limited_hour');
  END IF;

  INSERT INTO public.ai_request_log (user_id) VALUES (_user_id);

  DELETE FROM public.ai_request_log
  WHERE user_id = _user_id AND created_at < now() - interval '1 day';

  RETURN jsonb_build_object(
    'allowed', true,
    'role', _rec.role,
    'per_minute', _per_min + 1,
    'per_hour', _per_hour + 1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.ai_access_gate(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ai_access_gate(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_access_gate(uuid) TO service_role;

-- 4. Privasi percakapan AI: hanya pemilik, dan hanya bila akun aktif
DROP POLICY IF EXISTS "Admins have full access" ON public.chat_threads;
DROP POLICY IF EXISTS "Admins have full access" ON public.chat_messages;
DROP POLICY IF EXISTS "own threads" ON public.chat_threads;
DROP POLICY IF EXISTS "own messages" ON public.chat_messages;

CREATE POLICY "own threads" ON public.chat_threads
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.is_active_user())
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());

CREATE POLICY "own messages" ON public.chat_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.is_active_user())
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());

-- 5. Statistik agregat AI untuk admin (tanpa membuka isi percakapan)
CREATE OR REPLACE FUNCTION public.ai_usage_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _out jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT jsonb_build_object(
    'threads', (SELECT count(*) FROM public.chat_threads),
    'messages', (SELECT count(*) FROM public.chat_messages),
    'users', (SELECT count(DISTINCT user_id) FROM public.chat_threads),
    'active_users_7d', (
      SELECT count(DISTINCT user_id) FROM public.chat_messages
      WHERE created_at > now() - interval '7 days'
    ),
    'messages_7d', (
      SELECT count(*) FROM public.chat_messages
      WHERE created_at > now() - interval '7 days'
    ),
    'by_role', COALESCE((
      SELECT jsonb_object_agg(role_name, cnt) FROM (
        SELECT COALESCE(p.role::text, 'tidak diketahui') AS role_name, count(*) AS cnt
        FROM public.chat_messages m
        LEFT JOIN public.profiles p ON p.id = m.user_id
        GROUP BY 1
      ) s
    ), '{}'::jsonb),
    'by_mode', COALESCE((
      SELECT jsonb_object_agg(mode, cnt) FROM (
        SELECT COALESCE(t.mode, 'umum') AS mode, count(*) AS cnt
        FROM public.chat_threads t GROUP BY 1
      ) s2
    ), '{}'::jsonb),
    'daily', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('date', d, 'messages', c) ORDER BY d)
      FROM (
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS d, count(*) AS c
        FROM public.chat_messages
        WHERE created_at > now() - interval '30 days'
        GROUP BY 1
      ) s3
    ), '[]'::jsonb)
  ) INTO _out;

  RETURN _out;
END;
$$;
REVOKE ALL ON FUNCTION public.ai_usage_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_usage_stats() TO authenticated, service_role;

-- 6. Whitelist tidak lagi menerima peran mitra
UPDATE public.allowed_login_emails SET role = 'santri'::app_role WHERE role = 'mitra'::app_role;

CREATE OR REPLACE FUNCTION public.normalize_allowed_login_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.email := lower(btrim(NEW.email));
  IF NEW.role = 'mitra'::public.app_role THEN
    RAISE EXCEPTION 'Peran mitra tidak diizinkan pada daftar akses login';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;