CREATE OR REPLACE FUNCTION public.ai_admin_threads(_search text DEFAULT NULL, _limit integer DEFAULT 100)
RETURNS TABLE(
  thread_id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  user_role text,
  title text,
  mode text,
  message_count bigint,
  created_at timestamptz,
  last_message_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT t.id,
         t.user_id,
         COALESCE(p.full_name, 'Pengguna'),
         p.email,
         COALESCE(p.role::text, 'santri'),
         t.title,
         t.mode,
         COUNT(m.id),
         t.created_at,
         COALESCE(MAX(m.created_at), t.updated_at)
  FROM public.chat_threads t
  LEFT JOIN public.profiles p ON p.id = t.user_id
  LEFT JOIN public.chat_messages m ON m.thread_id = t.id
  WHERE _search IS NULL
     OR _search = ''
     OR p.full_name ILIKE '%' || _search || '%'
     OR p.email ILIKE '%' || _search || '%'
     OR t.title ILIKE '%' || _search || '%'
  GROUP BY t.id, t.user_id, p.full_name, p.email, p.role, t.title, t.mode, t.created_at, t.updated_at
  ORDER BY COALESCE(MAX(m.created_at), t.updated_at) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_admin_thread_messages(_thread_id uuid)
RETURNS TABLE(
  id uuid,
  role text,
  content text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT t.user_id INTO _owner FROM public.chat_threads t WHERE t.id = _thread_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'thread_not_found';
  END IF;

  INSERT INTO public.ai_access_audit (admin_id, thread_id, target_user_id, action)
  VALUES (auth.uid(), _thread_id, _owner, 'view_thread');

  RETURN QUERY
  SELECT m.id, m.role, m.content, m.created_at
  FROM public.chat_messages m
  WHERE m.thread_id = _thread_id
  ORDER BY m.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_admin_access_audit(_limit integer DEFAULT 100)
RETURNS TABLE(
  id uuid,
  admin_name text,
  target_name text,
  thread_id uuid,
  action text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT a.id,
         COALESCE(pa.full_name, 'Admin'),
         COALESCE(pt.full_name, 'Pengguna'),
         a.thread_id,
         a.action,
         a.created_at
  FROM public.ai_access_audit a
  LEFT JOIN public.profiles pa ON pa.id = a.admin_id
  LEFT JOIN public.profiles pt ON pt.id = a.target_user_id
  ORDER BY a.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
END;
$$;

REVOKE ALL ON FUNCTION public.ai_admin_threads(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ai_admin_thread_messages(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ai_admin_access_audit(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_admin_threads(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_admin_thread_messages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_admin_access_audit(integer) TO authenticated;