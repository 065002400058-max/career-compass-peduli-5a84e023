import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, FileSpreadsheet, Brain, HeartPulse, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("id-ID") : "-");

function useReport(kind: "cbt" | "psikotes") {
  return useQuery({
    queryKey: ["admin-usage", kind],
    queryFn: async () => {
      const table = kind === "cbt" ? "cbt_attempts" : "psikotes_attempts";
      const { data: attempts } = await supabase
        .from(table as any)
        .select("*")
        .order("completed_at", { ascending: false });
      const rows = attempts ?? [];
      if (rows.length === 0) return [];
      const userIds = [...new Set(rows.map((r: any) => r.user_id))];
      const testIds = [...new Set(rows.map((r: any) => r.test_id))];
      
      const [profsRes, testsRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone, email, education_level, school_origin, university, major").in("id", userIds),
        supabase.from(kind === "cbt" ? "cbt_tests" : "psikotes_tests").select("id, title").in("id", testIds),
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      ]);

      const profs = profsRes.data;
      const tests = testsRes.data;
      const roles = rolesRes.data;

      const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const tMap = new Map((tests ?? []).map((t: any) => [t.id, t.title]));
      const rMap = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));
      return rows.map((r: any) => {
        const p: any = pMap.get(r.user_id) ?? {};
        return {
          ...r,
          full_name: p.full_name ?? "-",
          phone: p.phone ?? "-",
          email: p.email ?? "-",
          education_level: p.education_level ?? "-",
          school_origin: p.school_origin ?? "-",
          university: p.university ?? "-",
          major: p.major ?? "-",
          role: rMap.get(r.user_id) === "santri" ? "SANTRI" : rMap.get(r.user_id) === "alumni" ? "ALUMNI" : "Status belum teridentifikasi",
          test_title: tMap.get(r.test_id) ?? "-",
        };
      });
    },
  });
}

const ReportTable = ({ kind }: { kind: "cbt" | "psikotes" }) => {
  const { data, isLoading } = useReport(kind);
  const [q, setQ] = useState("");
  const isCbt = kind === "cbt";
  const title = isCbt ? "Laporan Tes Karir (CBT)" : "Laporan Tes Kesehatan Mental (Psikotes)";

  const filtered = useMemo(() => {
    const arr = data ?? [];
    if (!q) return arr;
    const s = q.toLowerCase();
    return arr.filter((r: any) =>
      [r.full_name, r.test_title, r.role, r.university, r.school_origin].some((v) => String(v ?? "").toLowerCase().includes(s))
    );
  }, [data, q]);

  const exportRows = filtered.map((r: any) => isCbt ? ({
    full_name: r.full_name,
    role: r.role,
    email: r.email,
    phone: r.phone,
    education_level: r.education_level,
    school_origin: r.school_origin,
    university: r.university,
    major: r.major,
    test_title: r.test_title,
    total_score: r.total_score,
    max_score: r.max_score,
    percentage: `${r.percentage}%`,
    passed: r.passed ? "Ya" : "Tidak",
    started_at: fmt(r.started_at),
    completed_at: fmt(r.completed_at),
  }) : ({
    full_name: r.full_name,
    role: r.role,
    email: r.email,
    phone: r.phone,
    education_level: r.education_level,
    school_origin: r.school_origin,
    test_title: r.test_title,
    total_score: r.total_score,
    level: r.level ?? "-",
    conclusion: r.conclusion ?? "-",
    recommendation: r.recommendation ?? "-",
    completed_at: fmt(r.completed_at),
  }));


  const fname = isCbt ? "laporan-tes-cbt" : "laporan-psikotes";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama, tes, sekolah..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{filtered.length} laporan</Badge>
          <Button size="sm" variant="outline" onClick={() => exportToExcel(exportRows, fname)} disabled={!exportRows.length}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel/CSV
          </Button>
          <Button size="sm" onClick={() => exportToPDF(exportRows, fname, title)} disabled={!exportRows.length}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Memuat laporan...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Belum ada pengguna yang menyelesaikan tes ini.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">Nama</th>
                <th className="p-3">Role</th>
                <th className="p-3">Kontak</th>
                <th className="p-3">Tes</th>
                {isCbt ? (
                  <>
                    <th className="p-3">Skor</th>
                    <th className="p-3">Hasil</th>
                  </>
                ) : (
                  <>
                    <th className="p-3">Skor</th>
                    <th className="p-3">Level</th>
                  </>
                )}
                <th className="p-3">Waktu Selesai</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/20">
                  <td className="p-3">
                    <div className="font-medium">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground">{r.school_origin || r.university || "-"}</div>
                  </td>
                  <td className="p-3"><Badge variant="outline" className="capitalize">{r.role}</Badge></td>
                  <td className="p-3 text-xs">
                    <div>{r.email}</div>
                    <div className="text-muted-foreground">{r.phone}</div>
                  </td>
                  <td className="p-3">{r.test_title}</td>
                  {isCbt ? (
                    <>
                      <td className="p-3">{r.total_score}/{r.max_score} <span className="text-muted-foreground">({r.percentage}%)</span></td>
                      <td className="p-3">{r.passed ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Lulus</Badge> : <Badge variant="destructive">Tidak Lulus</Badge>}</td>
                    </>
                  ) : (
                    <>
                      <td className="p-3">{r.total_score}</td>
                      <td className="p-3"><Badge variant="secondary">{r.level ?? "-"}</Badge></td>
                    </>
                  )}
                  <td className="p-3 text-xs text-muted-foreground">{fmt(r.completed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const UsageReports = () => {
  return (
    <Tabs defaultValue="cbt" className="w-full">
      <TabsList className="glass-card mb-4">
        <TabsTrigger value="cbt"><Brain className="h-4 w-4 mr-1" /> Tes Karir (CBT)</TabsTrigger>
        <TabsTrigger value="psikotes"><HeartPulse className="h-4 w-4 mr-1" /> Kesehatan Mental</TabsTrigger>
      </TabsList>
      <TabsContent value="cbt"><ReportTable kind="cbt" /></TabsContent>
      <TabsContent value="psikotes"><ReportTable kind="psikotes" /></TabsContent>
    </Tabs>
  );
};

export default UsageReports;
