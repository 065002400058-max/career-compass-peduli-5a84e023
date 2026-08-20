UPDATE public.alumni
SET status = v.s, graduation_status = v.s, employment_status = v.s
FROM (
  SELECT id,
    CASE
      WHEN lower(btrim(coalesce(status,''))) IN ('wirausaha') THEN 'wirausaha'
      WHEN nullif(btrim(coalesce(position,'')),'') IS NOT NULL
        OR nullif(btrim(coalesce(company,'')),'') IS NOT NULL THEN 'bekerja'
      WHEN nullif(btrim(coalesce(university,'')),'') IS NOT NULL
        OR nullif(btrim(coalesce(major,'')),'') IS NOT NULL
        OR nullif(btrim(coalesce(further_education,'')),'') IS NOT NULL THEN 'melanjutkan_studi'
      WHEN lower(btrim(coalesce(status,''))) LIKE '%mencari%' THEN 'mencari_kerja'
      ELSE 'belum_mengisi_tracer'
    END AS s
  FROM public.alumni
) v
WHERE v.id = public.alumni.id
  AND (public.alumni.status IS DISTINCT FROM v.s
    OR public.alumni.graduation_status IS DISTINCT FROM v.s
    OR public.alumni.employment_status IS DISTINCT FROM v.s);