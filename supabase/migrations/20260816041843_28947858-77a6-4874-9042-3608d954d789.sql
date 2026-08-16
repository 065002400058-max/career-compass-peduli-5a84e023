-- Allow the app to call the role checker (was only executable by postgres/service_role)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

-- Authenticated users: full DML on all public tables (RLS still restricts rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_stories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbt_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbt_attempt_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbt_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbt_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbt_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbt_tests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.counseling_referrals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psikotes_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psikotes_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psikotes_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psikotes_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psikotes_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psikotes_tests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholarships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.universities TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Public (not logged in) read access only where policies already allow it
GRANT SELECT ON public.alumni TO anon;
GRANT SELECT ON public.alumni_stories TO anon;
GRANT SELECT ON public.jobs TO anon;
GRANT SELECT ON public.partners TO anon;
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.universities TO anon;
GRANT SELECT ON public.scholarships TO anon;
GRANT SELECT ON public.cbt_categories TO anon;
GRANT SELECT ON public.cbt_tests TO anon;
GRANT SELECT ON public.cbt_questions TO anon;
GRANT SELECT ON public.cbt_answers TO anon;
GRANT SELECT ON public.psikotes_categories TO anon;
GRANT SELECT ON public.psikotes_tests TO anon;
GRANT SELECT ON public.psikotes_questions TO anon;
GRANT SELECT ON public.psikotes_answers TO anon;
GRANT SELECT ON public.psikotes_results TO anon;

-- Service role (edge functions / admin code)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;