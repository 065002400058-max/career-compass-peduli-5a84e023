import { Users, Briefcase, Building2, CheckCircle, XCircle, Brain, HeartPulse, GraduationCap, Search, Trash2, AlertTriangle, FileSpreadsheet, FileDown, Award, Phone, MapPin, Calendar, BookOpen, Building, UserCircle, ChevronRight, MoreHorizontal, TrendingUp, SlidersHorizontal, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AlumniCsvImport from "@/components/AlumniCsvImport";
import AlumniAddDialog from "@/components/AlumniAddDialog";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import CbtManager from "@/components/admin/CbtManager";
import PsikotesManager from "@/components/admin/PsikotesManager";
import ScreeningInsights from "@/components/admin/ScreeningInsights";
import MonitoringDashboard from "@/components/admin/MonitoringDashboard";
import AlumniCenter from "@/components/admin/AlumniCenter";

import UniversitiesManager from "@/components/admin/UniversitiesManager";
import ScholarshipManager from "@/components/admin/ScholarshipManager";
import ReferralManager from "@/components/admin/ReferralManager";
import UsageReports from "@/components/admin/UsageReports";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

const SERVICE_TABS = [
  { value: "monitor", label: "Dashboard", icon: TrendingUp },
  { value: "jobs", label: "Validasi Lowongan", icon: Briefcase },
  { value: "partners", label: "Mitra", icon: Building2 },
  { value: "cbt", label: "Tes CBT", icon: Brain },
  { value: "psikotes", label: "Psikotes", icon: HeartPulse },
  { value: "screening", label: "Hasil Screening", icon: TrendingUp },
  { value: "universities", label: "Kampus", icon: GraduationCap },
  { value: "scholarships", label: "Beasiswa", icon: Award },
  { value: "referrals", label: "Rujukan", icon: Users },
  { value: "reports", label: "Laporan Pengguna", icon: FileDown },
];


const Admin = () => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("monitor");
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

  const { data: allSantri, isLoading: santriLoading } = useQuery({
    queryKey: ["admin-santri"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "santri");
      const ids = (roles ?? []).map((r: any) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids).order("created_at", { ascending: false });
      return profs ?? [];
    },
    enabled: !!user && hasRole("admin"),
  });

  const { data: counts } = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const [alumni, jobs, partners, referrals, santri] = await Promise.all([
        supabase.from("alumni").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("partners").select("id", { count: "exact", head: true }),
        supabase.from("counseling_referrals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "santri"),
      ]);
      return { alumni: alumni.count ?? 0, pendingJobs: jobs.count ?? 0, partners: partners.count ?? 0, referrals: referrals.count ?? 0, santri: santri.count ?? 0 };
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

  const segment = tab === "santri" ? "santri" : tab === "alumni" ? "alumni" : "lainnya";
  const activeService = SERVICE_TABS.find((s) => s.value === tab);

  const segments = [
    { key: "santri", label: "Data Santri", icon: UserCircle, onClick: () => setTab("santri") },
    { key: "alumni", label: "Data Alumni", icon: Users, onClick: () => setTab("alumni") },
    { key: "lainnya", label: "Lainnya", icon: MoreHorizontal, onClick: () => setTab("jobs") },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <div className="container mx-auto max-w-6xl px-4 md:px-8 pt-6 md:pt-10">
        {/* Welcome */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Selamat datang,</p>
            <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground leading-tight">
              Career Center <span className="text-primary">PEDULI</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
              Kelola layanan konseling dan data santri dengan mudah.
            </p>
          </div>
          <button
            onClick={() => setTab("referrals")}
            className="relative shrink-0 h-10 w-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
            aria-label="Notifikasi rujukan"
          >
            <Bell className="h-5 w-5" />
            {(counts?.referrals ?? 0) > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />}
          </button>
        </div>

        {/* Summary */}
        <div className="grid md:grid-cols-3 gap-3 mb-5">
          <button
            onClick={() => setTab("referrals")}
            className="rounded-2xl bg-primary text-primary-foreground p-5 text-left flex items-center gap-4 shadow-sm transition-transform duration-200 active:scale-[0.98] hover:-translate-y-0.5"
          >
            <span className="h-11 w-11 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0">
              <HeartPulse className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-2xl font-heading font-bold leading-none">{counts?.referrals ?? 0}</span>
              <span className="block text-sm opacity-90 mt-1">Rujukan Konseling</span>
            </span>
          </button>
          <button
            onClick={() => setTab("monitor")}
            className="md:col-span-2 rounded-2xl bg-card border border-border p-5 text-left flex items-center gap-4 shadow-sm transition-colors hover:bg-accent/40"
          >
            <span className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-heading font-semibold text-foreground">Ringkasan Bulan Ini</span>
              <span className="block text-sm text-muted-foreground">Pantau aktivitas dan layanan secara real-time.</span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </button>
        </div>

        {/* Segments + shortcuts */}
        <div className="rounded-2xl bg-card border border-border p-3 md:p-4 mb-5 shadow-sm">
          <div className="grid grid-cols-3 gap-1 pb-3 border-b border-border">
            {segments.map((s) => {
              const isActive = segment === s.key;
              return (
                <button
                  key={s.key}
                  onClick={s.onClick}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs md:text-sm font-medium transition-colors duration-200 ${
                    isActive ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <s.icon className="h-4 w-4" />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 pt-3">
            {SERVICE_TABS.map((s) => {
              const isActive = tab === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setTab(s.value)}
                  className={`rounded-2xl px-2 py-3 flex flex-col items-center gap-1.5 text-center transition-all duration-200 active:scale-95 ${
                    isActive ? "bg-accent border border-primary/30" : "bg-muted/40 border border-transparent hover:bg-accent/50"
                  }`}
                >
                  <s.icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-primary/70"}`} strokeWidth={1.8} />
                  <span className="text-[11px] md:text-xs font-medium text-foreground leading-tight">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeService && (
          <div className="flex items-center gap-2 mb-3">
            <activeService.icon className="h-4 w-4 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">{activeService.label}</h2>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsContent value="jobs" className="mt-0">
            <div className="rounded-2xl bg-card border border-border divide-y divide-border shadow-sm overflow-hidden">
              {(pendingJobs?.length ?? 0) === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Tidak ada lowongan yang menunggu validasi.</p>
                </div>
              ) : (
                pendingJobs?.map((job: any) => (
                  <div key={job.id} className="p-4 md:p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="font-heading font-semibold text-foreground truncate">{job.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">{job.company} · {job.location}</p>
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

          <TabsContent value="alumni" className="mt-0">
            <AlumniCenter />
          </TabsContent>


          <TabsContent value="santri" className="mt-0">
            {(() => {
              const filteredSantri = (allSantri ?? []).filter((s: any) => {
                if (!santriSearch) return true;
                const q = santriSearch.toLowerCase();
                return [s.full_name, s.origin, s.school_origin, s.major, s.education_level, s.phone].some((v: any) => v?.toLowerCase?.().includes(q));
              });
              const santriExportRows = filteredSantri.map((s: any) => ({
                Nama: s.full_name ?? "",
                Gender: s.gender ?? "",
                "Tgl Lahir": s.birth_date ?? "",
                Telepon: s.phone ?? "",
                Asal: s.origin ?? "",
                Sekolah: s.school_origin ?? "",
                Jenjang: s.education_level ?? "",
                Jurusan: s.major ?? "",
                Alamat: s.address ?? "",
                "Terdaftar Sejak": s.created_at ? new Date(s.created_at).toLocaleDateString("id-ID") : "",
              }));
              return (
                <>
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Cari nama, asal, sekolah, jurusan..." className="pl-10 h-11 rounded-2xl bg-card" value={santriSearch} onChange={(e) => setSantriSearch(e.target.value)} />
                    </div>
                    <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl shrink-0" aria-label="Filter" onClick={() => setSantriSearch("")}>
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap mb-2">
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => exportToExcel(santriExportRows, "santri-peduli")} disabled={santriExportRows.length === 0}>
                      <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => exportToPDF(santriExportRows, "santri-peduli", "Data Santri Terdaftar PEDULI")} disabled={santriExportRows.length === 0}>
                      <FileDown className="h-4 w-4 mr-1.5" /> PDF
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Menampilkan {filteredSantri.length} dari {allSantri?.length ?? 0} santri terdaftar
                  </div>
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-0.5">
                    {santriLoading ? (
                      [1, 2, 3].map((i) => (
                        <div key={i} className="rounded-2xl bg-card border border-border p-4 animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3 w-1/3 rounded bg-muted" />
                              <div className="h-3 w-2/3 rounded bg-muted" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : filteredSantri.length === 0 ? (
                      <div className="rounded-2xl bg-card border border-border p-8 text-center text-muted-foreground">
                        <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">Belum ada santri terdaftar.</p>
                      </div>
                    ) : (
                      filteredSantri.map((s: any) => (
                        <div key={s.id} className="rounded-2xl bg-card border border-border shadow-sm p-4 flex items-start gap-3 transition-colors hover:bg-accent/30 cursor-pointer active:scale-[0.99]">
                          <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center font-heading font-bold text-primary text-sm shrink-0">
                            {(s.full_name || "S").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-heading font-semibold text-foreground text-sm">{s.full_name || "(Tanpa Nama)"}</h4>
                              {s.gender && <Badge variant="outline" className="text-[10px] rounded-full">{s.gender}</Badge>}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="text-[10px] rounded-full">Santri</Badge>
                              {s.created_at && <Badge variant="outline" className="text-[10px] rounded-full">Daftar: {new Date(s.created_at).toLocaleDateString("id-ID")}</Badge>}
                            </div>
                            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {s.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {s.phone}</span>}
                              {s.birth_date && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {s.birth_date}</span>}
                              {s.origin && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {s.origin}</span>}
                              {s.school_origin && <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> {s.school_origin}</span>}
                              {s.education_level && <span className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> {s.education_level} {s.major ? `· ${s.major}` : ""}</span>}
                              {s.address && <span className="flex items-center gap-1.5 sm:col-span-2"><MapPin className="h-3.5 w-3.5" /> {s.address}</span>}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                        </div>
                      ))
                    )}
                  </div>
                </>
              );
            })()}
          </TabsContent>

          <TabsContent value="partners" className="mt-0">
            <div className="rounded-2xl bg-card border border-border p-8 text-center text-muted-foreground shadow-sm">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Manajemen mitra perusahaan akan ditampilkan di sini.</p>
            </div>
          </TabsContent>

          <TabsContent value="cbt" className="mt-0"><CbtManager /></TabsContent>
          <TabsContent value="psikotes" className="mt-0"><PsikotesManager /></TabsContent>
          <TabsContent value="screening" className="mt-0"><ScreeningInsights /></TabsContent>
          <TabsContent value="monitor" className="mt-0"><MonitoringDashboard /></TabsContent>

          <TabsContent value="universities" className="mt-0"><UniversitiesManager /></TabsContent>
          <TabsContent value="scholarships" className="mt-0"><ScholarshipManager /></TabsContent>
          <TabsContent value="referrals" className="mt-0"><ReferralManager /></TabsContent>
          <TabsContent value="reports" className="mt-0"><UsageReports /></TabsContent>
        </Tabs>
      </div>

      <AdminBottomNav
        active={segment === "santri" ? "santri" : segment === "lainnya" ? "layanan" : "beranda"}
        onSantri={() => setTab("santri")}
        onLayanan={() => setTab("jobs")}
      />
    </div>
  );
};

export default Admin;
