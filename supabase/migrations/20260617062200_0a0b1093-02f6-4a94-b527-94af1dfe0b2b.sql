
-- Extend profiles with richer registration fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS origin TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS school_origin TEXT,
  ADD COLUMN IF NOT EXISTS education_level TEXT,
  ADD COLUMN IF NOT EXISTS major TEXT,
  ADD COLUMN IF NOT EXISTS university TEXT,
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- Allow admins to read all profiles for dashboard santri/alumni listing
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update handle_new_user to persist extended fields from registration metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
  _md jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  INSERT INTO public.profiles (
    user_id, full_name, phone, gender, birth_date, origin, address,
    school_origin, education_level, major, university, graduation_year, position, company
  )
  VALUES (
    NEW.id,
    COALESCE(_md->>'full_name', ''),
    NULLIF(_md->>'phone',''),
    NULLIF(_md->>'gender',''),
    NULLIF(_md->>'birth_date','')::date,
    NULLIF(_md->>'origin',''),
    NULLIF(_md->>'address',''),
    NULLIF(_md->>'school_origin',''),
    NULLIF(_md->>'education_level',''),
    NULLIF(_md->>'major',''),
    NULLIF(_md->>'university',''),
    NULLIF(_md->>'graduation_year','')::int,
    NULLIF(_md->>'position',''),
    NULLIF(_md->>'company','')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      gender = COALESCE(EXCLUDED.gender, public.profiles.gender),
      birth_date = COALESCE(EXCLUDED.birth_date, public.profiles.birth_date),
      origin = COALESCE(EXCLUDED.origin, public.profiles.origin),
      address = COALESCE(EXCLUDED.address, public.profiles.address),
      school_origin = COALESCE(EXCLUDED.school_origin, public.profiles.school_origin),
      education_level = COALESCE(EXCLUDED.education_level, public.profiles.education_level),
      major = COALESCE(EXCLUDED.major, public.profiles.major),
      university = COALESCE(EXCLUDED.university, public.profiles.university),
      graduation_year = COALESCE(EXCLUDED.graduation_year, public.profiles.graduation_year),
      position = COALESCE(EXCLUDED.position, public.profiles.position),
      company = COALESCE(EXCLUDED.company, public.profiles.company);

  BEGIN
    _role := COALESCE(_md->>'role', 'santri')::public.app_role;
  EXCEPTION WHEN OTHERS THEN
    _role := 'santri'::public.app_role;
  END;

  IF _role NOT IN ('santri'::public.app_role, 'alumni'::public.app_role, 'admin'::public.app_role, 'mitra'::public.app_role) THEN
    _role := 'santri'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  -- Auto-create alumni record when registering as alumni
  IF _role = 'alumni'::public.app_role THEN
    INSERT INTO public.alumni (
      user_id, name, gender, graduation_year, origin, education_level,
      major, university, position, company, status
    )
    VALUES (
      NEW.id,
      COALESCE(_md->>'full_name',''),
      NULLIF(_md->>'gender',''),
      COALESCE(NULLIF(_md->>'graduation_year','')::int, EXTRACT(YEAR FROM now())::int),
      NULLIF(_md->>'origin',''),
      NULLIF(_md->>'education_level',''),
      NULLIF(_md->>'major',''),
      NULLIF(_md->>'university',''),
      NULLIF(_md->>'position',''),
      NULLIF(_md->>'company',''),
      COALESCE(NULLIF(_md->>'status',''), 'Bekerja')
    );
  END IF;

  RETURN NEW;
END;
$function$;
