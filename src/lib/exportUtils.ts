import * as XLSX from "xlsx";
import { downloadReportPdf, type ReportOptions } from "@/lib/pdfReport";

export type { ReportOptions };


/**
 * Standardized mapping for export headers to ensure human-readable Excel/CSV files.
 */
const HEADER_MAP: Record<string, string> = {
  // Alumni / Santri
  full_name: "Nama Lengkap",
  student_id: "NIM/ID Santri",
  email: "Email",
  phone: "Telepon",
  gender: "Jenis Kelamin",
  graduation_year: "Tahun Lulus",
  major: "Jurusan",
  faculty: "Fakultas",
  university: "Universitas",
  university_name: "Nama Kampus",
  origin: "Asal",
  education_level: "Jenjang",
  status: "Status",
  employment_status: "Status Pekerjaan",
  company: "Perusahaan",
  company_name: "Nama Perusahaan",
  position: "Posisi",
  job_title: "Jabatan",
  employment_type: "Jenis Pekerjaan",
  current_city: "Kota Domisili",
  work_city: "Kota Kerja",
  created_at: "Tanggal Dibuat",
  school_origin: "Sekolah/Pesantren",
  university_status: "Dalam/Luar Negeri",
  edu_level: "Jenjang Kuliah",
  edu_university: "Perguruan Tinggi",
  edu_university_type: "Jenis Kampus",
  edu_major: "Program Studi",
  edu_end_year: "Tahun Lulus Kuliah",
  edu_status: "Status Studi",
  graduation_status: "Status Kelulusan",
  screening_status: "Skrining",
  cbt_status: "CBT",
  psikotes_status: "Psikotes",
  counseling_status: "Konseling",
  test_title: "Nama Tes",

  
  // Jobs
  title: "Judul",
  location: "Lokasi",
  salary: "Gaji",
  description: "Deskripsi",
  
  // Events
  date: "Tanggal",
  type: "Tipe",
  organizer: "Penyelenggara",
  capacity: "Kapasitas",
  
  // Partners
  name: "Nama Mitra",
  industry: "Industri",
  website: "Website",
  contact_email: "Email Kontak",
  
  // CBT / Psikotes
  total_score: "Total Skor",
  max_score: "Skor Maksimal",
  percentage: "Persentase",
  passed: "Lulus",
  level: "Level",
  conclusion: "Kesimpulan",
  recommendation: "Rekomendasi",
  started_at: "Mulai",
  completed_at: "Selesai",
};

/**
 * Cegah CSV/Excel formula injection: nilai yang diawali = + - @ (atau kontrol
 * karakter tab/CR) bisa dieksekusi sebagai formula saat file dibuka.
 */
const sanitizeCell = (value: any) => {
  if (typeof value !== "string") return value;
  const trimmed = value.replace(/^[\t\r\n]+/, "");
  return /^[=+\-@]/.test(trimmed) ? `'${trimmed}` : trimmed;
};

const mapHeaders = (rows: any[]) => {
  if (!rows.length) return [];
  return rows.map(row => {
    const newRow: any = {};
    Object.keys(row).forEach(key => {
      const mappedKey = HEADER_MAP[key] || key;
      newRow[mappedKey] = sanitizeCell(row[key]);
    });
    return newRow;
  });
};

export const exportToExcel = (rows: any[], filename: string, sheetName = "Data") => {
  if (!rows.length) return;
  const mappedRows = mapHeaders(rows);
  const ws = XLSX.utils.json_to_sheet(mappedRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = async (
  rows: any[],
  filename: string,
  title: string,
  opts: ReportOptions = {}
) => {
  if (!rows.length) return;
  const mappedRows = mapHeaders(rows);
  await downloadReportPdf(mappedRows, filename, title, opts);
};


