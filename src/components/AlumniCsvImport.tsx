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
      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const required = ["name", "graduation_year"];
      for (const r of required) if (!headers.includes(r)) throw new Error(`Kolom '${r}' wajib`);

      const records = rows.slice(1).map((r) => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = r[i]?.trim() ?? ""; });
        return {
          name: obj.name,
          graduation_year: parseInt(obj.graduation_year, 10),
          company: obj.company || null,
          position: obj.position || null,
          location: obj.location || null,
          status: obj.status || "Bekerja",
        };
      }).filter((r) => r.name && !isNaN(r.graduation_year));

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
    const csv = "name,graduation_year,company,position,location,status\nAhmad Fauzi,2022,PT Telkom,Software Engineer,Jakarta,Bekerja\n";
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
