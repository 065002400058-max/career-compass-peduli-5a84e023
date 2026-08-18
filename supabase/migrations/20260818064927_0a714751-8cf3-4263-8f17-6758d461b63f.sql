-- Clean up profiles table to use 'id' as the primary key and user reference
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_id CASCADE;

-- Re-establish RLS policies using 'id'
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles are viewable" ON public.profiles FOR SELECT USING (true);

-- Ensure profiles exists for all users
INSERT INTO public.profiles (id, full_name, email, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), email, 'santri'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
