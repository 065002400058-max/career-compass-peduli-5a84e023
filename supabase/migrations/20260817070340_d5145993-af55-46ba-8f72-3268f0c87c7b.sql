ALTER TABLE public.alumni
  ADD COLUMN IF NOT EXISTS year_graduated integer,
  ADD COLUMN IF NOT EXISTS faculty text,
  ADD COLUMN IF NOT EXISTS university_status text,
  ADD COLUMN IF NOT EXISTS job_field text,
  ADD COLUMN IF NOT EXISTS company_type text,
  ADD COLUMN IF NOT EXISTS work_city text,
  ADD COLUMN IF NOT EXISTS work_province text,
  ADD COLUMN IF NOT EXISTS work_country text,
  ADD COLUMN IF NOT EXISTS further_education text,
  ADD COLUMN IF NOT EXISTS target_university text,
  ADD COLUMN IF NOT EXISTS tracer_filled_at timestamp with time zone;