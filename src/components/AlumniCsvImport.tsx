import { useRef, useState } from "react";
import { Upload, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

// Simple CSV parser supporting quoted fields
const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); cur = "";
        if (row.some((v) => v.trim() !== "")) rows.push(row);
        row = [];
      } else cur += c;
    }
  }
  if (cur || row.length) { row.push(cur); if (row.some((v) => v.trim() !== "")) rows.push(row); }
  return rows;
};

// Map various header spellings to canonical keys
const headerMap: Record<string, string> = {
  "no": "no",
  "nama lengkap": "full_name",
  "nama": "full_name",
  "name": "full_name",
  "full name": "full_name",
  "nim": "student_id",
  "id santri": "student_id",
  "student id": "student_id",
  "student_id": "student_id",
  "jenis kelamin": "gender",
  "gender": "gender",
  "jk": "gender",
  "angkatan": "graduation_year",
  "graduation_year": "graduation_year",
  "tahun": "graduation_year",
  "asal": "origin",
  "origin": "origin",
  "jenjang pendidikan": "education_level",
  "jenjang": "education_level",
  "education_level": "education_level",
  "jurusan": "major",
  "major": "major",
  "universitas": "university",
  "university": "university",
  "kampus": "university",
  "pekerjaan": "position",
  "position": "position",
  "nomor handphone (whatsapp)": "phone",
  "nomor handphone": "phone",
  "nomor hp": "phone",
  "no hp": "phone",
  "no. hp": "phone",
  "handphone": "phone",
  "whatsapp": "phone",
  "wa": "phone",
  "telepon": "phone",
  "phone": "phone",
};

// Normalisasi nomor HP Indonesia -> format 62xxxxxxxxxx
const normalizePhone = (raw?: string) => {
  const digits = (raw || "").replace(/[^0-9+]/g, "").replace(/^\+/, "");
  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
};


const AlumniCsvImport = () => {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error("CSV kosong");
      const headers = rows[0].map((h) => headerMap[h.trim().toLowerCase()] || h.trim().toLowerCase());
      if (!headers.includes("full_name")) throw new Error("Kolom 'Nama Lengkap' wajib ada");
      if (!headers.includes("graduation_year")) throw new Error("Kolom 'Angkatan' wajib ada");


      const records = rows.slice(1).map((r) => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = r[i]?.trim() ?? ""; });
        const year = parseInt(obj.graduation_year, 10);
        return {
          full_name: obj.full_name,
          name: obj.full_name, // Sync old column
          student_id: obj.student_id || null,
          nim: obj.student_id || null, // Sync old column
          gender: obj.gender || null,
          graduation_year: year,
          origin: obj.origin || null,
          education_level: obj.education_level || null,
          major: obj.major || null,
          university: obj.university || null,
          position: obj.position || null,
          phone: normalizePhone(obj.phone),
          status: "belum_mengisi_tracer",
          graduation_status: "belum_mengisi_tracer",
          employment_status: "belum_mengisi_tracer",
        };
      }).filter((r) => r.full_name && !isNaN(r.graduation_year));



      if (records.length === 0) throw new Error("Tidak ada baris valid");

      const { error } = await supabase.from("alumni").insert(records);
      if (error) throw error;
      toast.success(`Berhasil import ${records.length} alumni`);
      qc.invalidateQueries({ queryKey: ["alumni"] });
      qc.invalidateQueries({ queryKey: ["admin-recent-alumni"] });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
    } catch (e: any) {
      toast.error(e.message || "Import gagal");
    } finally {
      setLoading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const csv = "No,Nama Lengkap,NIM,Jenis Kelamin,Nomor Handphone (Whatsapp),Angkatan,Asal,Jenjang Pendidikan,Jurusan,Universitas,Pekerjaan\n1,Ahmad Fauzi,12345,Laki-laki,081234567890,2022,Bandung,S1,Teknik Informatika,Universitas Indonesia,Software Engineer\n2,Siti Aminah,12346,Perempuan,082198765432,2023,Cirebon,S1,Manajemen,Universitas Padjadjaran,Staff Marketing\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template-alumni.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <input
        ref={ref}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Button variant="outline" size="sm" onClick={downloadTemplate}>
        <Download className="h-4 w-4 mr-1.5" /> Template
      </Button>
      <Button size="sm" onClick={() => ref.current?.click()} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
        Import CSV
      </Button>
    </div>
  );
};

export default AlumniCsvImport;
