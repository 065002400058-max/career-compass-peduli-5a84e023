# Plan: Migrate Career Center PEDULI to Custom Supabase Project

The application currently uses Lovable Cloud as the production backend. The objective is to disconnect from Lovable Cloud and establish the user's existing Supabase project (**careercenter**) as the **Single Source of Truth** for database, authentication, storage, and real-time updates.

## Technical Details

1.  **Backend Connection:** Reconfigure the environment to point to `https://xtxpphqoyoblkhthmgid.supabase.co`.
2.  **Schema Sync:** Deploy the full production schema (tables, enums, triggers, RLS policies) to the new project.
3.  **Authentication:** Redirect all auth operations (login, signup, session) to the custom Supabase instance.
4.  **Real-time:** Enable Supabase Realtime on key tables (`alumni`, `profiles`, `jobs`, etc.) to ensure instant dashboard updates.
5.  **Data Integrity:** Verify CRUD operations by writing test records and confirming visibility in the Supabase Dashboard.

## Implementation Steps

### 1. Environment Configuration
- Update `.env` with the custom Supabase URL and Publishable Key.
- Ensure `src/integrations/supabase/client.ts` correctly consumes these variables.

### 2. Database Schema Migration
- Apply the production schema migration to the custom Supabase project:
    - Create `app_role` enum.
    - Create/align tables: `profiles`, `alumni`, `universities`, `companies`, `jobs`, `job_applications`, `partners`, `events`, `psychotests`, `cbt_tests`, `cbt_results`, `career_updates`, `counseling`, `notifications`.
    - Set up `user_roles` and the `has_role` security-definer helper.
    - Implement `updated_at` triggers.
    - Enable RLS and apply admin-level policies.

### 3. Real-time Setup
- Run SQL commands to add relevant tables to the `supabase_realtime` publication.

### 4. Verification
- Use Playwright to simulate a user registration/login and status update.
- Verify that data is correctly persisted in the custom Supabase database.
- Confirm that real-time invalidation triggers correctly update the UI.

### 5. Final Audit
- Check all `supabase.from()` calls in the frontend to ensure they match the production schema column names (e.g., `employment_type` instead of `type`).
