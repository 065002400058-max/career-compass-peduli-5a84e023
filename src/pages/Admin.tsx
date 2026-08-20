import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Users, Briefcase, Building2, CheckCircle, XCircle, Brain, HeartPulse, GraduationCap,
  Award, MoreHorizontal, TrendingUp, FileDown, Bell, Menu, LayoutDashboard, UserCircle,
  ChevronDown, ArrowRight, User as UserIcon, MailPlus, Bot,
} from "lucide-react";
import AdminSidebar, { AdminNavItem } from "@/components/admin/AdminSidebar";
import SantriCenter from "@/components/admin/SantriCenter";
import AlumniCenter from "@/components/admin/AlumniCenter";
import CbtManager from "@/components/admin/CbtManager";
import PsikotesManager from "@/components/admin/PsikotesManager";
import ScreeningInsights from "@/components/admin/ScreeningInsights";
import UniversitiesManager from "@/components/admin/UniversitiesManager";
import ScholarshipManager from "@/components/admin/ScholarshipManager";
import ReferralManager from "@/components/admin/ReferralManager";
import InvitationsManager from "@/components/admin/InvitationsManager";
import UsageReports from "@/components/admin/UsageReports";
import JobsManager from "@/components/admin/JobsManager";
import PartnersManager from "@/components/admin/PartnersManager";
import EventsManager from "@/components/admin/EventsManager";
import AiHistoryViewer from "@/components/admin/AiHistoryViewer";
import CounselingManager from "@/components/admin/CounselingManager";
import AdminSettings from "@/components/admin/AdminSettings";


const MAIN_NAV: AdminNavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "santri", label: "Data Santri", icon: UserCircle },
  { key: "alumni", label: "Data Alumni", icon: Users },
];

const TOOL_NAV: AdminNavItem[] = [
  { key: "jobs", label: "Lowongan Kerja", icon: Briefcase },
  { key: "partners", label: "Mitra", icon: Building2 },
  { key: "events", label: "Event Karier", icon: Award },
  { key: "cbt", label: "Tes CBT", icon: Brain },
  { key: "psikotes", label: "Psikotes", icon: HeartPulse },
  { key: "screening", label: "Screening Mental", icon: TrendingUp },
  { key: "universities", label: "Kampus", icon: GraduationCap },
  { key: "scholarships", label: "Beasiswa", icon: Award },
  { key: "referrals", label: "Rujukan", icon: Users },
  { key: "reports", label: "Laporan Pengguna", icon: FileDown },
  { key: "invitations", label: "Undangan Akun", icon: MailPlus },
  { key: "ai-history", label: "Histori AI", icon: Bot },

];



const MENU_CARDS = [
  {
    key: "santri",
    icon: Users,
    title: "Data Santri",
    desc: "Kelola data santri, layanan, screening, CBT, psikotes, dan konseling.",
    cta: "Lihat Data Santri",
  },
  {
    key: "alumni",
    icon: GraduationCap,
    title: "Data Alumni",
    desc: "Kelola data alumni, tracer study, pekerjaan, pendidikan, dan karier.",
    cta: "Lihat Data Alumni",
  },
  {
    key: "tools",
    icon: MoreHorizontal,
    title: "Lainnya",
    desc: "Akses fitur administrasi seperti lowongan, mitra, kampus, beasiswa, dan lainnya.",
    cta: "Lihat Menu Lainnya",
  },
];

const Admin = () => {
  const { user, loading, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [view, setView] = useState("dashboard");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [year, setYear] = useState("2025/2026");


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
      const referrals = await supabase.from("counseling_referrals").select("id", { count: "exact", head: true }).eq("status", "pending");
      return { referrals: referrals.count ?? 0 };
    },
    enabled: isAdmin,
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;
  if (!isAdmin) return null;

  const ALIAS: Record<string, string> = {
    tools: "jobs",
    unidentified: "alumni",
  };


  const select = (key: string) => {
    const target = ALIAS[key] ?? key;
    setView(target);
    if (TOOL_NAV.some((t) => t.key === target)) setToolsOpen(true);
    setDrawer(false);
  };


  const setJobStatus = async (id: string, status: "approved" | "rejected") => {
    await supabase.from("jobs").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-pending-jobs"] });
  };

  const activeItem = [...MAIN_NAV, ...TOOL_NAV].find((i) => i.key === view);

  const Dashboard = () => (
    <div className="pt-8 md:pt-10 pb-6">
      <div className="text-center">
        <h1 className="font-heading text-[20px] md:text-[26px] font-bold text-foreground">
          Selamat datang di Admin Career Center <span className="text-primary">PEDULI</span>
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1.5">
          Kelola data dan layanan santri/alumni dengan mudah dan terintegrasi.
        </p>
      </div>
      <div className="mt-6 md:mt-7 mx-auto max-w-[980px] grid gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MENU_CARDS.map((c) => (
          <div key={c.key} className="rounded-lg border border-border bg-card p-6 md:p-7 flex flex-col items-center text-center shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]">
            <span className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
              <c.icon className="h-6 w-6 text-primary-foreground" strokeWidth={1.9} />
            </span>
            <h2 className="font-heading text-base md:text-[17px] font-semibold text-foreground mt-3.5">{c.title}</h2>
            <p className="text-xs md:text-[13px] text-muted-foreground leading-relaxed mt-2 max-w-[240px] flex-1">{c.desc}</p>
            <Button size="sm" className="mt-5 h-9 rounded-md px-4 text-[13px] w-full sm:w-auto" onClick={() => select(c.key)}>
              {c.cta} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case "dashboard": return <Dashboard />;
      case "santri": return <SantriCenter />;
      case "alumni": return <AlumniCenter />;
      case "jobs":
        return (
          <div className="space-y-4">
            {(pendingJobs?.length ?? 0) > 0 && (
              <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
                <div className="px-4 py-2.5 text-xs font-semibold text-foreground bg-muted/40">
                  Menunggu Validasi ({pendingJobs?.length})
                </div>
                {pendingJobs?.map((job: any) => (
                  <div key={job.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="font-heading font-semibold text-foreground truncate">{job.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">{job.company} · {job.location}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => setJobStatus(job.id, "rejected")}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => setJobStatus(job.id, "approved")}>
                        <CheckCircle className="h-4 w-4 mr-1" />Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <JobsManager />
          </div>
        );
      case "partners": return <PartnersManager />;
      case "events": return <EventsManager />;

      case "cbt": return <CbtManager />;
      case "psikotes": return <PsikotesManager />;
      case "screening": return <ScreeningInsights />;
      case "universities": return <UniversitiesManager />;
      case "scholarships": return <ScholarshipManager />;
      case "referrals": return <ReferralManager />;
      case "reports": return <UsageReports />;
      case "invitations": return <InvitationsManager />;
      case "ai-history": return <AiHistoryViewer />;

      default: return null;
    }
  };

  const tool = (key: string) => TOOL_NAV.find((t) => t.key === key)!;

  const sidebar = (
    <AdminSidebar
      active={view}
      onSelect={select}
      onCollapse={() => { setSidebarOpen(false); setDrawer(false); }}
      groups={[
        { items: [MAIN_NAV[0]] },
        {
          label: "Data Utama",
          items: [MAIN_NAV[1], MAIN_NAV[2], { key: "unidentified", label: "Belum Teridentifikasi", icon: UserCircle }],
        },
        { label: "Layanan & Tes", items: [tool("screening"), tool("cbt"), tool("psikotes"), { key: "counseling", label: "Konseling", icon: HeartPulse }, tool("referrals")] },
        { label: "Karier & Kemitraan", items: [tool("jobs"), tool("partners"), tool("events"), tool("universities"), tool("scholarships")] },
        { label: "Laporan", items: [tool("reports"), tool("ai-history")] },
        { label: "Akun & Akses", items: [tool("invitations")] },

        { label: "Pengaturan", items: [{ key: "settings", label: "Pengaturan", icon: MoreHorizontal }] },
      ]}

    />
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex w-full">
      {/* Desktop sidebar */}
      {sidebarOpen && (
        <aside className="hidden lg:block w-[224px] shrink-0 border-r border-border sticky top-0 h-screen">{sidebar}</aside>
      )}

      {/* Mobile drawer */}
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="p-0 w-[86vw] max-w-[320px] flex flex-col">
          <div className="flex-1 min-h-0">{sidebar}</div>
          <div className="border-t border-border p-3 space-y-2 bg-card">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground">
                <UserIcon className="h-4 w-4" />
              </span>
              <span className="leading-tight min-w-0">
                <span className="block text-[13px] font-semibold text-foreground truncate">{user?.email?.split("@")[0] ?? "Admin"}</span>
                <span className="block text-[11px] text-muted-foreground">Administrator</span>
              </span>
            </div>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { setDrawer(false); navigate("/profil"); }}>
              <UserIcon className="h-4 w-4 mr-2" /> Profil Saya
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={async () => { setDrawer(false); await signOut(); navigate("/"); }}>
              Keluar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top header */}
        <header className="h-[56px] lg:h-[60px] bg-card border-b border-border flex items-center gap-3 px-3 md:px-5">
          <button
            onClick={() => { if (window.innerWidth >= 1024) setSidebarOpen((o) => !o); else setDrawer(true); }}
            className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <span className="font-heading text-[14px] md:text-[15px] font-semibold text-foreground truncate">
            Career Center <span className="text-primary">PEDULI</span>
          </span>


          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="ml-auto hidden sm:block h-[38px] rounded-lg border border-border bg-card px-3 text-[12px] text-foreground"
            aria-label="Tahun Ajaran"
          >
            {["2025/2026", "2024/2025", "2023/2024"].map((y) => (
              <option key={y} value={y}>Tahun Ajaran {y}</option>
            ))}
          </select>


          <div className="ml-auto md:ml-0 flex items-center gap-2 md:gap-3">
            <button
              onClick={() => select("referrals")}
              className="relative h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary"
              aria-label="Notifikasi rujukan"
            >
              <Bell className="h-[18px] w-[18px]" />
              {(counts?.referrals ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
                  {counts?.referrals}
                </span>
              )}
            </button>
            <div className="hidden sm:block h-6 w-px bg-border" />
            <button onClick={() => navigate("/profil")} className="flex items-center gap-2 text-left">
              <span className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground">
                <UserIcon className="h-4 w-4" />
              </span>
              <span className="hidden sm:block leading-tight">
                <span className="block text-[13px] font-semibold text-foreground">{user?.email?.split("@")[0] ?? "Admin"}</span>
                <span className="block text-[11px] text-muted-foreground">Administrator</span>
              </span>
              <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Green strip */}
        <div className="h-[5px] bg-primary" />

        <main className="flex-1 min-w-0 overflow-x-hidden px-4 md:px-6 lg:px-8 pb-8 lg:pb-10 bg-muted/20">
          {view !== "dashboard" && view !== "santri" && view !== "alumni" && (
            <div className="pt-5 pb-4 flex items-center gap-2">
              {activeItem && <activeItem.icon className="h-4 w-4 text-primary" />}
              <h1 className="font-heading text-base md:text-lg font-semibold text-foreground">{activeItem?.label}</h1>
              <Button variant="outline" size="sm" className="ml-auto h-8 rounded-md text-xs" onClick={() => setView("dashboard")}>
                Kembali ke Dashboard
              </Button>
            </div>
          )}
          <div className={view === "dashboard" ? "" : view === "santri" || view === "alumni" ? "pt-5 pb-6" : "pb-6"}>{renderContent()}</div>
        </main>
      </div>

    </div>
  );
};

export default Admin;
