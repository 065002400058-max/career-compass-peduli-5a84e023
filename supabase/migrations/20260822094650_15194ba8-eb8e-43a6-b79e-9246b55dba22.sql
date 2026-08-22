ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS invited_at timestamptz;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;