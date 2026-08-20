# Rollback Plan — Fase 1 (Audit Dashboard Santri & Anti-Duplikat)

Migration fase ini bersifat **aditif** — tidak menghapus tabel, kolom, atau data lama.

## Yang diubah
- Tambah kolom `updated_at`, `updated_by` pada `cbt_attempts`, `psikotes_attempts`; `updated_by` pada `counseling_referrals` dan `alumni`.
- Trigger `update_updated_at_column()` pada tabel attempt.
- Perketat RLS: `profiles` tidak lagi dapat dibaca publik (hanya pemilik + admin); `alumni` UPDATE mendapat `WITH CHECK` agar user tidak bisa memindahkan kepemilikan data.
- Index pendukung query dashboard (`user_id`, `created_at`).
- Realtime publication untuk tabel hasil.

## Cara rollback (jalankan sebagai migration baru)
```sql
-- 1) kembalikan pembacaan publik profiles (jika diperlukan)
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);

-- 2) lepas WITH CHECK pada alumni update
DROP POLICY IF EXISTS "Alumni can update own data" ON public.alumni;
CREATE POLICY "Alumni can update own data" ON public.alumni FOR UPDATE USING (auth.uid() = user_id);

-- 3) lepas trigger updated_at
DROP TRIGGER IF EXISTS set_updated_at_cbt_attempts ON public.cbt_attempts;
DROP TRIGGER IF EXISTS set_updated_at_psikotes_attempts ON public.psikotes_attempts;

-- 4) kolom tambahan (opsional, aman dibiarkan)
ALTER TABLE public.cbt_attempts DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.psikotes_attempts DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.counseling_referrals DROP COLUMN IF EXISTS updated_by;
ALTER TABLE public.alumni DROP COLUMN IF EXISTS updated_by;

-- 5) keluarkan dari realtime
ALTER PUBLICATION supabase_realtime DROP TABLE public.cbt_attempts;
ALTER PUBLICATION supabase_realtime DROP TABLE public.psikotes_attempts;
ALTER PUBLICATION supabase_realtime DROP TABLE public.counseling_referrals;
```

Tidak ada `DROP TABLE` maupun `DELETE` data pada fase ini.
