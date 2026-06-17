import { Users, Briefcase, Building2, FileText, CheckCircle, XCircle, Settings, Brain, HeartPulse, GraduationCap, Search, Trash2, AlertTriangle, FileSpreadsheet, FileDown, Award, Mail, Phone, MapPin, Calendar, BookOpen, Building, UserCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import StatsCard from "@/components/StatsCard";
import AlumniCsvImport from "@/components/AlumniCsvImport";
import AlumniAddDialog from "@/components/AlumniAddDialog";
import CbtManager from "@/components/admin/CbtManager";
import PsikotesManager from "@/components/admin/PsikotesManager";
import UniversitiesManager from "@/components/admin/UniversitiesManager";
import ScholarshipManager from "@/components/admin/ScholarshipManager";
import ReferralManager from "@/components/admin/ReferralManager";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

const Admin = () => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("santri");
  const [alumniSearch, setAlumniSearch] = useState("");
  const [santriSearch, setSantriSearch] = useState("");

  useEffect(() => {
    if (!loading && (!user || !hasRole("admin"))) navigate("/");
  }, [loading, user, hasRole, navigate]);

  const { data: pendingJobs } = useQuery({
    queryKey: ["admin-pending-jobs"],
    queryFn: async () => (await supabase.from("jobs").select("*").eq("status", "pending").order("created_at", { ascending: false })).data ?? [],
    enabled: !!user && hasRole("admin"),
  });

  const { data: allAlumni } = useQuery({
    queryKey: ["admin-recent-alumni"],
    queryFn: async () => (await supabase.from("alumni").select("*").order("graduation_year", { ascending: false })).data ?? [],
    enabled: !!user && hasRole("admin"),
  });

  const { data: counts } = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const [alumni, jobs, partners, referrals] = await Promise.all([
        supabase.from("alumni").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("partners").select("id", { count: "exact", head: true }),
        supabase.from("counseling_referrals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return { alumni: alumni.count ?? 0, pendingJobs: jobs.count ?? 0, partners: partners.count ?? 0, referrals: referrals.count ?? 0 };
    },
    enabled: !!user && hasRole("admin"),
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;
  if (!user || !hasRole("admin")) return null;

  const handleApproveJob = async (jobId: string) => {
    await supabase.from("jobs").update({ status: "approved" }).eq("id", jobId);
    qc.invalidateQueries({ queryKey: ["admin-pending-jobs"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
  };
  const handleRejectJob = async (jobId: string) => {
    await supabase.from("jobs").update({ status: "rejected" }).eq("id", jobId);
    qc.invalidateQueries({ queryKey: ["admin-pending-jobs"] });
  };
  const deleteAlumni = async (id: string) => {
    const { error } = await supabase.from("alumni").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Alumni dihapus");
    qc.invalidateQueries({ queryKey: ["admin-recent-alumni"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
  };
  const deleteAllAlumni = async () => {
    const { error } = await supabase.from("alumni").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return toast.error(error.message);
    toast.success("Semua data alumni dihapus");
    qc.invalidateQueries({ queryKey: ["admin-recent-alumni"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
  };

  const filteredAlumni = (allAlumni ?? []).filter((a: any) => {
    if (!alumniSearch) return true;
    const q = alumniSearch.toLowerCase();
    return (
      a.name?.toLowerCase().includes(q) ||
      a.university?.toLowerCase().includes(q) ||
      a.major?.toLowerCase().includes(q) ||
      a.position?.toLowerCase().includes(q) ||
      a.origin?.toLowerCase().includes(q) ||
      a.graduation_year?.toString().includes(q)
    );
  });

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center">
              <Settings className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground text-sm">Kelola data dan konten Career Center</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <AlumniAddDialog />
            <AlumniCsvImport />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard icon={Users} value={counts?.alumni.toLocaleString() ?? "0"} label="Data Alumni" onClick={() => setTab("alumni")} />
          <StatsCard icon={Briefcase} value={counts?.pendingJobs.toLocaleString() ?? "0"} label="Lowongan Pending" onClick={() => setTab("jobs")} />
          <StatsCard icon={Building2} value={counts?.partners.toLocaleString() ?? "0"} label="Perusahaan Mitra" onClick={() => setTab("partners")} />
          <StatsCard icon={HeartPulse} value={counts?.referrals.toLocaleString() ?? "0"} label="Rujukan Konseling" onClick={() => setTab("referrals")} />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="glass-card mb-6 flex-wrap h-auto">
            <TabsTrigger value="jobs">Validasi Lowongan</TabsTrigger>
            <TabsTrigger value="alumni">Data Alumni</TabsTrigger>
            <TabsTrigger value="partners">Mitra</TabsTrigger>
            <TabsTrigger value="cbt"><Brain className="h-4 w-4 mr-1" />Tes CBT</TabsTrigger>
            <TabsTrigger value="psikotes"><HeartPulse className="h-4 w-4 mr-1" />Psikotes</TabsTrigger>
            <TabsTrigger value="universities"><GraduationCap className="h-4 w-4 mr-1" />Kampus</TabsTrigger>
            <TabsTrigger value="scholarships"><Award className="h-4 w-4 mr-1" />Beasiswa</TabsTrigger>
            <TabsTrigger value="referrals"><HeartPulse className="h-4 w-4 mr-1" />Rujukan</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <div className="glass-card rounded-xl divide-y divide-border">
              {(pendingJobs?.length ?? 0) === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Tidak ada lowongan yang menunggu validasi.</p>
                </div>
              ) : (
                pendingJobs?.map((job: any) => (
                  <div key={job.id} className="p-4 md:p-5 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-heading font-semibold text-foreground">{job.title}</h4>
                      <p className="text-sm text-muted-foreground">{job.company} · {job.location}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleRejectJob(job.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleApproveJob(job.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" />Approve
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="alumni">
            <div className="flex flex-col md:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari nama, universitas, jurusan, pekerjaan, asal, angkatan..." className="pl-10" value={alumniSearch} onChange={(e) => setAlumniSearch(e.target.value)} />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => exportToExcel(filteredAlumni, "alumni-peduli")} disabled={filteredAlumni.length === 0}>
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportToPDF(filteredAlumni, "alumni-peduli", "Data Alumni PEDULI")} disabled={filteredAlumni.length === 0}>
                  <FileDown className="h-4 w-4 mr-1.5" /> PDF
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" disabled={(allAlumni?.length ?? 0) === 0}>
                      <Trash2 className="h-4 w-4 mr-1.5" /> Hapus Semua
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Hapus semua alumni?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tindakan ini akan menghapus {allAlumni?.length ?? 0} data alumni secara permanen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteAllAlumni} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus Semua</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mb-2">Menampilkan {filteredAlumni.length} dari {allAlumni?.length ?? 0} alumni</div>
            <div className="glass-card rounded-xl divide-y divide-border max-h-[600px] overflow-y-auto">
              {filteredAlumni.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Tidak ada data alumni.</p>
                </div>
              ) : (
                filteredAlumni.map((a: any) => (
                  <div key={a.id} className="p-4 flex items-center justify-between gap-4 hover:bg-accent/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center font-heading font-bold text-accent-foreground text-sm shrink-0">
                        {a.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-heading font-semibold text-foreground text-sm truncate">{a.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">
                          Angkatan {a.graduation_year} · {a.major ?? "-"} · {a.university ?? "-"} · {a.position ?? "-"}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => deleteAlumni(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="partners">
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Manajemen mitra perusahaan akan ditampilkan di sini.</p>
            </div>
          </TabsContent>

          <TabsContent value="cbt"><CbtManager /></TabsContent>
          <TabsContent value="psikotes"><PsikotesManager /></TabsContent>
          <TabsContent value="universities"><UniversitiesManager /></TabsContent>
          <TabsContent value="scholarships"><ScholarshipManager /></TabsContent>
          <TabsContent value="referrals"><ReferralManager /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
