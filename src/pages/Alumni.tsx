import { useAlumniRealtime } from "@/hooks/useAlumniRealtime";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import GenderAvatar from "@/components/shared/GenderAvatar";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Alumni = () => {
  useAlumniRealtime();
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("Semua");

  const { data: alumni = [], isLoading } = useQuery({
    queryKey: ["alumni"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("alumni_directory");
      if (error) throw error;
      return (data ?? []).sort((a: any, b: any) => (b.graduation_year ?? 0) - (a.graduation_year ?? 0));
    },
  });

  const years = ["Semua", ...Array.from(new Set(alumni.map((a: any) => a.graduation_year.toString()))).sort().reverse()];

  const filtered = alumni.filter((a: any) => {
    const q = search.toLowerCase();
    const matchSearch =
      a.name?.toLowerCase().includes(q) ||
      (a.university ?? "").toLowerCase().includes(q) ||
      (a.major ?? "").toLowerCase().includes(q) ||
      (a.position ?? "").toLowerCase().includes(q);
    const matchYear = yearFilter === "Semua" || a.graduation_year.toString() === yearFilter;
    return matchSearch && matchYear;
  });

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Database Alumni</h1>
          <p className="text-muted-foreground mt-1">Data alumni dan tracer study</p>
        </div>

        <div className="glass-card rounded-xl p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama, universitas, jurusan, pekerjaan..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              {years.map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Tidak ada data alumni ditemukan.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jenis Kelamin</TableHead>
                    <TableHead>Angkatan</TableHead>
                    <TableHead>Asal</TableHead>
                    <TableHead>Jenjang Pendidikan</TableHead>
                    <TableHead>Jurusan</TableHead>
                    <TableHead>Universitas</TableHead>
                    <TableHead>Pekerjaan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a: any, idx: number) => (
                    <TableRow key={a.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <GenderAvatar gender={a.gender} className="h-8 w-8" iconClassName="h-4 w-4" />
                          {a.name}
                        </span>
                      </TableCell>
                      <TableCell>{a.gender ?? "-"}</TableCell>
                      <TableCell>{a.graduation_year}</TableCell>
                      <TableCell>{a.origin ?? "-"}</TableCell>
                      <TableCell>{a.education_level ?? "-"}</TableCell>
                      <TableCell>{a.major ?? "-"}</TableCell>
                      <TableCell>{a.university ?? "-"}</TableCell>
                      <TableCell>{a.position ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Alumni;
