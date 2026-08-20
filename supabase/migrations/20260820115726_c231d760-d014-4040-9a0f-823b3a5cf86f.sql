-- 1) ALUMNI: hapus akses baca penuh untuk semua akun terautentikasi
DROP POLICY IF EXISTS "Alumni readable by authenticated users" ON public.alumni;

CREATE POLICY "Alumni can read own row"
ON public.alumni FOR SELECT TO authenticated
USING (user_id = auth.uid() OR profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Tampilan aman untuk direktori & statistik (tanpa NIM, LinkedIn, id user)
CREATE OR REPLACE VIEW public.alumni_directory AS
SELECT
  a.id, a.name, a.full_name, a.gender, a.graduation_year, a.year_graduated, a.origin,
  a.education_level, a.major, a.university, a.university_status, a.faculty,
  a.position, a.company, a.company_type, a.job_field,
  a.work_city, a.work_province, a.work_country, a.location,
  a.further_education, a.target_university,
  a.status, a.graduation_status, a.employment_status,
  a.current_company, a.current_position, a.current_field, a.current_location,
  a.tracer_filled_at, a.created_at, a.updated_at
FROM public.alumni a;

GRANT SELECT ON public.alumni_directory TO authenticated;

-- 2) CBT: sembunyikan kunci jawaban dari peserta
DROP POLICY IF EXISTS "cbt_answers read auth" ON public.cbt_answers;

CREATE POLICY "cbt_answers admin read"
ON public.cbt_answers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.cbt_answer_options AS
SELECT id, question_id, answer_text, created_at
FROM public.cbt_answers;

GRANT SELECT ON public.cbt_answer_options TO authenticated;

-- Penilaian CBT di server
CREATE OR REPLACE FUNCTION public.submit_cbt_attempt(_test_id uuid, _answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _test public.cbt_tests;
  _total int := 0;
  _max int := 0;
  _pct numeric := 0;
  _passed boolean := false;
  _rec text;
  _attempt_id uuid;
  _q record;
  _chosen uuid;
  _score int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Tidak terautentikasi';
  END IF;

  SELECT * INTO _test FROM public.cbt_tests WHERE id = _test_id;
  IF _test.id IS NULL THEN
    RAISE EXCEPTION 'Tes tidak ditemukan';
  END IF;

  INSERT INTO public.cbt_attempts (user_id, test_id, total_score, max_score, percentage, passed, completed_at)
  VALUES (_uid, _test_id, 0, 0, 0, false, now())
  RETURNING id INTO _attempt_id;

  FOR _q IN SELECT id FROM public.cbt_questions WHERE test_id = _test_id LOOP
    _max := _max + COALESCE((SELECT max(score) FROM public.cbt_answers WHERE question_id = _q.id), 0);

    BEGIN
      _chosen := NULLIF(_answers->>(_q.id::text), '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      _chosen := NULL;
    END;

    _score := COALESCE((SELECT score FROM public.cbt_answers WHERE id = _chosen AND question_id = _q.id), 0);
    _total := _total + _score;

    INSERT INTO public.cbt_attempt_answers (attempt_id, question_id, answer_id, score)
    VALUES (_attempt_id, _q.id, _chosen, _score);
  END LOOP;

  _pct := CASE WHEN _max > 0 THEN (_total::numeric / _max) * 100 ELSE 0 END;
  _passed := _pct >= COALESCE(_test.passing_score, 0);

  SELECT CASE c.type::text
    WHEN 'tpa' THEN 'Cocok untuk bidang akademik, riset, dan analisis.'
    WHEN 'minat_bakat' THEN 'Eksplorasi karier sesuai bidang yang paling Anda minati.'
    WHEN 'verbal' THEN 'Cocok untuk komunikasi, jurnalistik, hukum, atau public relations.'
    WHEN 'numerik' THEN 'Cocok untuk akuntansi, keuangan, data analyst, atau engineering.'
    WHEN 'logika' THEN 'Cocok untuk programming, sistem, manajemen, dan problem solving.'
    WHEN 'kepribadian' THEN 'Pahami diri untuk memilih lingkungan kerja yang tepat.'
    ELSE 'Pertimbangkan bidang yang sesuai minat Anda.'
  END INTO _rec
  FROM public.cbt_categories c WHERE c.id = _test.category_id;

  UPDATE public.cbt_attempts
  SET total_score = _total, max_score = _max, percentage = _pct,
      passed = _passed, recommendation = COALESCE(_rec, 'Pertimbangkan bidang yang sesuai minat Anda.')
  WHERE id = _attempt_id;

  RETURN jsonb_build_object(
    'attempt_id', _attempt_id, 'total', _total, 'max', _max,
    'percentage', _pct, 'passed', _passed,
    'recommendation', COALESCE(_rec, 'Pertimbangkan bidang yang sesuai minat Anda.')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_cbt_attempt(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_cbt_attempt(uuid, jsonb) TO authenticated;