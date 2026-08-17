import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Users, Briefcase, Building2, CheckCircle, XCircle, Brain, HeartPulse, GraduationCap,
  Award, UserCircle, MoreHorizontal, TrendingUp, FileDown, ChevronLeft, Bell,
} from "lucide-react";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import SantriCenter from "@/components/admin/SantriCenter";
import AlumniCenter from "@/components/admin/AlumniCenter";
import CbtManager from "@/components/admin/CbtManager";
import PsikotesManager from "@/components/admin/PsikotesManager";
import ScreeningInsights from "@/components/admin/ScreeningInsights";
import UniversitiesManager from "@/components/admin/UniversitiesManager";
import ScholarshipManager from "@/components/admin/ScholarshipManager";
import ReferralManager from "@/components/admin/ReferralManager";
import UsageReports from "@/components/admin/UsageReports";

type Segment = "santri" | "alumni" | "lainnya";

const TOOLS = [
  { value: "jobs", label: "Validasi Lowongan", icon: Briefcase, desc: "Tinjau dan setujui lowongan dari mitra." },
  { value: "partners", label: "Mitra", icon: Building2, desc: "Kelola data mitra perusahaan." },
  { value: "cbt", label: "Tes CBT", icon: Brain, desc: "Kategori, tes, soal, dan jawaban CBT." },
  { value: "psikotes", label: "Psikotes", icon: HeartPulse, desc: "Screening mental & instrumen konseling." },
  { value: "screening", label: "Hasil Screening", icon: TrendingUp, desc: "Rekap interpretasi hasil screening." },
  { value: "universities", label: "Kampus", icon: GraduationCap, desc: "Direktori kampus dalam & luar negeri." },
  { value: "scholarships", label: "Beasiswa", icon: Award, desc: "Kelola informasi beasiswa." },
  { value: "referrals", label: "Rujukan", icon: Users, desc: "Tindak lanjut rujukan konseling." },
  { value: "reports", label: "Laporan Pengguna", icon: FileDown, desc: "Unduh laporan aktivitas pengguna." },
];

const SEGMENTS: { key: Segment; label: string; icon: any }[] = [
  { key: "santri", label: "Data Santri", icon: UserCircle },
  { key: "alumni", label: "Data Alumni", icon: Users },
  { key: "lainnya", label: "Lainnya", icon: MoreHorizontal },
];

const Admin = () => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [segment, setSegment] = useState<Segment>("santri");
  const [tool, setTool] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !hasRole("admin"))) navigate("/");
  }, [loading, user, hasRole, navigate]);

  const isAdmin = !!user && hasRole("admin");

  const { data: pendingJobs } = useQuery({
    queryKey: ["admin-pending-jobs"],
    queryFn: async () => (await supabase.from("jobs").select("*").eq("status", "pending").order("created_at", { ascending: false })).data ?? [],
    enabled: isAdmin,
  });

  const { data: counts } = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const [referrals] = await Promise.all([
        supabase.from("counseling_referrals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return { referrals: referrals.count ?? 0 };
    },
    enabled: isAdmin,
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;
  if (!isAdmin) return null;

  const approveJob = async (id: string, status: "approved" | "rejected") => {
    await supabase.from("jobs").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-pending-jobs"] });
  };

  const goSegment = (s: Segment) => { setSegment(s); setTool(null); };
  const activeTool = TOOLS.find((t) => t.value === tool);

  const renderTool = () => {
    switch (tool) {
      case "jobs":
        return (
          <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
            {(pendingJobs?.length ?? 0) === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Tidak ada lowongan yang menunggu validasi.</p>
              </div>
            ) : (
              pendingJobs?.map((job: any) => (
                <div key={job.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-heading font-semibold text-foreground truncate">{job.title}</h4>
                    <p className="text-sm text-muted-foreground truncate">{job.company} · {job.location}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => approveJob(job.id, "rejected")}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => approveJob(job.id, "approved")}>
                      <CheckCircle className="h-4 w-4 mr-1" />Approve
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case "partners":
        return (
          <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Manajemen mitra perusahaan akan ditampilkan di sini.</p>
          </div>
        );
      case "cbt": return <CbtManager />;
      case "psikotes": return <PsikotesManager />;
      case "screening": return <ScreeningInsights />;
      case "universities": return <UniversitiesManager />;
      case "scholarships": return <ScholarshipManager />;
      case "referrals": return <ReferralManager />;
      case "reports": return <UsageReports />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 pb-24 md:pb-10">
      <div className="w-full px-4 md:px-6 lg:px-10 xl:px-12 pt-5 md:pt-8 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Administrasi</p>
            <h1 className="font-heading text-xl md:text-2xl font-semibold text-foreground">
              Career Center <span className="text-primary">PEDULI</span>
            </h1>
          </div>
          <button
            onClick={() => { setSegment("lainnya"); setTool("referrals"); }}
            className="relative shrink-0 h-9 w-9 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
            aria-label="Notifikasi rujukan"
          >
            <Bell className="h-4 w-4" />
            {(counts?.referrals ?? 0) > 0 && <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
          </button>
        </div>

        {/* Segment tabs */}
        <div className="rounded-lg border border-border bg-card mb-5 overflow-hidden">
          <div className="grid grid-cols-3">
            {SEGMENTS.map((s) => {
              const active = segment === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => goSegment(s.key)}
                  className={`flex items-center justify-center gap-2 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                    active ? "border-primary bg-accent/50 text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <s.icon className="h-4 w-4" />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {segment === "santri" && <SantriCenter />}
        {segment === "alumni" && <AlumniCenter />}

        {segment === "lainnya" && (
          <div className="space-y-4">
            {!tool ? (
              <>
                <div>
                  <h2 className="font-heading text-xl md:text-2xl font-semibold text-foreground">Lainnya</h2>
                  <p className="text-sm text-muted-foreground">Fungsi administratif layanan Career Center PEDULI.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {TOOLS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTool(t.value)}
                      className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/30 transition-colors"
                    >
                      <span className="flex items-center gap-2 mb-1.5">
                        <t.icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
                        <span className="font-heading text-sm font-semibold text-foreground">{t.label}</span>
                      </span>
                      <span className="block text-xs text-muted-foreground leading-relaxed">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="rounded-md" onClick={() => setTool(null)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />Kembali
                  </Button>
                  {activeTool && (
                    <div className="flex items-center gap-2">
                      <activeTool.icon className="h-4 w-4 text-primary" />
                      <h2 className="font-heading text-base md:text-lg font-semibold text-foreground">{activeTool.label}</h2>
                    </div>
                  )}
                </div>
                {renderTool()}
              </>
            )}
          </div>
        )}
      </div>

      <AdminBottomNav
        active={segment === "santri" ? "santri" : segment === "lainnya" ? "layanan" : "beranda"}
        onSantri={() => goSegment("santri")}
        onLayanan={() => goSegment("lainnya")}
      />
    </div>
  );
};

export default Admin;
