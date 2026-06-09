
-- ============ CBT SYSTEM ============
CREATE TYPE public.cbt_category_type AS ENUM ('tpa','minat_bakat','verbal','numerik','logika','kepribadian');

CREATE TABLE public.cbt_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.cbt_category_type NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cbt_categories TO anon, authenticated;
GRANT ALL ON public.cbt_categories TO authenticated, service_role;
ALTER TABLE public.cbt_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cbt_categories read all" ON public.cbt_categories FOR SELECT USING (true);
CREATE POLICY "cbt_categories admin write" ON public.cbt_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cbt_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.cbt_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL DEFAULT 30,
  passing_score INT NOT NULL DEFAULT 60,
  total_questions INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cbt_tests TO anon, authenticated;
GRANT ALL ON public.cbt_tests TO authenticated, service_role;
ALTER TABLE public.cbt_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cbt_tests read all" ON public.cbt_tests FOR SELECT USING (true);
CREATE POLICY "cbt_tests admin write" ON public.cbt_tests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cbt_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.cbt_tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cbt_questions TO authenticated;
GRANT ALL ON public.cbt_questions TO authenticated, service_role;
ALTER TABLE public.cbt_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cbt_questions read auth" ON public.cbt_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "cbt_questions admin write" ON public.cbt_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cbt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.cbt_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cbt_answers TO authenticated;
GRANT ALL ON public.cbt_answers TO authenticated, service_role;
ALTER TABLE public.cbt_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cbt_answers read auth" ON public.cbt_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "cbt_answers admin write" ON public.cbt_answers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cbt_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.cbt_tests(id) ON DELETE CASCADE,
  total_score INT NOT NULL DEFAULT 0,
  max_score INT NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  recommendation TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbt_attempts TO authenticated;
GRANT ALL ON public.cbt_attempts TO service_role;
ALTER TABLE public.cbt_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cbt_attempts own select" ON public.cbt_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cbt_attempts own insert" ON public.cbt_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cbt_attempts own update" ON public.cbt_attempts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cbt_attempts admin delete" ON public.cbt_attempts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cbt_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.cbt_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.cbt_questions(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES public.cbt_answers(id) ON DELETE SET NULL,
  score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cbt_attempt_answers TO authenticated;
GRANT ALL ON public.cbt_attempt_answers TO service_role;
ALTER TABLE public.cbt_attempt_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cbt_attempt_answers select own" ON public.cbt_attempt_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cbt_attempts a WHERE a.id = attempt_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "cbt_attempt_answers insert own" ON public.cbt_attempt_answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cbt_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()));

-- ============ PSIKOTES SYSTEM ============
CREATE TABLE public.psikotes_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.psikotes_categories TO anon, authenticated;
GRANT ALL ON public.psikotes_categories TO authenticated, service_role;
ALTER TABLE public.psikotes_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psi_cat read all" ON public.psikotes_categories FOR SELECT USING (true);
CREATE POLICY "psi_cat admin write" ON public.psikotes_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.psikotes_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.psikotes_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.psikotes_tests TO anon, authenticated;
GRANT ALL ON public.psikotes_tests TO authenticated, service_role;
ALTER TABLE public.psikotes_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psi_tests read all" ON public.psikotes_tests FOR SELECT USING (true);
CREATE POLICY "psi_tests admin write" ON public.psikotes_tests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.psikotes_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.psikotes_tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.psikotes_questions TO authenticated;
GRANT ALL ON public.psikotes_questions TO authenticated, service_role;
ALTER TABLE public.psikotes_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psi_q read auth" ON public.psikotes_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "psi_q admin write" ON public.psikotes_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.psikotes_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.psikotes_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.psikotes_answers TO authenticated;
GRANT ALL ON public.psikotes_answers TO authenticated, service_role;
ALTER TABLE public.psikotes_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psi_a read auth" ON public.psikotes_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "psi_a admin write" ON public.psikotes_answers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.psikotes_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.psikotes_tests(id) ON DELETE CASCADE,
  min_score INT NOT NULL,
  max_score INT NOT NULL,
  level TEXT NOT NULL,
  conclusion TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.psikotes_results TO authenticated;
GRANT ALL ON public.psikotes_results TO authenticated, service_role;
ALTER TABLE public.psikotes_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psi_r read auth" ON public.psikotes_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "psi_r admin write" ON public.psikotes_results FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.psikotes_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.psikotes_tests(id) ON DELETE CASCADE,
  total_score INT NOT NULL DEFAULT 0,
  level TEXT,
  conclusion TEXT,
  recommendation TEXT,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.psikotes_attempts TO authenticated;
GRANT ALL ON public.psikotes_attempts TO service_role;
ALTER TABLE public.psikotes_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psi_att select own" ON public.psikotes_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "psi_att insert own" ON public.psikotes_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "psi_att admin del" ON public.psikotes_attempts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- triggers updated_at
CREATE TRIGGER trg_cbt_cat_upd BEFORE UPDATE ON public.cbt_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cbt_tests_upd BEFORE UPDATE ON public.cbt_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_psi_cat_upd BEFORE UPDATE ON public.psikotes_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_psi_tests_upd BEFORE UPDATE ON public.psikotes_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED DATA ============
-- CBT Categories
INSERT INTO public.cbt_categories (id, name, type, description) VALUES
  ('11111111-1111-1111-1111-111111111101','Tes Potensi Akademik','tpa','Mengukur kemampuan akademik umum'),
  ('11111111-1111-1111-1111-111111111102','Minat Bakat','minat_bakat','Mengidentifikasi minat dan bakat'),
  ('11111111-1111-1111-1111-111111111103','Tes Verbal','verbal','Kemampuan bahasa dan pemahaman'),
  ('11111111-1111-1111-1111-111111111104','Tes Numerik','numerik','Kemampuan angka dan hitungan'),
  ('11111111-1111-1111-1111-111111111105','Tes Logika','logika','Penalaran logis'),
  ('11111111-1111-1111-1111-111111111106','Tes Kepribadian','kepribadian','Profil kepribadian');

-- Sample CBT Test (Numerik)
INSERT INTO public.cbt_tests (id, category_id, title, description, duration_minutes, passing_score, total_questions) VALUES
  ('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111104','Tes Numerik Dasar','Hitungan dasar dan pola angka',15,60,3),
  ('22222222-2222-2222-2222-222222222202','11111111-1111-1111-1111-111111111103','Tes Verbal Sinonim','Padanan kata',10,60,3),
  ('22222222-2222-2222-2222-222222222203','11111111-1111-1111-1111-111111111102','Tes Minat Bakat','Identifikasi minat karier',15,0,3);

-- Numerik questions
INSERT INTO public.cbt_questions (id, test_id, question_text, order_index, explanation) VALUES
  ('33333333-3333-3333-3333-333333333301','22222222-2222-2222-2222-222222222201','Berapakah hasil dari 15 × 12?',1,'15 × 12 = 180'),
  ('33333333-3333-3333-3333-333333333302','22222222-2222-2222-2222-222222222201','Lanjutkan pola: 2, 4, 8, 16, ...',2,'Pola dikali 2, jadi 32'),
  ('33333333-3333-3333-3333-333333333303','22222222-2222-2222-2222-222222222201','Berapa 25% dari 240?',3,'25% × 240 = 60');

INSERT INTO public.cbt_answers (question_id, answer_text, is_correct, score) VALUES
  ('33333333-3333-3333-3333-333333333301','170',false,0),
  ('33333333-3333-3333-3333-333333333301','180',true,10),
  ('33333333-3333-3333-3333-333333333301','190',false,0),
  ('33333333-3333-3333-3333-333333333301','200',false,0),
  ('33333333-3333-3333-3333-333333333302','24',false,0),
  ('33333333-3333-3333-3333-333333333302','30',false,0),
  ('33333333-3333-3333-3333-333333333302','32',true,10),
  ('33333333-3333-3333-3333-333333333302','64',false,0),
  ('33333333-3333-3333-3333-333333333303','50',false,0),
  ('33333333-3333-3333-3333-333333333303','60',true,10),
  ('33333333-3333-3333-3333-333333333303','70',false,0),
  ('33333333-3333-3333-3333-333333333303','80',false,0);

-- Verbal questions
INSERT INTO public.cbt_questions (id, test_id, question_text, order_index, explanation) VALUES
  ('33333333-3333-3333-3333-333333333401','22222222-2222-2222-2222-222222222202','Sinonim dari "ABADI" adalah...',1,'Abadi = kekal'),
  ('33333333-3333-3333-3333-333333333402','22222222-2222-2222-2222-222222222202','Sinonim dari "PROAKTIF" adalah...',2,'Proaktif = inisiatif'),
  ('33333333-3333-3333-3333-333333333403','22222222-2222-2222-2222-222222222202','Sinonim dari "MUFAKAT" adalah...',3,'Mufakat = sepakat');

INSERT INTO public.cbt_answers (question_id, answer_text, is_correct, score) VALUES
  ('33333333-3333-3333-3333-333333333401','Kekal',true,10),
  ('33333333-3333-3333-3333-333333333401','Sementara',false,0),
  ('33333333-3333-3333-3333-333333333401','Cepat',false,0),
  ('33333333-3333-3333-3333-333333333401','Indah',false,0),
  ('33333333-3333-3333-3333-333333333402','Pasif',false,0),
  ('33333333-3333-3333-3333-333333333402','Inisiatif',true,10),
  ('33333333-3333-3333-3333-333333333402','Lambat',false,0),
  ('33333333-3333-3333-3333-333333333402','Diam',false,0),
  ('33333333-3333-3333-3333-333333333403','Setuju',true,10),
  ('33333333-3333-3333-3333-333333333403','Tolak',false,0),
  ('33333333-3333-3333-3333-333333333403','Tunda',false,0),
  ('33333333-3333-3333-3333-333333333403','Pisah',false,0);

-- Minat bakat (scoring style)
INSERT INTO public.cbt_questions (id, test_id, question_text, order_index, explanation) VALUES
  ('33333333-3333-3333-3333-333333333501','22222222-2222-2222-2222-222222222203','Aktivitas mana yang paling Anda sukai?',1,NULL),
  ('33333333-3333-3333-3333-333333333502','22222222-2222-2222-2222-222222222203','Mata pelajaran favorit Anda?',2,NULL),
  ('33333333-3333-3333-3333-333333333503','22222222-2222-2222-2222-222222222203','Cita-cita karier ideal Anda?',3,NULL);

INSERT INTO public.cbt_answers (question_id, answer_text, is_correct, score) VALUES
  ('33333333-3333-3333-3333-333333333501','Menulis & membaca',true,10),
  ('33333333-3333-3333-3333-333333333501','Eksperimen sains',true,10),
  ('33333333-3333-3333-3333-333333333501','Berbicara di depan publik',true,10),
  ('33333333-3333-3333-3333-333333333501','Menggambar/desain',true,10),
  ('33333333-3333-3333-3333-333333333502','Bahasa',true,10),
  ('33333333-3333-3333-3333-333333333502','MIPA',true,10),
  ('33333333-3333-3333-3333-333333333502','Sosial',true,10),
  ('33333333-3333-3333-3333-333333333502','Seni',true,10),
  ('33333333-3333-3333-3333-333333333503','Penulis/Jurnalis',true,10),
  ('33333333-3333-3333-3333-333333333503','Engineer/Saintis',true,10),
  ('33333333-3333-3333-3333-333333333503','Pengusaha/Marketing',true,10),
  ('33333333-3333-3333-3333-333333333503','Desainer/Seniman',true,10);

-- Psikotes Categories
INSERT INTO public.psikotes_categories (id, name, description) VALUES
  ('44444444-4444-4444-4444-444444444401','Stress','Tingkat stres harian'),
  ('44444444-4444-4444-4444-444444444402','Kecemasan','Tingkat kecemasan'),
  ('44444444-4444-4444-4444-444444444403','Overthinking','Kecenderungan overthinking'),
  ('44444444-4444-4444-4444-444444444404','Mental Health Check','Cek kesehatan mental umum'),
  ('44444444-4444-4444-4444-444444444405','Kepercayaan Diri','Tingkat kepercayaan diri');

-- Sample Psikotes Stress
INSERT INTO public.psikotes_tests (id, category_id, title, description) VALUES
  ('55555555-5555-5555-5555-555555555501','44444444-4444-4444-4444-444444444401','Tes Tingkat Stres','5 pertanyaan singkat tentang stres'),
  ('55555555-5555-5555-5555-555555555502','44444444-4444-4444-4444-444444444402','Tes Tingkat Kecemasan','Mengukur tingkat kecemasan'),
  ('55555555-5555-5555-5555-555555555503','44444444-4444-4444-4444-444444444405','Tes Kepercayaan Diri','Cek kepercayaan diri Anda');

-- Stress questions (5 q, max score 5*3=15)
INSERT INTO public.psikotes_questions (id, test_id, question_text, order_index) VALUES
  ('66666666-6666-6666-6666-666666666601','55555555-5555-5555-5555-555555555501','Saya merasa kewalahan dengan tugas harian',1),
  ('66666666-6666-6666-6666-666666666602','55555555-5555-5555-5555-555555555501','Saya sulit tidur karena memikirkan masalah',2),
  ('66666666-6666-6666-6666-666666666603','55555555-5555-5555-5555-555555555501','Saya mudah marah/tersinggung',3),
  ('66666666-6666-6666-6666-666666666604','55555555-5555-5555-5555-555555555501','Saya merasa lelah secara fisik tanpa alasan jelas',4),
  ('66666666-6666-6666-6666-666666666605','55555555-5555-5555-5555-555555555501','Saya kesulitan fokus pada pekerjaan',5);

INSERT INTO public.psikotes_answers (question_id, answer_text, score)
SELECT id, opt.text, opt.score FROM public.psikotes_questions q
CROSS JOIN (VALUES ('Tidak pernah',0),('Kadang-kadang',1),('Sering',2),('Selalu',3)) AS opt(text,score)
WHERE q.test_id='55555555-5555-5555-5555-555555555501';

INSERT INTO public.psikotes_results (test_id, min_score, max_score, level, conclusion, recommendation) VALUES
  ('55555555-5555-5555-5555-555555555501',0,5,'Ringan','Tingkat stres Anda rendah. Anda mengelola tekanan dengan baik.','Pertahankan rutinitas sehat: tidur cukup, olahraga ringan, dan ibadah teratur.'),
  ('55555555-5555-5555-5555-555555555501',6,10,'Sedang','Anda mengalami stres tingkat sedang yang perlu perhatian.','Coba teknik relaksasi (deep breathing), kurangi beban kerja, dan bicarakan dengan teman/keluarga.'),
  ('55555555-5555-5555-5555-555555555501',11,15,'Tinggi','Tingkat stres Anda tinggi dan dapat mengganggu aktivitas.','Segera konsultasikan dengan konselor atau psikolog. Hubungi layanan konseling PEDULI.');

-- Kecemasan
INSERT INTO public.psikotes_questions (id, test_id, question_text, order_index) VALUES
  ('66666666-6666-6666-6666-666666666701','55555555-5555-5555-5555-555555555502','Jantung saya berdebar tanpa sebab jelas',1),
  ('66666666-6666-6666-6666-666666666702','55555555-5555-5555-5555-555555555502','Saya khawatir berlebihan akan masa depan',2),
  ('66666666-6666-6666-6666-666666666703','55555555-5555-5555-5555-555555555502','Saya merasa tegang di situasi sosial',3),
  ('66666666-6666-6666-6666-666666666704','55555555-5555-5555-5555-555555555502','Saya menghindari situasi tertentu karena takut',4),
  ('66666666-6666-6666-6666-666666666705','55555555-5555-5555-5555-555555555502','Saya sulit rileks',5);

INSERT INTO public.psikotes_answers (question_id, answer_text, score)
SELECT id, opt.text, opt.score FROM public.psikotes_questions q
CROSS JOIN (VALUES ('Tidak pernah',0),('Kadang-kadang',1),('Sering',2),('Selalu',3)) AS opt(text,score)
WHERE q.test_id='55555555-5555-5555-5555-555555555502';

INSERT INTO public.psikotes_results (test_id, min_score, max_score, level, conclusion, recommendation) VALUES
  ('55555555-5555-5555-5555-555555555502',0,5,'Ringan','Kecemasan Anda dalam batas normal.','Lakukan aktivitas positif dan jaga pola hidup seimbang.'),
  ('55555555-5555-5555-5555-555555555502',6,10,'Sedang','Anda mengalami kecemasan tingkat sedang.','Latihan mindfulness dan dzikir dapat membantu. Pertimbangkan konsultasi konselor.'),
  ('55555555-5555-5555-5555-555555555502',11,15,'Tinggi','Kecemasan Anda tinggi dan perlu penanganan serius.','Sangat disarankan untuk berkonsultasi dengan psikolog profesional segera.');

-- Kepercayaan diri (reverse: skor tinggi = PD tinggi)
INSERT INTO public.psikotes_questions (id, test_id, question_text, order_index) VALUES
  ('66666666-6666-6666-6666-666666666801','55555555-5555-5555-5555-555555555503','Saya yakin dengan kemampuan diri saya',1),
  ('66666666-6666-6666-6666-666666666802','55555555-5555-5555-5555-555555555503','Saya berani berbicara di depan umum',2),
  ('66666666-6666-6666-6666-666666666803','55555555-5555-5555-5555-555555555503','Saya nyaman dengan penampilan saya',3),
  ('66666666-6666-6666-6666-666666666804','55555555-5555-5555-5555-555555555503','Saya berani mencoba hal baru',4),
  ('66666666-6666-6666-6666-666666666805','55555555-5555-5555-5555-555555555503','Saya menerima pujian dengan baik',5);

INSERT INTO public.psikotes_answers (question_id, answer_text, score)
SELECT id, opt.text, opt.score FROM public.psikotes_questions q
CROSS JOIN (VALUES ('Sangat Tidak Setuju',0),('Tidak Setuju',1),('Setuju',2),('Sangat Setuju',3)) AS opt(text,score)
WHERE q.test_id='55555555-5555-5555-5555-555555555503';

INSERT INTO public.psikotes_results (test_id, min_score, max_score, level, conclusion, recommendation) VALUES
  ('55555555-5555-5555-5555-555555555503',0,5,'Rendah','Kepercayaan diri Anda perlu ditingkatkan.','Mulailah dengan menetapkan target kecil dan rayakan setiap pencapaian. Konseling motivasi sangat membantu.'),
  ('55555555-5555-5555-5555-555555555503',6,10,'Sedang','Kepercayaan diri Anda cukup baik namun masih bisa berkembang.','Latih public speaking dan keluar dari zona nyaman secara bertahap.'),
  ('55555555-5555-5555-5555-555555555503',11,15,'Tinggi','Anda memiliki kepercayaan diri yang baik!','Pertahankan dan bantu orang lain menemukan kepercayaan diri mereka.');
