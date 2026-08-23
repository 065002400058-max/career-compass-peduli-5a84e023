-- ============================================================
-- Perbaikan temuan keamanan (linter + psikotes exposure)
-- ============================================================

-- A) search_path untuk fungsi antrean email
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- B) Fungsi trigger: tidak boleh dipanggil langsung oleh siapa pun via API
REVOKE EXECUTE ON FUNCTION public.normalize_allowed_login_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_lockout() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_allowed_login_email_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admin_on_new_alumni() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileges() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_counseling_referral() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;

-- C) Fungsi internal backend: hanya service_role
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_ai_quota(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_quota_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_quota_status(uuid) TO service_role;

-- D) Fungsi yang memang dipakai pengguna login: cabut dari anon, pertahankan untuk authenticated
REVOKE EXECUTE ON FUNCTION public.cbt_answer_options(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_cbt_attempt(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_graduate_status(text, integer, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.link_or_create_alumni(uuid, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.clear_must_change_password() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cbt_answer_options(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_cbt_attempt(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_graduate_status(text, integer, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_or_create_alumni(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;
-- Catatan: has_role, alumni_directory, dan public_stats sengaja tetap bisa dipanggil anon
-- karena dipakai policy publik & halaman publik (landing, direktori alumni, statistik).

-- E) Psikotes: kunci kunci jawaban & interpretasi skor
DROP POLICY IF EXISTS "psi_a read auth" ON public.psikotes_answers;
DROP POLICY IF EXISTS "psi_r read auth" ON public.psikotes_results;

-- Pilihan jawaban tanpa skor untuk peserta tes
CREATE OR REPLACE FUNCTION public.psikotes_answer_options(_test_id uuid)
RETURNS TABLE(id uuid, question_id uuid, answer_text text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.id, a.question_id, a.answer_text
  FROM public.psikotes_answers a
  JOIN public.psikotes_questions q ON q.id = a.question_id
  WHERE q.test_id = _test_id AND auth.uid() IS NOT NULL
  ORDER BY a.created_at
$$;

REVOKE EXECUTE ON FUNCTION public.psikotes_answer_options(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psikotes_answer_options(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.psikotes_answer_options(uuid) TO service_role;

-- Penilaian & penyimpanan attempt sepenuhnya di server
CREATE OR REPLACE FUNCTION public.submit_psikotes_attempt(_test_id uuid, _answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _title text;
  _cat text;
  _hay text;
  _kind text;
  _total integer := 0;
  _count integer := 0;
  _q record;
  _answer_id uuid;
  _score integer;
  _scored integer;
  _answer_data jsonb := '[]'::jsonb;
  _level text;
  _conclusion text;
  _recommendation text;
  _display text;
  _mean numeric;
  _attempt_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT t.title, c.name INTO _title, _cat
  FROM public.psikotes_tests t
  LEFT JOIN public.psikotes_categories c ON c.id = t.category_id
  WHERE t.id = _test_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'test_not_found';
  END IF;

  _hay := lower(coalesce(_title, '') || ' ' || coalesce(_cat, ''));
  _kind := CASE
    WHEN _hay LIKE '%pss%' OR _hay LIKE '%perceived stress%' THEN 'pss10'
    WHEN _hay LIKE '%brs%' OR _hay LIKE '%brief resilience%' OR _hay LIKE '%ketahanan%' OR _hay LIKE '%resilien%' THEN 'brs'
    WHEN _hay LIKE '%srq%' OR _hay LIKE '%self rating%' OR _hay LIKE '%self-rating%' THEN 'srq20'
    ELSE NULL
  END;

  FOR _q IN
    SELECT id FROM public.psikotes_questions WHERE test_id = _test_id ORDER BY order_index
  LOOP
    _count := _count + 1;
    _answer_id := NULLIF(_answers ->> _q.id::text, '')::uuid;
    SELECT a.score INTO _score
    FROM public.psikotes_answers a
    WHERE a.id = _answer_id AND a.question_id = _q.id;
    _score := COALESCE(_score, 0);
    _scored := CASE
      WHEN _kind = 'brs' AND _count IN (2, 4, 6) THEN 6 - _score
      WHEN _kind = 'pss10' AND _count IN (4, 5, 7, 8) THEN 4 - _score
      ELSE _score
    END;
    _total := _total + _scored;
    _answer_data := _answer_data || jsonb_build_object(
      'question_id', _q.id,
      'answer_id', _answer_id,
      'score', _score,
      'scored', _scored
    );
  END LOOP;

  IF _kind = 'pss10' THEN
    _display := _total::text;
    IF _total <= 13 THEN
      _level := 'Tingkat Stres Rendah';
      _conclusion := 'Tingkat stres Anda saat ini berada pada kategori rendah. Ini menunjukkan bahwa secara umum Anda cukup mampu menghadapi tekanan dalam keseharian.';
      _recommendation := 'Pertahankan kebiasaan positif yang sudah Anda lakukan. Tetap jaga pola tidur, waktu istirahat, aktivitas yang menyenangkan, dan hubungan dengan orang-orang yang mendukung Anda.';
    ELSIF _total <= 26 THEN
      _level := 'Tingkat Stres Sedang';
      _conclusion := 'Tingkat stres Anda berada pada kategori sedang. Beberapa tekanan mungkin mulai memengaruhi keseharian Anda, sehingga penting untuk memberikan perhatian lebih pada kondisi diri.';
      _recommendation := 'Cobalah mengatur waktu istirahat, menentukan prioritas, melakukan aktivitas yang membantu Anda rileks, dan berbicara dengan orang yang Anda percaya ketika merasa terbebani.';
    ELSE
      _level := 'Tingkat Stres Tinggi';
      _conclusion := 'Tingkat stres Anda berada pada kategori tinggi. Hasil ini menunjukkan bahwa Anda mungkin sedang menghadapi tekanan yang cukup berat.';
      _recommendation := 'Berikan waktu untuk diri sendiri dan jangan ragu mencari dukungan. Anda dapat mempertimbangkan untuk berbicara dengan konselor atau tenaga profesional agar mendapatkan pendampingan yang sesuai.';
    END IF;
  ELSIF _kind = 'brs' THEN
    _mean := round((_total::numeric / greatest(_count, 1)) * 100) / 100;
    _display := to_char(_mean, 'FM0.00');
    IF _mean < 3 THEN
      _level := 'Resiliensi Rendah';
      _conclusion := 'Hasil menunjukkan bahwa kemampuan Anda untuk bangkit dan pulih setelah menghadapi situasi sulit saat ini berada pada kategori resiliensi rendah.';
      _recommendation := 'Ini bukan berarti Anda lemah. Setiap orang memiliki proses yang berbeda dalam menghadapi kesulitan. Cobalah membangun dukungan dari orang yang dipercaya dan menghadapi tantangan secara bertahap.';
    ELSIF _mean <= 4.3 THEN
      _level := 'Resiliensi Normal';
      _conclusion := 'Hasil menunjukkan bahwa kemampuan Anda untuk bangkit dan beradaptasi setelah menghadapi situasi sulit berada pada kategori normal.';
      _recommendation := 'Pertahankan kemampuan positif yang sudah Anda miliki. Tetap belajar dari pengalaman, menjaga hubungan dengan orang-orang yang mendukung, dan memberikan waktu bagi diri sendiri ketika menghadapi tantangan.';
    ELSE
      _level := 'Resiliensi Tinggi';
      _conclusion := 'Hasil menunjukkan bahwa Anda memiliki kemampuan resiliensi yang baik dalam menghadapi dan bangkit dari situasi sulit.';
      _recommendation := 'Pertahankan kekuatan positif ini dan terus gunakan pengalaman yang Anda miliki untuk berkembang. Tetap terbuka terhadap dukungan dari orang lain ketika membutuhkannya.';
    END IF;
  ELSIF _kind = 'srq20' THEN
    _display := _total::text;
    IF _total > 5 THEN
      _level := 'Ada kemungkinan gejala cemas/depresi';
      _conclusion := 'Hasil screening menunjukkan adanya kemungkinan gejala yang berkaitan dengan kecemasan atau depresi. Hasil ini bukan diagnosis, tetapi dapat menjadi tanda bahwa kondisi Anda perlu mendapatkan perhatian lebih.';
      _recommendation := 'Anda tidak perlu menghadapi semuanya sendirian. Pertimbangkan untuk berbicara dengan konselor atau tenaga profesional agar mendapatkan dukungan dan pemahaman yang lebih sesuai dengan kondisi Anda.';
    ELSE
      _level := 'Tidak melewati batas interpretasi';
      _conclusion := 'Berdasarkan skor yang diperoleh, hasil Anda berada pada atau di bawah batas interpretasi yang digunakan dalam sistem ini.';
      _recommendation := 'Tetap jaga kesehatan mental dan keseimbangan aktivitas sehari-hari. Jika Anda memiliki keluhan atau kekhawatiran tertentu, jangan ragu untuk berbicara dengan konselor.';
    END IF;
  ELSE
    SELECT r.level, r.conclusion, r.recommendation
    INTO _level, _conclusion, _recommendation
    FROM public.psikotes_results r
    WHERE r.test_id = _test_id AND _total >= r.min_score AND _total <= r.max_score
    ORDER BY r.min_score
    LIMIT 1;
    _level := COALESCE(_level, 'Hasil Screening');
    _conclusion := COALESCE(_conclusion, 'Berdasarkan hasil screening, skor Anda telah tercatat pada sistem.');
    _recommendation := COALESCE(_recommendation, 'Jika Anda merasa perlu berbicara lebih lanjut, Anda dapat menghubungi konselor kami.');
    _display := _total::text;
  END IF;

  INSERT INTO public.psikotes_attempts (user_id, test_id, total_score, level, conclusion, recommendation, answers)
  VALUES (_uid, _test_id, _total, _level, _conclusion, _recommendation, _answer_data)
  RETURNING id INTO _attempt_id;

  RETURN jsonb_build_object(
    'attempt_id', _attempt_id,
    'total_score', _total,
    'display_score', _display,
    'level', _level,
    'conclusion', _conclusion,
    'recommendation', _recommendation
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_psikotes_attempt(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_psikotes_attempt(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_psikotes_attempt(uuid, jsonb) TO service_role;