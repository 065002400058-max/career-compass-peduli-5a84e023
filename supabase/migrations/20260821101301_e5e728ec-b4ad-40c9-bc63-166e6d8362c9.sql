CREATE TABLE IF NOT EXISTS public.ai_message_quota (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period text NOT NULL,
  used integer NOT NULL DEFAULT 0,
  message_limit integer NOT NULL DEFAULT 75,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period)
);

GRANT SELECT ON public.ai_message_quota TO authenticated;
GRANT ALL ON public.ai_message_quota TO service_role;

ALTER TABLE public.ai_message_quota ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own quota select" ON public.ai_message_quota;
CREATE POLICY "own quota select" ON public.ai_message_quota
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin manage quota" ON public.ai_message_quota;
CREATE POLICY "admin manage quota" ON public.ai_message_quota
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_ai_message_quota_updated ON public.ai_message_quota;
CREATE TRIGGER trg_ai_message_quota_updated BEFORE UPDATE ON public.ai_message_quota
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.ai_quota_status(_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _period text := to_char(now(), 'YYYY-MM');
  _used integer := 0;
  _limit integer := 75;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('used', 0, 'limit', _limit, 'remaining', _limit, 'period', _period);
  END IF;

  SELECT q.used, q.message_limit INTO _used, _limit
  FROM public.ai_message_quota q
  WHERE q.user_id = _user_id AND q.period = _period;

  IF NOT FOUND THEN
    _used := 0;
    SELECT COALESCE(MAX(q2.message_limit), 75) INTO _limit
    FROM public.ai_message_quota q2 WHERE q2.user_id = _user_id;
  END IF;

  RETURN jsonb_build_object(
    'used', _used,
    'limit', _limit,
    'remaining', GREATEST(_limit - _used, 0),
    'period', _period
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_ai_quota(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _period text := to_char(now(), 'YYYY-MM');
  _default_limit integer;
  _row public.ai_message_quota;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'used', 0, 'limit', 0, 'remaining', 0, 'guest', true);
  END IF;

  SELECT COALESCE(MAX(message_limit), 75) INTO _default_limit
  FROM public.ai_message_quota WHERE user_id = _user_id;

  INSERT INTO public.ai_message_quota (user_id, period, used, message_limit)
  VALUES (_user_id, _period, 0, _default_limit)
  ON CONFLICT (user_id, period) DO NOTHING;

  SELECT * INTO _row FROM public.ai_message_quota
  WHERE user_id = _user_id AND period = _period FOR UPDATE;

  IF _row.used >= _row.message_limit THEN
    RETURN jsonb_build_object('allowed', false, 'used', _row.used, 'limit', _row.message_limit, 'remaining', 0, 'period', _period);
  END IF;

  UPDATE public.ai_message_quota SET used = used + 1
  WHERE id = _row.id
  RETURNING * INTO _row;

  RETURN jsonb_build_object(
    'allowed', true, 'used', _row.used, 'limit', _row.message_limit,
    'remaining', GREATEST(_row.message_limit - _row.used, 0), 'period', _period
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_quota_status(uuid) TO authenticated, service_role;