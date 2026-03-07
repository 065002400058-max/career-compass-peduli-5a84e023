import { Users, Briefcase, Building2, FileText, CheckCircle, XCircle, Clock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsCard from "@/components/StatsCard";

const pendingJobs = [
  { id: 1, title: "Backend Developer", company: "PT Maju Bersama", posted: "2 jam lalu", status: "pending" },
  { id: 2, title: "Graphic Designer", company: "Kreativa Studio", posted: "5 jam lalu", status: "pending" },
  { id: 3, title: "Accountant", company: "CV Sejahtera", posted: "1 hari lalu", status: "pending" },
];

const recentAlumni = [
  { id: 1, name: "Rizal Pratama", year: 2023, status: "Verified" },
  { id: 2, name: "Dewi Sari", year: 2023, status: "Pending" },
  { id: 3, name: "Hassan Ali", year: 2023, status: "Verified" },
  { id: 4, name: "Nur Aini", year: 2023, status: "Pending" },
];

const Admin = () => (
  <div className="min-h-screen gradient-bg-subtle">
    <div className="container mx-auto section-padding">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Kelola data dan konten Career Center</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard icon={Users} value="12,500" label="Data Alumni" />
        <StatsCard icon={Briefcase} value="48" label="Lowongan Pending" />
        <StatsCard icon={Building2} value="12" label="Mitra Baru" />
        <StatsCard icon={FileText} value="25" label="Konten Karier" />
      </div>

      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="glass-card mb-6">
          <TabsTrigger value="jobs">Validasi Lowongan</TabsTrigger>
          <TabsTrigger value="alumni">Data Alumni</TabsTrigger>
          <TabsTrigger value="partners">Mitra</TabsTrigger>
          <TabsTrigger value="content">Konten</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <div className="glass-card rounded-xl divide-y divide-border">
            {pendingJobs.map((job) => (
              <div key={job.id} className="p-4 md:p-5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-heading font-semibold text-foreground">{job.title}</h4>
                  <p className="text-sm text-muted-foreground">{job.company} · {job.posted}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"><XCircle className="h-4 w-4" /></Button>
                  <Button size="sm"><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alumni">
          <div className="glass-card rounded-xl divide-y divide-border">
            {recentAlumni.map((a) => (
              <div key={a.id} className="p-4 md:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center font-heading font-bold text-accent-foreground text-sm">
                    {a.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-heading font-semibold text-foreground text-sm">{a.name}</h4>
                    <p className="text-xs text-muted-foreground">Angkatan {a.year}</p>
                  </div>
                </div>
                <Badge variant={a.status === "Verified" ? "default" : "secondary"}>{a.status}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="partners">
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Manajemen mitra perusahaan akan ditampilkan di sini.</p>
          </div>
        </TabsContent>

        <TabsContent value="content">
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Upload dan kelola konten karier di sini.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>
);

export default Admin;
