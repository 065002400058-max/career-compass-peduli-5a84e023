import { Users, Briefcase, Building2, FileText, CheckCircle, XCircle, Settings, Brain, HeartPulse, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsCard from "@/components/StatsCard";
import AlumniCsvImport from "@/components/AlumniCsvImport";
import AlumniAddDialog from "@/components/AlumniAddDialog";
import CbtManager from "@/components/admin/CbtManager";
import PsikotesManager from "@/components/admin/PsikotesManager";
import UniversitiesManager from "@/components/admin/UniversitiesManager";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !hasRole("admin"))) {
      navigate("/");
    }
  }, [loading, user, hasRole, navigate]);

  const { data: pendingJobs } = useQuery({
    queryKey: ["admin-pending-jobs"],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("*").eq("status", "pending").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user && hasRole("admin"),
  });

  const { data: recentAlumni } = useQuery({
    queryKey: ["admin-recent-alumni"],
    queryFn: async () => {
      const { data } = await supabase.from("alumni").select("*").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: !!user && hasRole("admin"),
  });

  const { data: counts } = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const [alumni, jobs, partners] = await Promise.all([
        supabase.from("alumni").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("partners").select("id", { count: "exact", head: true }),
      ]);
      return { alumni: alumni.count ?? 0, pendingJobs: jobs.count ?? 0, partners: partners.count ?? 0 };
    },
    enabled: !!user && hasRole("admin"),
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;
  if (!user || !hasRole("admin")) return null;

  const handleApproveJob = async (jobId: string) => {
    await supabase.from("jobs").update({ status: "approved" }).eq("id", jobId);
  };

  const handleRejectJob = async (jobId: string) => {
    await supabase.from("jobs").update({ status: "rejected" }).eq("id", jobId);
  };

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
          <StatsCard icon={Users} value={counts?.alumni.toLocaleString() ?? "0"} label="Data Alumni" />
          <StatsCard icon={Briefcase} value={counts?.pendingJobs.toLocaleString() ?? "0"} label="Lowongan Pending" />
          <StatsCard icon={Building2} value={counts?.partners.toLocaleString() ?? "0"} label="Perusahaan Mitra" />
          <StatsCard icon={FileText} value="0" label="Konten Karier" />
        </div>

        <Tabs defaultValue="jobs" className="w-full">
          <TabsList className="glass-card mb-6 flex-wrap h-auto">
            <TabsTrigger value="jobs">Validasi Lowongan</TabsTrigger>
            <TabsTrigger value="alumni">Data Alumni</TabsTrigger>
            <TabsTrigger value="partners">Mitra</TabsTrigger>
            <TabsTrigger value="cbt"><Brain className="h-4 w-4 mr-1" />Tes CBT</TabsTrigger>
            <TabsTrigger value="psikotes"><HeartPulse className="h-4 w-4 mr-1" />Psikotes</TabsTrigger>
            <TabsTrigger value="universities"><GraduationCap className="h-4 w-4 mr-1" />Kampus</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <div className="glass-card rounded-xl divide-y divide-border">
              {(pendingJobs?.length ?? 0) === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Tidak ada lowongan yang menunggu validasi.</p>
                </div>
              ) : (
                pendingJobs?.map((job) => (
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
            <div className="flex justify-end gap-2 mb-3">
              <AlumniAddDialog />
              <AlumniCsvImport />
            </div>
            <div className="glass-card rounded-xl divide-y divide-border">
              {(recentAlumni?.length ?? 0) === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada data alumni.</p>
                </div>
              ) : (
                recentAlumni?.map((a) => (
                  <div key={a.id} className="p-4 md:p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center font-heading font-bold text-accent-foreground text-sm">
                        {a.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-heading font-semibold text-foreground text-sm">{a.name}</h4>
                        <p className="text-xs text-muted-foreground">Angkatan {a.graduation_year} · {a.company ?? "-"}</p>
                      </div>
                    </div>
                    <Badge variant={a.status === "Bekerja" ? "default" : "secondary"}>{a.status}</Badge>
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
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
