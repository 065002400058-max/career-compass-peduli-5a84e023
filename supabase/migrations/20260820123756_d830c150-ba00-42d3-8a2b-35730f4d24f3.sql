UPDATE public.alumni
SET gender = CASE
  WHEN lower(btrim(gender)) IN ('l','lk','laki','laki-laki','pria','male','m') THEN 'Laki-laki'
  WHEN lower(btrim(gender)) IN ('p','pr','perempuan','wanita','female','f') THEN 'Perempuan'
  ELSE gender END
WHERE gender IS NOT NULL
  AND lower(btrim(gender)) IN ('l','lk','laki','pria','male','m','p','pr','wanita','female','f','laki-laki','perempuan')
  AND gender NOT IN ('Laki-laki','Perempuan');

UPDATE public.alumni
SET graduation_year = 2000 + graduation_year
WHERE graduation_year BETWEEN 1 AND 99;