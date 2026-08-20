-- Pastikan email undangan konsisten lowercase & unik
UPDATE public.invitations SET email = lower(btrim(email)) WHERE email <> lower(btrim(email));

-- Hapus duplikat, sisakan yang terbaru
DELETE FROM public.invitations i
USING public.invitations j
WHERE i.email = j.email
  AND i.created_at < j.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS invitations_email_key ON public.invitations (email);