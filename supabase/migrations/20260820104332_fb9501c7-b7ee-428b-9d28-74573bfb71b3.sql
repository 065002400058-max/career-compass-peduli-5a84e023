-- 1) Kolom tambahan pendidikan alumni (aditif, tidak menghapus data)
ALTER TABLE public.alumni_education
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS university_name text,
  ADD COLUMN IF NOT EXISTS university_type text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aktif',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- level lama disalin dari degree bila ada
UPDATE public.alumni_education SET level = degree WHERE level IS NULL AND degree IS NOT NULL;

-- validasi lewat trigger (bukan CHECK) agar fleksibel
CREATE OR REPLACE FUNCTION public.validate_alumni_education()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.level := NULLIF(btrim(COALESCE(NEW.level, NEW.degree, '')), '');
  IF NEW.level IS NOT NULL AND lower(NEW.level) NOT IN ('d3','d4','s1','s2','s3','lainnya') THEN
    RAISE EXCEPTION 'Jenjang tidak valid: % (gunakan D3, D4, S1, S2, S3, atau Lainnya)', NEW.level;
  END IF;
  IF NEW.level IS NOT NULL THEN
    NEW.level := lower(NEW.level);
    NEW.degree := COALESCE(NEW.degree, NEW.level);
  END IF;

  NEW.university_type := NULLIF(lower(btrim(COALESCE(NEW.university_type, ''))), '');
  IF NEW.university_type IS NOT NULL AND NEW.university_type NOT IN ('ptn','pts','luar_negeri','kedinasan') THEN
    RAISE EXCEPTION 'Jenis kampus tidak valid: % (gunakan PTN, PTS, luar_negeri, kedinasan)', NEW.university_type;
  END IF;

  NEW.status := COALESCE(NULLIF(lower(btrim(COALESCE(NEW.status, ''))), ''), 'aktif');
  IF NEW.status NOT IN ('aktif','lulus','cuti','tidak_aktif') THEN
    RAISE EXCEPTION 'Status studi tidak valid: % (gunakan aktif, lulus, cuti, tidak_aktif)', NEW.status;
  END IF;

  IF NEW.start_year IS NOT NULL AND (NEW.start_year < 1950 OR NEW.start_year > 2100) THEN
    RAISE EXCEPTION 'Tahun masuk tidak valid: %', NEW.start_year;
  END IF;
  IF NEW.end_year IS NOT NULL AND (NEW.end_year < 1950 OR NEW.end_year > 2100) THEN
    RAISE EXCEPTION 'Tahun lulus tidak valid: %', NEW.end_year;
  END IF;
  IF NEW.start_year IS NOT NULL AND NEW.end_year IS NOT NULL AND NEW.end_year < NEW.start_year THEN
    RAISE EXCEPTION 'Tahun lulus tidak boleh lebih kecil dari tahun masuk';
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_alumni_education ON public.alumni_education;
CREATE TRIGGER trg_validate_alumni_education
  BEFORE INSERT OR UPDATE ON public.alumni_education
  FOR EACH ROW EXECUTE FUNCTION public.validate_alumni_education();

REVOKE ALL ON FUNCTION public.validate_alumni_education() FROM PUBLIC, anon, authenticated;

-- 2) Hak akses Data API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_education TO authenticated;
GRANT ALL ON public.alumni_education TO service_role;

ALTER TABLE public.alumni_education ENABLE ROW LEVEL SECURITY;

-- 3) RLS: pemilik data (alumni) + admin
DROP POLICY IF EXISTS "Alumni can view own education" ON public.alumni_education;
CREATE POLICY "Alumni can view own education" ON public.alumni_education
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alumni a WHERE a.id = alumni_education.alumni_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Alumni can insert own education" ON public.alumni_education;
CREATE POLICY "Alumni can insert own education" ON public.alumni_education
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.alumni a WHERE a.id = alumni_education.alumni_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Alumni can update own education" ON public.alumni_education;
CREATE POLICY "Alumni can update own education" ON public.alumni_education
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alumni a WHERE a.id = alumni_education.alumni_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.alumni a WHERE a.id = alumni_education.alumni_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Alumni can delete own education" ON public.alumni_education;
CREATE POLICY "Alumni can delete own education" ON public.alumni_education
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alumni a WHERE a.id = alumni_education.alumni_id AND a.user_id = auth.uid()));

-- 4) Index untuk filter admin
CREATE INDEX IF NOT EXISTS idx_alumni_education_alumni ON public.alumni_education (alumni_id);
CREATE INDEX IF NOT EXISTS idx_alumni_education_level ON public.alumni_education (level);
CREATE INDEX IF NOT EXISTS idx_alumni_education_type ON public.alumni_education (university_type);
CREATE INDEX IF NOT EXISTS idx_alumni_education_end_year ON public.alumni_education (end_year);

-- 5) Realtime
ALTER TABLE public.alumni_education REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.alumni_education;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;