DROP VIEW IF EXISTS public.alumni_directory;
DROP VIEW IF EXISTS public.cbt_answer_options;

CREATE OR REPLACE FUNCTION public.alumni_directory()
RETURNS TABLE (
  id uuid, name text, full_name text, gender text, graduation_year integer,
  origin text, education_level text, major text, university text,
  university_status text, faculty text, "position" text, company text,
  company_type text, job_field text, work_city text, work_province text,
  work_country text, location text, further_education text, target_university text,
  status text, graduation_status text, employment_status text,
  tracer_filled_at timestamptz, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.name, a.full_name, a.gender, a.graduation_year,
         a.origin, a.education_level, a.major, a.university,
         a.university_status, a.faculty, a."position", a.company,
         a.company_type, a.job_field, a.work_city, a.work_province,
         a.work_country, a.location, a.further_education, a.target_university,
         a.status, a.graduation_status, a.employment_status,
         a.tracer_filled_at, a.created_at, a.updated_at
  FROM public.alumni a
  WHERE auth.uid() IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.alumni_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.alumni_directory() TO authenticated;

CREATE OR REPLACE FUNCTION public.cbt_answer_options(_test_id uuid)
RETURNS TABLE (id uuid, question_id uuid, answer_text text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.question_id, a.answer_text
  FROM public.cbt_answers a
  JOIN public.cbt_questions q ON q.id = a.question_id
  WHERE q.test_id = _test_id AND auth.uid() IS NOT NULL
  ORDER BY a.created_at
$$;

REVOKE ALL ON FUNCTION public.cbt_answer_options(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cbt_answer_options(uuid) TO authenticated;