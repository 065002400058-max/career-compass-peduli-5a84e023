-- Perbaiki data yang sudah ada agar tidak melanggar NOT NULL
UPDATE public.alumni SET full_name = COALESCE(name, 'Alumni') WHERE full_name IS NULL;

-- Perbaiki fungsi link_or_create_alumni agar mengisi full_name
CREATE OR REPLACE FUNCTION public.link_or_create_alumni(_user_id uuid, _full_name text, _md jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  _existing_id uuid;
  _name text := NULLIF(btrim(COALESCE(_full_name, '')), '');
BEGIN
  -- sudah punya data alumni tertaut?
  SELECT id INTO _existing_id FROM public.alumni WHERE user_id = _user_id LIMIT 1;
  IF _existing_id IS NOT NULL THEN
    RETURN _existing_id;
  END IF;

  -- cari data alumni yang sudah ada di database berdasarkan nama (case-insensitive)
  IF _name IS NOT NULL THEN
    SELECT id INTO _existing_id
    FROM public.alumni
    WHERE user_id IS NULL
      AND lower(btrim(name)) = lower(_name)
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF _existing_id IS NOT NULL THEN
    -- tautkan saja: jumlah alumni TIDAK bertambah
    UPDATE public.alumni
    SET user_id = _user_id,
        profile_id = _user_id,
        full_name = COALESCE(NULLIF(btrim(COALESCE(_full_name, '')), ''), full_name, name)
    WHERE id = _existing_id;
    RETURN _existing_id;
  END IF;

  INSERT INTO public.alumni (
    user_id, profile_id, name, full_name, gender, graduation_year, origin, education_level,
    major, university, position, company, status
  )
  VALUES (
    _user_id, _user_id,
    COALESCE(_name, 'Alumni'),
    COALESCE(_name, 'Alumni'),
    NULLIF(_md->>'gender',''),
    COALESCE(NULLIF(_md->>'graduation_year','')::int, EXTRACT(YEAR FROM now())::int),
    NULLIF(_md->>'origin',''),
    NULLIF(_md->>'education_level',''),
    NULLIF(_md->>'major',''),
    NULLIF(_md->>'university',''),
    NULLIF(_md->>'position',''),
    NULLIF(_md->>'company',''),
    COALESCE(NULLIF(_md->>'status',''), 'belum mengisi tracer')
  )
  RETURNING id INTO _existing_id;

  RETURN _existing_id;
END;
$function$;

-- Perbaiki fungsi submit_graduate_status agar mengisi full_name saat update
CREATE OR REPLACE FUNCTION public.submit_graduate_status(_status text, _graduation_year integer DEFAULT NULL::integer, _position text DEFAULT NULL::text, _company text DEFAULT NULL::text, _job_field text DEFAULT NULL::text, _university text DEFAULT NULL::text, _major text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _prof public.profiles;
  _alumni_id uuid;
  _working boolean := lower(COALESCE(_status,'')) IN ('bekerja','wirausaha');
  _studying boolean := lower(COALESCE(_status,'')) = 'melanjutkan studi';
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Tidak terautentikasi';
  END IF;

  SELECT * INTO _prof FROM public.profiles WHERE id = _uid;

  _alumni_id := public.link_or_create_alumni(_uid, COALESCE(_prof.full_name, 'Alumni'), '{}'::jsonb);

  UPDATE public.alumni SET
    name = COALESCE(NULLIF(btrim(COALESCE(_prof.full_name,'')),''), name),
    full_name = COALESCE(NULLIF(btrim(COALESCE(_prof.full_name,'')),''), full_name, name),
    gender = COALESCE(_prof.gender, gender),
    origin = COALESCE(_prof.origin, origin),
    education_level = COALESCE(_prof.education_level, education_level),
    graduation_year = COALESCE(_graduation_year, graduation_year),
    status = _status,
    graduation_status = _status,
    employment_status = _status,
    position = CASE WHEN _working THEN NULLIF(btrim(COALESCE(_position,'')),'') ELSE NULL END,
    company = CASE WHEN _working THEN NULLIF(btrim(COALESCE(_company,'')),'') ELSE NULL END,
    job_field = CASE WHEN _working THEN NULLIF(btrim(COALESCE(_job_field,'')),'') ELSE NULL END,
    university = CASE WHEN _studying THEN NULLIF(btrim(COALESCE(_university,'')),'') ELSE university END,
    major = CASE WHEN _studying THEN NULLIF(btrim(COALESCE(_major,'')),'') ELSE major END,
    tracer_filled_at = now()
  WHERE id = _alumni_id;

  -- naikkan peran menjadi alumni (trigger sync_profile_role menyesuaikan user_roles)
  UPDATE public.profiles SET role = 'alumni'::public.app_role
  WHERE id = _uid AND COALESCE(role, 'santri'::public.app_role) <> 'admin'::public.app_role;

  RETURN _alumni_id;
END;
$function$;