/**
 * Sumber tunggal (single source of truth) klasifikasi status alumni.
 * Dipakai di admin (Data Alumni, Monitoring) dan halaman publik agar angka konsisten.
 */

export type AlumniRecord = Record<string, any>;

export const ALUMNI_NOT_FILLED = "Belum Mengisi Tracer";
export const ALUMNI_EMPTY = "Belum diisi";

export const ALUMNI_STATUS_ORDER = [
  "Bekerja",
  "Wirausaha",
  "Melanjutkan Studi",
  "Belum Bekerja",
  ALUMNI_NOT_FILLED,
] as const;

export type AlumniStatus = (typeof ALUMNI_STATUS_ORDER)[number];

export const cleanVal = (v: any): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" || s === "-" ? null : s;
};

/** Data karier nyata (bukan "-"). */
export const careerData = (a: AlumniRecord): string | null =>
  cleanVal(a?.position) ||
  cleanVal(a?.company) ||
  cleanVal(a?.job_field) ||
  cleanVal(a?.work_city) ||
  null;

/** Data studi lanjut nyata: kampus alma mater / rencana studi. */
export const studyData = (a: AlumniRecord): string | null =>
  cleanVal(a?.university) ||
  cleanVal(a?.faculty) ||
  cleanVal(a?.further_education) ||
  cleanVal(a?.target_university) ||
  null;

/** Alumni dianggap sudah mengisi tracer bila ada penanda waktu atau minimal satu data karier/studi. */
export const hasTracer = (a: AlumniRecord): boolean =>
  !!a?.tracer_filled_at || !!careerData(a) || !!studyData(a);

/** Klasifikasi eksklusif: setiap alumni tepat masuk ke satu kategori.
 *  Aturan: data isi ("-" = kosong) yang menentukan, bukan kolom status bawaan import.
 *  - ada data pekerjaan  → Bekerja / Wirausaha
 *  - ada data kampus/studi lanjut → Melanjutkan Studi (konsisten dengan grafik Kampus Alma Mater)
 *  - tidak ada data apa pun → Belum Mengisi Tracer */
export const alumniStatus = (a: AlumniRecord): AlumniStatus => {
  const raw = (cleanVal(a?.status) ?? "").toLowerCase();
  const career = careerData(a);
  const study = studyData(a);

  if (career) {
    if (/wirausaha|usaha|bisnis|freelance|entrepreneur/.test(raw)) return "Wirausaha";
    return "Bekerja";
  }
  if (study) return "Melanjutkan Studi";
  if (a?.tracer_filled_at) return "Belum Bekerja";
  return ALUMNI_NOT_FILLED;
};

/** Ringkasan agregat yang selalu menjumlah tepat ke total baris. */
export const alumniSummary = (rows: AlumniRecord[]) => {
  const counts = Object.fromEntries(ALUMNI_STATUS_ORDER.map((k) => [k, 0])) as Record<AlumniStatus, number>;
  rows.forEach((r) => {
    counts[alumniStatus(r)] += 1;
  });
  const tracer = rows.filter(hasTracer).length;
  return {
    total: rows.length,
    counts,
    bekerja: counts["Bekerja"] + counts["Wirausaha"],
    kerjaSaja: counts["Bekerja"],
    wirausaha: counts["Wirausaha"],
    lanjut: counts["Melanjutkan Studi"],
    belum: counts["Belum Bekerja"],
    belumMengisi: counts[ALUMNI_NOT_FILLED],
    tracer,
    noTracer: rows.length - tracer,
    tracerRate: rows.length ? Math.round((tracer / rows.length) * 100) : 0,
    chart: ALUMNI_STATUS_ORDER.map((name) => ({ name, value: counts[name] })).filter((d) => d.value > 0),
  };
};
