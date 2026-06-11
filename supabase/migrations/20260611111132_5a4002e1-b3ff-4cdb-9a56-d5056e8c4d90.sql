
-- chat_threads
CREATE TABLE public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Percakapan Baru',
  mode TEXT NOT NULL DEFAULT 'umum',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own threads" ON public.chat_threads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_chat_threads_updated BEFORE UPDATE ON public.chat_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- chat_messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.chat_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_chat_messages_thread ON public.chat_messages(thread_id, created_at);

-- scholarships
CREATE TABLE public.scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'S1',
  country TEXT DEFAULT 'Indonesia',
  amount TEXT,
  deadline DATE,
  description TEXT,
  requirements TEXT,
  url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scholarships TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.scholarships TO authenticated;
GRANT ALL ON public.scholarships TO service_role;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view scholarships" ON public.scholarships FOR SELECT USING (true);
CREATE POLICY "admin manage scholarships" ON public.scholarships FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_scholarships_updated BEFORE UPDATE ON public.scholarships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- alumni_stories
CREATE TABLE public.alumni_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'Pengalaman',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.alumni_stories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.alumni_stories TO authenticated;
GRANT ALL ON public.alumni_stories TO service_role;
ALTER TABLE public.alumni_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view stories" ON public.alumni_stories FOR SELECT USING (is_published = true OR auth.uid() = user_id);
CREATE POLICY "create own story" ON public.alumni_stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own story" ON public.alumni_stories FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "delete own story" ON public.alumni_stories FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_stories_updated BEFORE UPDATE ON public.alumni_stories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- counseling_referrals
CREATE TABLE public.counseling_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Sedang',
  source TEXT DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.counseling_referrals TO authenticated;
GRANT ALL ON public.counseling_referrals TO service_role;
ALTER TABLE public.counseling_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referrals" ON public.counseling_referrals FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "create referral" ON public.counseling_referrals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin update referral" ON public.counseling_referrals FOR UPDATE USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ref_updated BEFORE UPDATE ON public.counseling_referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
