-- Production Schema Migration for Career Center PEDULI (Take 2)

-- 1. Setup Role Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'santri', 'alumni', 'mitra');
    END IF;
END $$;

-- 2. Profiles Update
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.app_role DEFAULT 'santri';

-- 3. Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    industry TEXT,
    city TEXT,
    country TEXT,
    website TEXT,
    logo_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

-- 4. Universities Adjustment
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'universities' AND column_name = 'website_url') THEN
        ALTER TABLE public.universities RENAME COLUMN website_url TO website;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'universities' AND column_name = 'type') THEN
        ALTER TABLE public.universities RENAME COLUMN type TO category;
    END IF;
END $$;

ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 5. Alumni Alignment
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES public.universities(id);
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS nim TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS graduation_status TEXT DEFAULT 'belum mengisi tracer';
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'belum mengisi tracer';
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS current_company TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS current_position TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS current_field TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS current_location TEXT;
ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- 6. Jobs Alignment
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_min NUMERIC;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_max NUMERIC;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deadline DATE;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'type') THEN
        ALTER TABLE public.jobs RENAME COLUMN type TO employment_type;
    END IF;
END $$;

-- 7. Career & Education Tables
CREATE TABLE IF NOT EXISTS public.alumni_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumni_id UUID REFERENCES public.alumni(id) ON DELETE CASCADE,
    university_id UUID REFERENCES public.universities(id),
    degree TEXT,
    major TEXT,
    start_year INTEGER,
    end_year INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_education TO authenticated;
GRANT ALL ON public.alumni_education TO service_role;

CREATE TABLE IF NOT EXISTS public.alumni_employment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumni_id UUID REFERENCES public.alumni(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id),
    position TEXT,
    start_date DATE,
    end_date DATE,
    employment_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_employment TO authenticated;
GRANT ALL ON public.alumni_employment TO service_role;

CREATE TABLE IF NOT EXISTS public.career_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumni_id UUID REFERENCES public.alumni(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id),
    position TEXT,
    employment_status TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_updates TO authenticated;
GRANT ALL ON public.career_updates TO service_role;

-- 8. Psychotests & Results
CREATE TABLE IF NOT EXISTS public.psychotests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psychotests TO authenticated;
GRANT ALL ON public.psychotests TO service_role;

CREATE TABLE IF NOT EXISTS public.psychotest_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psychotest_id UUID REFERENCES public.psychotests(id) ON DELETE CASCADE,
    alumni_id UUID REFERENCES public.alumni(id) ON DELETE CASCADE,
    score INTEGER,
    result TEXT,
    completed_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psychotest_results TO authenticated;
GRANT ALL ON public.psychotest_results TO service_role;

-- 9. CBT Results Alignment
CREATE TABLE IF NOT EXISTS public.cbt_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cbt_test_id UUID REFERENCES public.cbt_tests(id) ON DELETE CASCADE,
    alumni_id UUID REFERENCES public.alumni(id) ON DELETE CASCADE,
    score INTEGER,
    completed_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbt_results TO authenticated;
GRANT ALL ON public.cbt_results TO service_role;

-- 10. Counseling & Notifications
CREATE TABLE IF NOT EXISTS public.counseling (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumni_id UUID REFERENCES public.alumni(id) ON DELETE CASCADE,
    counselor_name TEXT,
    topic TEXT,
    schedule TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.counseling TO authenticated;
GRANT ALL ON public.counseling TO service_role;

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- 11. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('profiles', 'universities', 'companies', 'alumni', 'jobs', 'job_applications', 'partners', 'events', 'psychotests', 'cbt_tests', 'career_updates', 'counseling')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()', t);
    END LOOP;
END $$;

-- 12. Security Policies (Using has_role)
-- Ensure user_roles exists and sync with profiles.role
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Function to check role safely
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Trigger to sync profiles.role to user_roles
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, NEW.role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Optionally remove other roles if you only want one role per user
    DELETE FROM public.user_roles
    WHERE user_id = NEW.id AND role <> NEW.role;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_sync ON public.profiles;
CREATE TRIGGER on_profile_role_sync
    AFTER INSERT OR UPDATE OF role ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.sync_profile_role();

-- 13. Example RLS Policies
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        
        -- Admin Policy
        EXECUTE format('DROP POLICY IF EXISTS "Admins have full access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Admins have full access" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))', t);
    END LOOP;
END $$;

-- 14. Realtime (Idempotent approach)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT name 
        FROM (VALUES 
            ('profiles'), ('alumni'), ('alumni_education'), 
            ('alumni_employment'), ('career_updates'), ('jobs'), 
            ('job_applications'), ('events'), ('notifications')
        ) AS tab(name)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
