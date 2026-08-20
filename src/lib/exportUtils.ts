import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const mapHeaders = (rows: any[]) => {
  if (!rows.length) return [];
  return rows.map(row => {
    const newRow: any = {};
    Object.keys(row).forEach(key => {
      const mappedKey = HEADER_MAP[key] || key;
      newRow[mappedKey] = row[key];
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

export const exportToPDF = (rows: any[], filename: string, title: string) => {
  if (!rows.length) return;
  const mappedRows = mapHeaders(rows);
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(`Diunduh: ${new Date().toLocaleString("id-ID")}`, 14, 22);
  const headers = Object.keys(mappedRows[0]);
  const body = mappedRows.map((r) => headers.map((h) => String(r[h] ?? "")));
  autoTable(doc, { 
    head: [headers], 
    body, 
    startY: 26, 
    styles: { fontSize: 7 }, 
    headStyles: { fillColor: [16, 185, 129] } 
  });
  doc.save(`${filename}.pdf`);
};

