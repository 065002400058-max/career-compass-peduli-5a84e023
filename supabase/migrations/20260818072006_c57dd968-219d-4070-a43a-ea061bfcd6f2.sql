
DO $$ 
BEGIN
    -- 1. Standardize alumni columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni' AND column_name='full_name') THEN
        ALTER TABLE public.alumni ADD COLUMN full_name text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alumni' AND column_name='student_id') THEN
        ALTER TABLE public.alumni ADD COLUMN student_id text;
    END IF;

    UPDATE public.alumni SET full_name = name WHERE full_name IS NULL;
    UPDATE public.alumni SET student_id = nim WHERE student_id IS NULL;
    ALTER TABLE public.alumni ALTER COLUMN full_name SET NOT NULL;

    -- 2. Fix notifications table columns to match my expected schema
    -- Check if 'user_id' exists, if not, rename 'profile_id' or add 'user_id'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='profile_id') THEN
             ALTER TABLE public.notifications RENAME COLUMN profile_id TO user_id;
        ELSE
             ALTER TABLE public.notifications ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='read') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='is_read') THEN
             ALTER TABLE public.notifications RENAME COLUMN is_read TO read;
        ELSE
             ALTER TABLE public.notifications ADD COLUMN read boolean DEFAULT false;
        END IF;
    END IF;

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
    GRANT ALL ON public.notifications TO service_role;
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

    -- 3. Policy
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
    CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR (SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin')));

    -- 4. Trigger for notifications
    CREATE OR REPLACE FUNCTION public.notify_admin_on_new_alumni()
    RETURNS trigger AS $func$
    BEGIN
        INSERT INTO public.notifications (user_id, title, message, type)
        SELECT user_id, 'Alumni Baru', 'Alumni baru terdaftar: ' || NEW.full_name, 'success'
        FROM public.user_roles
        WHERE role = 'admin';
        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_new_alumni_notify') THEN
        CREATE TRIGGER on_new_alumni_notify
        AFTER INSERT ON public.alumni
        FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_new_alumni();
    END IF;

END $$;
