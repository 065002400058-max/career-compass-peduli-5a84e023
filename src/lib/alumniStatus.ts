/**
 * Sumber tunggal (single source of truth) klasifikasi status alumni.
 * Dipakai di admin (Data Alumni, Monitoring) dan halaman publik agar angka konsisten.
 *
 * PENTING: Kolom `status` di database sering basi (banyak record ber-data nyata
 * tetapi status masih "belum_mengisi_tracer"). Karena itu klasifikasi SELALU
 * menormalisasi nilai nyata dari kolom position/university/company, bukan
 * bergantung pada kolom status mentah. Data asli di DB tidak diubah.
 */

export type AlumniRecord = Record<string, any>;

export const ALUMNI_NOT_FILLED = "belum_mengisi_tracer";
export const ALUMNI_EMPTY = "Belum diisi";

export const ALUMNI_STATUS_ORDER = [
  "bekerja",
  "wirausaha",
  "melanjutkan_studi",
  "mencari_kerja",
  ALUMNI_NOT_FILLED,
] as const;

export type AlumniStatus = (typeof ALUMNI_STATUS_ORDER)[number];

export const cleanVal = (v: any): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "" || s === "-" || s === "." || s.toLowerCase() === "null") return null;
  if (s.toLowerCase() === "belum mengisi tracer" || s.toLowerCase() === ALUMNI_NOT_FILLED) return null;
  return s;
};

/* ---------- Normalisasi nilai nyata dari database (hasil audit ±1.261 record) ---------- */

/** Pola yang menunjukkan alumni sedang menempuh pendidikan (bukan bekerja). */
const STUDENT_RE =
  /(mahasisw|pelajar|\bkuliah\b|\bsiswa\b|menempuh|semester|\bs-?1\b|\bs-?2\b|\bs-?3\b|sarjana)/i;
/** Nilai position yang berupa nama institusi pendidikan = studi lanjut. */
const INSTITUTION_RE = /^(universitas|institut|sekolah tinggi|uin\b|stai|staie|politeknik|akademi|pesantren)/i;
/** Pola wirausaha pada position maupun status. */
const ENTREPRENEUR_RE =
  /(wirausaha|wiraswasta|wirahusaha|wirausahawan|wira usaha|wira swasta|\busaha\b|\bbisnis\b|pedagang|dagang|jualan|entrepreneur|pengeusaha|freelanc)/i;
/** Pola belum/tidak bekerja (bukan data karier). */
const NOT_WORKING_RE =
  /(belum bekerja|belom bekerja|blom punya pekerjaan|belum kerja|belom kerja|blom kerja|belum bekrja|menganggur|nganggur|^tidak ada$|rumah tangga|\birt\b|fresh graduate|gap year|baru lulus|mencari pekerjaan|mencari kerja|sedang mengikuti rekrutmen|daftar menjadi|daftar polisi)/i;

const isStudentPos = (p: string) => STUDENT_RE.test(p) || INSTITUTION_RE.test(p);
const isEntrepreneurPos = (p: string) => ENTREPRENEUR_RE.test(p);
const isNotWorkingPos = (p: string) => NOT_WORKING_RE.test(p);

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

/**
 * Klasifikasi eksklusif: setiap alumni tepat masuk ke satu kategori.
 * Prioritas: deteksi mahasiswa pada position > wirausaha > tidak bekerja >
 * bekerja (position nyata) > status mentah > data kampus > karier lain > tracer.
 */
export const alumniStatus = (a: AlumniRecord): AlumniStatus => {
  const raw = (cleanVal(a?.status) ?? "").toLowerCase();
  const pos = cleanVal(a?.position);

  if (pos) {
    if (isStudentPos(pos)) return "melanjutkan_studi";
    if (isEntrepreneurPos(pos)) return "wirausaha";
    if (isNotWorkingPos(pos)) return "mencari_kerja";
    return "bekerja";
  }

  if (raw) {
    if (/(studi|kuliah|mahasiswa|pelajar)/.test(raw)) return "melanjutkan_studi";
    if (ENTREPRENEUR_RE.test(raw)) return "wirausaha";
    if (/(mencari kerja|belum bekerja|menganggur)/.test(raw)) return "mencari_kerja";
  }

  if (studyData(a)) return "melanjutkan_studi";
  if (careerData(a)) return "bekerja";
  if (a?.tracer_filled_at) return "mencari_kerja";
  return ALUMNI_NOT_FILLED;
};

/* ---------- Bidang pekerjaan: normalisasi dari data nyata ---------- */

/**
 * Aturan pemetaan keyword position -> kategori bidang pekerjaan.
 * Dibuat dari audit nilai nyata kolom `position` di database
 * (kolom job_field hampir selalu kosong sehingga tidak bisa dipakai langsung).
 */
const JOB_FIELD_RULES: [RegExp, string][] = [
  [
    /guru|dosen|mengajar|ngajar|pengajar|ustadz|kepala sekolah|kepala paud|\bpaud\b|\btk\b|sdit|\bsd\b|\bsmp\b|\bsma\b|sekolah|madrasah|tahfizh|operator sekolah|tata usaha|pengasuh|bimb|laboratorium|motivator bimba|pengajar/i,
    "Pendidikan & Pengajaran",
  ],
  [/ngabdi|pengabdian|mengabdi|masjid|ta'mir|penyuluh agama|mengaji|pesantren/i, "Keagamaan & Pengabdian"],
  [/bidan|perawat|apoteker|kesehatan|kefarmasian|baby spa|farmasi|nakes/i, "Kesehatan"],
  [
    /\basn\b|\btni\b|polri|polisi|pemadam|damkar|\bbumn\b|\bbumd\b|honorer|honor daerah|pppnpn|pjlp|ppsu|\bkua\b|\bojk\b|abdi negara|dinas|penghulu|instansi/i,
    "Pemerintahan & Abdi Negara",
  ],
  [/bank|keuangan|financial|akuntan|finansial/i, "Keuangan & Perbankan"],
  [/software|network engineer|\bit\b|teknologi|digital|desain grafis|grafis|\bdata\b|engineer|programmer|developer/i, "Teknologi & Digital"],
  [ENTREPRENEUR_RE, "Wirausaha & Perdagangan"],
  [
    /karyawan|pegawai|staff|marketing|telemarketing|kurir|buruh|kuli|operator|advokat|jurnalis|konsultan|product manager|flight|seniman|sekretaris|travel|fnb|vaporista|coach|redaktur|supervisi|analisis/i,
    "Swasta & Jasa",
  ],
];

/**
 * Bidang pekerjaan alumni: pakai `job_field` bila terisi,
 * jika kosong diturunkan dari nilai `position` milik record itu sendiri.
 * Mengembalikan null untuk mahasiswa/belum bekerja/data kosong.
 */
export const jobFieldOf = (a: AlumniRecord): string | null => {
  const jf = cleanVal(a?.job_field);
  if (jf) {
    for (const [re, label] of JOB_FIELD_RULES) if (re.test(jf.toLowerCase())) return label;
    return jf;
  }
  const pos = cleanVal(a?.position);
  if (!pos) return null;
  const p = pos.toLowerCase();
  if (isStudentPos(p) || isNotWorkingPos(p)) return null;
  for (const [re, label] of JOB_FIELD_RULES) if (re.test(p)) return label;
  return "Lainnya";
};

/** Label untuk tampilan UI */
export const getStatusLabel = (status: string): string => {
  const s = (status || "").toLowerCase();
  if (s === "bekerja") return "Bekerja";
  if (s === "wirausaha") return "Wirausaha";
  if (s === "melanjutkan_studi" || s === "melanjutkan studi") return "Melanjutkan Studi";
  if (s === "mencari_kerja" || s === "mencari kerja") return "Mencari Kerja";
  return "Belum Mengisi Tracer";
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
    bekerja: counts["bekerja"] + counts["wirausaha"],
    kerjaSaja: counts["bekerja"],
    wirausaha: counts["wirausaha"],
    lanjut: counts["melanjutkan_studi"],
    belum: counts["mencari_kerja"],
    belumMengisi: counts[ALUMNI_NOT_FILLED],
    tracer,
    noTracer: rows.length - tracer,
    tracerRate: rows.length ? Math.round((tracer / rows.length) * 100) : 0,
    chart: ALUMNI_STATUS_ORDER.map((name) => ({ 
      name: getStatusLabel(name), 
      value: counts[name] 
    })).filter((d) => d.value > 0),
  };
};
