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
  _target uuid := COALESCE(_user_id, auth.uid());
BEGIN
  IF _target IS NULL THEN
    RETURN jsonb_build_object('used', 0, 'limit', _limit, 'remaining', _limit, 'period', _period);
  END IF;

  IF _target <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT q.used, q.message_limit INTO _used, _limit
  FROM public.ai_message_quota q
  WHERE q.user_id = _target AND q.period = _period;

  IF NOT FOUND THEN
    _used := 0;
    SELECT COALESCE(MAX(q2.message_limit), 75) INTO _limit
    FROM public.ai_message_quota q2 WHERE q2.user_id = _target;
  END IF;

  RETURN jsonb_build_object(
    'used', _used,
    'limit', _limit,
    'remaining', GREATEST(_limit - _used, 0),
    'period', _period
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ai_quota_status(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ai_quota_status(uuid) TO authenticated, service_role;