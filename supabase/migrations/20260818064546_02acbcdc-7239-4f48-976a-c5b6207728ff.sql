-- Combined Migration Script
-- 1. Setup Role Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'santri', 'alumni', 'mitra');
    END IF;
END $$;

-- 2. Profiles Update
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    role public.app_role DEFAULT 'santri',
    avatar_url TEXT,
    phone TEXT,
    gender TEXT,
    birth_date DATE,
    origin TEXT,
    address TEXT,
    school_origin TEXT,
    education_level TEXT,
    major TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

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

-- 4. Universities
CREATE TABLE IF NOT EXISTS public.universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    website TEXT,
    logo_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.universities TO authenticated;
GRANT SELECT ON public.universities TO anon;
GRANT ALL ON public.universities TO service_role;

-- 5. Alumni
CREATE TABLE IF NOT EXISTS public.alumni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gender TEXT,
    graduation_year INTEGER,
    origin TEXT,
    education_level TEXT,
    major TEXT,
    university TEXT,
    university_status TEXT,
    status TEXT DEFAULT 'belum mengisi tracer',
    job_field TEXT,
    company TEXT,
    position TEXT,
    work_city TEXT,
    university_id UUID REFERENCES public.universities(id),
    nim TEXT,
    graduation_status TEXT DEFAULT 'belum mengisi tracer',
    employment_status TEXT DEFAULT 'belum mengisi tracer',
    current_company TEXT,
    current_position TEXT,
    current_field TEXT,
    current_location TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni TO authenticated;
GRANT ALL ON public.alumni TO service_role;

-- 6. Jobs
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    title TEXT NOT NULL,
    description TEXT,
    employment_type TEXT,
    location TEXT,
    salary_min NUMERIC,
    salary_max NUMERIC,
    deadline DATE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
GRANT ALL ON public.jobs TO service_role;

-- 7. Education & Employment
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

-- 8. Psychotests
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

-- 9. Counseling & Notifications
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

-- 10. Role & Security Helpers
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

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

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Sync profile role
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, NEW.role)
    ON CONFLICT (user_id, role) DO NOTHING;
    DELETE FROM public.user_roles
    WHERE user_id = NEW.id AND role <> NEW.role;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.sync_profile_role() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_profile_role_sync ON public.profiles;
CREATE TRIGGER on_profile_role_sync
    AFTER INSERT OR UPDATE OF role ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.sync_profile_role();

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
        AND table_name IN ('profiles', 'universities', 'companies', 'alumni', 'jobs', 'psychotests', 'counseling')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()', t);
    END LOOP;
END $$;

-- 12. RLS Policies
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
        EXECUTE format('DROP POLICY IF EXISTS "Admins have full access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Admins have full access" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))', t);
    END LOOP;
END $$;

-- 13. Realtime
DO $$
DECLARE
    t text;
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOR t IN 
        SELECT name 
        FROM (VALUES 
            ('profiles'), ('alumni'), ('alumni_education'), 
            ('alumni_employment'), ('career_updates'), ('jobs'), 
            ('events'), ('notifications')
        ) AS tab(name)
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
            END IF;
        END IF;
    END LOOP;
END $$;
