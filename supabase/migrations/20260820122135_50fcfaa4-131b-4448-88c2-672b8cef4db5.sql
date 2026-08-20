-- 1. Status akun pada profiles (default aman: akun lama tetap aktif)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_account_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('invited','active','suspended','inactive'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);

-- 2. Percobaan login (khusus server / edge function)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_key text NOT NULL DEFAULT '',
  failed_attempts integer NOT NULL DEFAULT 0,
  last_failed_attempt timestamptz,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, ip_key)
);

GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(lower(email));

DROP TRIGGER IF EXISTS trg_login_attempts_updated ON public.login_attempts;
CREATE TRIGGER trg_login_attempts_updated
  BEFORE UPDATE ON public.login_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Audit akses histori AI oleh admin
CREATE TABLE IF NOT EXISTS public.ai_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  thread_id uuid,
  target_user_id uuid,
  action text NOT NULL DEFAULT 'view_thread',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_access_audit TO authenticated;
GRANT ALL ON public.ai_access_audit TO service_role;
ALTER TABLE public.ai_access_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin dapat melihat audit akses AI"
  ON public.ai_access_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin mencatat aksesnya sendiri"
  ON public.ai_access_audit FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ai_audit_created ON public.ai_access_audit(created_at DESC);

-- 4. Kelengkapan undangan
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS identity_number text,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;