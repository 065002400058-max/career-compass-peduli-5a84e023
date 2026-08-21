ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON public.invitations (token_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_email_unique ON public.invitations (lower(btrim(email)));