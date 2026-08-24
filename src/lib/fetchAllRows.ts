/**
 * Helper pagination: PostgREST membatasi respons maksimal ±1.000 baris per
 * request, sehingga query polos pada tabel dengan >1.000 record (mis. alumni)
 * diam-diam terpotong dan statistik dashboard menjadi tidak valid.
 * Helper ini mengambil SEMUA baris dengan loop range sampai habis.
 */
export async function fetchAllRows<T = any>(
  build: () => { range: (from: number, to: number) => PromiseLike<{ data: any; error: any }> },
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}
