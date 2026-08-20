CREATE OR REPLACE FUNCTION public.auto_counseling_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _l text := lower(coalesce(NEW.level, ''));
  _name text;
  _title text;
  _risk text;
BEGIN
  IF _l = '' THEN RETURN NEW; END IF;

  IF _l LIKE '%kemungkinan gejala%'
     OR (_l LIKE '%tinggi%' AND _l NOT LIKE '%resiliensi tinggi%')
     OR (_l LIKE '%resiliensi%' AND _l LIKE '%rendah%') THEN
    _risk := 'tinggi';
  ELSIF _l LIKE '%sedang%' THEN
    _risk := 'sedang';
  ELSE
    RETURN NEW;
  END IF;

  SELECT full_name INTO _name FROM public.profiles WHERE id = NEW.user_id;
  SELECT title INTO _title FROM public.psikotes_tests WHERE id = NEW.test_id;

  -- hindari duplikasi: satu rujukan aktif per user per tes
  IF EXISTS (
    SELECT 1 FROM public.counseling_referrals
    WHERE user_id = NEW.user_id
      AND source = coalesce(_title, 'Screening')
      AND status IN ('pending', 'diproses')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.counseling_referrals (user_id, user_name, reason, level, source, status, notes)
  VALUES (
    NEW.user_id,
    coalesce(_name, 'Pengguna'),
    coalesce(NEW.level, 'Hasil screening perlu tindak lanjut'),
    _risk,
    coalesce(_title, 'Screening'),
    'pending',
    NEW.conclusion
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_counseling_referral ON public.psikotes_attempts;
CREATE TRIGGER trg_auto_counseling_referral
AFTER INSERT ON public.psikotes_attempts
FOR EACH ROW EXECUTE FUNCTION public.auto_counseling_referral();

-- Backfill dari hasil screening terakhir tiap pengguna per tes
INSERT INTO public.counseling_referrals (user_id, user_name, reason, level, source, status, notes, created_at)
SELECT a.user_id,
       coalesce(p.full_name, 'Pengguna'),
       a.level,
       CASE
         WHEN lower(a.level) LIKE '%kemungkinan gejala%'
           OR (lower(a.level) LIKE '%tinggi%' AND lower(a.level) NOT LIKE '%resiliensi tinggi%')
           OR (lower(a.level) LIKE '%resiliensi%' AND lower(a.level) LIKE '%rendah%') THEN 'tinggi'
         ELSE 'sedang'
       END,
       coalesce(t.title, 'Screening'),
       'pending',
       a.conclusion,
       a.created_at
FROM (
  SELECT DISTINCT ON (user_id, test_id) *
  FROM public.psikotes_attempts
  ORDER BY user_id, test_id, created_at DESC
) a
LEFT JOIN public.profiles p ON p.id = a.user_id
LEFT JOIN public.psikotes_tests t ON t.id = a.test_id
WHERE a.level IS NOT NULL
  AND (
    lower(a.level) LIKE '%kemungkinan gejala%'
    OR (lower(a.level) LIKE '%tinggi%' AND lower(a.level) NOT LIKE '%resiliensi tinggi%')
    OR (lower(a.level) LIKE '%resiliensi%' AND lower(a.level) LIKE '%rendah%')
    OR lower(a.level) LIKE '%sedang%'
  );