# Plan: Standardize Database Structure and Enhance Export Functions

Standardize the database schema to use consistent `snake_case`, refine alumni classification logic, and upgrade export capabilities to meet production-ready standards.

## Database & Backend Refinement

- **Standardize Schema**: Ensure all tables and columns use `lowercase` and `snake_case`. (e.g., `full_name` instead of `nameAlumni`).
- **Strict Alumni Validation**: Update `link_or_create_alumni` to include unique checks based on `full_name` and key data to prevent parallel request duplicates.
- **Tracer Status Logic**: Standardize `status` values in `src/lib/alumniStatus.ts` to use: `bekerja`, `wirausaha`, `melanjutkan_studi`, `mencari_kerja`, `belum_mengisi_tracer`.
- **Realtime Notifications**: Implement a new `notifications` table and triggers to alert admins when new alumni register or status changes.
- **Clean Naming**: Ensure export headers use human-readable names (e.g., "Nama Lengkap" instead of `full_name`).

## User Experience & Functionality

- **Production Exports**: Add/Upgrade export features (Excel/CSV/PDF) for:
    - **Alumni**: Detailed tracer study data.
    - **Jobs**: Active lowongan and applications.
    - **Partners**: Mitra and company contacts.
    - **Events**: Participation and schedules.
    - **Universities**: Campus lists.
- **Role Integration**: Ensure "Santri to Alumni" transition is seamless, automatically updating roles and creating linked alumni records.
- **Profile Management**: Maintain fixed password visibility and profile update functions.

## Technical Details

- **Supabase Migrations**:
    - Update `alumni` table columns for better export alignment (e.g., mapping internal names to standard ones).
    - Add `GRANT` statements for all new/modified tables.
    - Implement `link_or_create_alumni` with `SERIALIZABLE` or proper locking to prevent race conditions.
- **Frontend Refactoring**:
    - Update `exportToExcel` and `exportToPDF` helpers in `src/lib/exportUtils.ts` (or equivalent) to support custom header mapping.
    - Refactor `SantriCenter.tsx`, `AlumniCenter.tsx`, `JobsManager.tsx`, etc., to use the new standardized headers.
- **Data Integrity**: Clean existing data to match the new status categories (converting "-" to `belum_mengisi_tracer`).

## Verification Plan

- **Schema Check**: Verify all table and column names via Supabase schema inspection.
- **Export Test**: Generate CSV files for each module and verify headers/data alignment in Excel.
- **Role Transition Test**: Simulate a santri "graduation" and verify database synchronization.
- **Duplicate Prevention**: Run parallel registration tests to ensure no duplicate alumni records are created.
