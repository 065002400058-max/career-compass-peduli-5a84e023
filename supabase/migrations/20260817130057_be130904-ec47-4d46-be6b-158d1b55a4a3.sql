ALTER TABLE public.alumni REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alumni;