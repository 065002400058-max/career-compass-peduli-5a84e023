-- 1) Tabel undangan
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  role public.app_role NOT NULL DEFAULT 'santri'::public.app_role,
  status text NOT NULL DEFAULT 'menunggu',
  notes text,
  invited_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS invitations_email_unique ON public.invitations (lower(btrim(email)));
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations (status);
CREATE INDEX IF NOT EXISTS idx_invitations_role ON public.invitations (role);

-- 2) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;

-- 3) RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations"
ON public.invitations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) Validasi nilai status via trigger (bukan CHECK agar aman saat restore)
CREATE OR REPLACE FUNCTION public.validate_invitation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.email := lower(btrim(COALESCE(NEW.email, '')));
  IF NEW.email = '' OR position('@' in NEW.email) = 0 THEN
    RAISE EXCEPTION 'Email undangan tidak valid';
  END IF;
  NEW.status := lower(btrim(COALESCE(NEW.status, 'menunggu')));
  IF NEW.status NOT IN ('menunggu','terkirim','aktif','dibatalkan','kedaluwarsa') THEN
    RAISE EXCEPTION 'Status undangan tidak valid: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_invitation ON public.invitations;
CREATE TRIGGER trg_validate_invitation
BEFORE INSERT OR UPDATE ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.validate_invitation();

-- 5) Saat user baru dibuat: pakai data undangan (role + nama) dan tandai aktif
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _md jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  _inv public.invitations;
  _name text;
BEGIN
  SELECT * INTO _inv FROM public.invitations
  WHERE lower(btrim(email)) = lower(btrim(COALESCE(NEW.email,'')))
  LIMIT 1;

  BEGIN
    _role := COALESCE(_inv.role, NULLIF(_md->>'role','')::public.app_role, 'santri'::public.app_role);
  EXCEPTION WHEN OTHERS THEN
    _role := COALESCE(_inv.role, 'santri'::public.app_role);
  END;

  _name := COALESCE(
    NULLIF(_md->>'full_name',''),
    NULLIF(btrim(COALESCE(_inv.full_name,'')), ''),
    split_part(COALESCE(NEW.email,''), '@', 1)
  );

  INSERT INTO public.profiles (
    id, full_name, email, phone, gender, birth_date, origin, address,
    school_origin, education_level, major, university, graduation_year, position, company, role
  )
  VALUES (
    NEW.id,
    _name,
    NEW.email,
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
    NULLIF(_md->>'company',''),
    _role
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(NULLIF(EXCLUDED.full_name,''), public.profiles.full_name),
      email = COALESCE(EXCLUDED.email, public.profiles.email),
      role = COALESCE(EXCLUDED.role, public.profiles.role);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  IF _role = 'alumni'::public.app_role THEN
    PERFORM public.link_or_create_alumni(NEW.id, _name, _md);
  END IF;

  IF _inv.id IS NOT NULL THEN
    UPDATE public.invitations
    SET status = 'aktif', accepted_at = now()
    WHERE id = _inv.id;
  END IF;

  RETURN NEW;
END;
$$;