import { Users, Briefcase, Building2, GraduationCap, TrendingUp } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const careerData = [
  { name: "IT", value: 320 },
  { name: "Pendidikan", value: 280 },
  { name: "Keuangan", value: 200 },
  { name: "Kesehatan", value: 150 },
  { name: "Manufaktur", value: 120 },
  { name: "Lainnya", value: 180 },
];

const placementData = [
  { month: "Jan", placed: 45 },
  { month: "Feb", placed: 52 },
  { month: "Mar", placed: 61 },
  { month: "Apr", placed: 58 },
  { month: "May", placed: 72 },
  { month: "Jun", placed: 85 },
];

const COLORS = ["#10B981", "#1E3A8A", "#3B82F6", "#8B5CF6", "#F59E0B", "#94A3B8"];

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const { data: counts } = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const [alumni, jobs, partners, events] = await Promise.all([
        supabase.from("alumni").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("partners").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
      ]);
      return {
        alumni: alumni.count ?? 0,
        jobs: jobs.count ?? 0,
        partners: partners.count ?? 0,
        events: events.count ?? 0,
      };
    },
    enabled: !!user,
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Ringkasan data Career Center PEDULI</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatsCard icon={Users} value={counts?.alumni.toLocaleString() ?? "0"} label="Total Alumni" />
          <StatsCard icon={Briefcase} value={counts?.jobs.toLocaleString() ?? "0"} label="Lowongan Aktif" />
          <StatsCard icon={Building2} value={counts?.partners.toLocaleString() ?? "0"} label="Perusahaan Mitra" />
          <StatsCard icon={GraduationCap} value={counts?.events.toLocaleString() ?? "0"} label="Total Event" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">Penempatan Kerja</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={placementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} />
                <Bar dataKey="placed" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">Distribusi Karier Alumni</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={careerData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                  {careerData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
