
CREATE TYPE public.university_type AS ENUM ('dalam_negeri', 'luar_negeri', 'kedinasan');

CREATE TABLE public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Indonesia',
  type public.university_type NOT NULL DEFAULT 'dalam_negeri',
  website_url TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.universities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.universities TO authenticated;
GRANT ALL ON public.universities TO service_role;

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Universities public read" ON public.universities FOR SELECT USING (true);
CREATE POLICY "Admins insert universities" ON public.universities FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update universities" ON public.universities FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete universities" ON public.universities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_universities_updated_at BEFORE UPDATE ON public.universities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.universities (name, country, type, website_url, description, city) VALUES
('Universitas Indonesia', 'Indonesia', 'dalam_negeri', 'https://www.ui.ac.id', 'PTN terkemuka di Depok dengan beragam program studi unggulan.', 'Depok'),
('Institut Teknologi Bandung', 'Indonesia', 'dalam_negeri', 'https://www.itb.ac.id', 'PTN teknik terbaik di Indonesia.', 'Bandung'),
('Universitas Gadjah Mada', 'Indonesia', 'dalam_negeri', 'https://www.ugm.ac.id', 'PTN tertua dan terbesar di Yogyakarta.', 'Yogyakarta'),
('Institut Pertanian Bogor', 'Indonesia', 'dalam_negeri', 'https://www.ipb.ac.id', 'PTN unggulan di bidang pertanian, sains, dan teknologi.', 'Bogor'),
('Harvard University', 'Amerika Serikat', 'luar_negeri', 'https://www.harvard.edu', 'Universitas Ivy League ternama di dunia.', 'Cambridge'),
('National University of Singapore', 'Singapura', 'luar_negeri', 'https://www.nus.edu.sg', 'Universitas top di Asia Tenggara.', 'Singapore'),
('Al-Azhar University', 'Mesir', 'luar_negeri', 'https://www.azhar.edu.eg', 'Universitas Islam tertua dan paling bergengsi di dunia.', 'Cairo'),
('University of Oxford', 'Inggris', 'luar_negeri', 'https://www.ox.ac.uk', 'Salah satu universitas tertua dan terbaik di dunia.', 'Oxford'),
('PKN STAN', 'Indonesia', 'kedinasan', 'https://www.pknstan.ac.id', 'Politeknik Keuangan Negara di bawah Kementerian Keuangan.', 'Tangerang Selatan'),
('IPDN', 'Indonesia', 'kedinasan', 'https://www.ipdn.ac.id', 'Institut Pemerintahan Dalam Negeri di bawah Kemendagri.', 'Sumedang'),
('Akademi Militer', 'Indonesia', 'kedinasan', 'https://www.akmil.ac.id', 'Lembaga pendidikan perwira TNI Angkatan Darat.', 'Magelang'),
('Akademi Kepolisian', 'Indonesia', 'kedinasan', 'https://www.akpol.ac.id', 'Lembaga pendidikan perwira Polri.', 'Semarang'),
('STIN', 'Indonesia', 'kedinasan', 'https://www.stin.ac.id', 'Sekolah Tinggi Intelijen Negara.', 'Bogor'),
('Poltekim & Poltekip', 'Indonesia', 'kedinasan', 'https://www.poltekim.ac.id', 'Politeknik di bawah Kemenkumham.', 'Depok');
