-- FASE 1: audit dashboard santri, jejak perubahan, dan pengetatan akses (aditif, tanpa hapus data)

-- 1) jejak perubahan
ALTER TABLE public.cbt_attempts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.psikotes_attempts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.counseling_referrals
  ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.alumni
  ADD COLUMN IF NOT EXISTS updated_by uuid;

DROP TRIGGER IF EXISTS set_updated_at_cbt_attempts ON public.cbt_attempts;
CREATE TRIGGER set_updated_at_cbt_attempts
  BEFORE UPDATE ON public.cbt_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_psikotes_attempts ON public.psikotes_attempts;
CREATE TRIGGER set_updated_at_psikotes_attempts
  BEFORE UPDATE ON public.psikotes_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) index pendukung dashboard
CREATE INDEX IF NOT EXISTS idx_cbt_attempts_user_created ON public.cbt_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psikotes_attempts_user_completed ON public.psikotes_attempts (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_counseling_referrals_user_created ON public.counseling_referrals (user_id, created_at DESC);

-- 3) perketat RLS: data profil bukan data publik
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- update profil sendiri tidak boleh mengganti id / role
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4) alumni: cegah pemindahan kepemilikan baris saat update
DROP POLICY IF EXISTS "Alumni can update own data" ON public.alumni;
CREATE POLICY "Alumni can update own data"
  ON public.alumni FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5) realtime untuk hasil milik user
ALTER TABLE public.cbt_attempts REPLICA IDENTITY FULL;
ALTER TABLE public.psikotes_attempts REPLICA IDENTITY FULL;
ALTER TABLE public.counseling_referrals REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cbt_attempts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.psikotes_attempts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.counseling_referrals; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;