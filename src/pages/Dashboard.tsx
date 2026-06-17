import { Users, Briefcase, Building2, GraduationCap, TrendingUp, Brain, HeartPulse, PieChart as PieIcon } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";

const COLORS = ["#10B981", "#1E3A8A", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#94A3B8"];

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const { data: counts } = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const [alumni, jobs, partners, events, psikotes, cbt] = await Promise.all([
        supabase.from("alumni").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("partners").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("psikotes_attempts").select("id", { count: "exact", head: true }),
        supabase.from("cbt_attempts").select("id", { count: "exact", head: true }),
      ]);
      return {
        alumni: alumni.count ?? 0,
        jobs: jobs.count ?? 0,
        partners: partners.count ?? 0,
        events: events.count ?? 0,
        psikotes: psikotes.count ?? 0,
        cbt: cbt.count ?? 0,
      };
    },
    enabled: !!user,
  });

  const { data: alumniData } = useQuery({
    queryKey: ["dashboard-alumni-all"],
    queryFn: async () => {
      const { data } = await supabase.from("alumni").select("graduation_year,gender,major,position,university").limit(5000);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: psikotesData } = useQuery({
    queryKey: ["dashboard-psikotes"],
    queryFn: async () => {
      const { data } = await supabase.from("psikotes_attempts").select("level,completed_at").limit(1000);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: cbtData } = useQuery({
    queryKey: ["dashboard-cbt"],
    queryFn: async () => {
      const { data } = await supabase.from("cbt_attempts").select("percentage,passed,completed_at").limit(1000);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Alumni per angkatan
  const angkatanChart = useMemo(() => {
    const map = new Map<number, number>();
    (alumniData ?? []).forEach((a: any) => {
      if (a.graduation_year) map.set(a.graduation_year, (map.get(a.graduation_year) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year: String(year), count }));
  }, [alumniData]);

  // Distribusi jurusan top 8
  const jurusanChart = useMemo(() => {
    const map = new Map<string, number>();
    (alumniData ?? []).forEach((a: any) => {
      const k = (a.major || "Lainnya").trim() || "Lainnya";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [alumniData]);

  // Gender
  const genderChart = useMemo(() => {
    const map = new Map<string, number>();
    (alumniData ?? []).forEach((a: any) => {
      const k = a.gender || "Tidak diisi";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [alumniData]);

  // Psikotes level distribution
  const psikotesChart = useMemo(() => {
    const map = new Map<string, number>();
    (psikotesData ?? []).forEach((p: any) => {
      const k = p.level || "Belum dinilai";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([level, count]) => ({ level, count }));
  }, [psikotesData]);

  // CBT pass rate
  const cbtChart = useMemo(() => {
    const passed = (cbtData ?? []).filter((c: any) => c.passed).length;
    const failed = (cbtData ?? []).length - passed;
    return [
      { name: "Lulus", value: passed },
      { name: "Belum Lulus", value: failed },
    ];
  }, [cbtData]);

  // Universitas top 6 — radar
  const universitasChart = useMemo(() => {
    const map = new Map<string, number>();
    (alumniData ?? []).forEach((a: any) => {
      if (a.university) map.set(a.university, (map.get(a.university) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([subject, A]) => ({ subject: subject.length > 20 ? subject.slice(0, 20) + "…" : subject, A }));
  }, [alumniData]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard Analitik</h1>
          <p className="text-muted-foreground mt-1">Visualisasi data Career Center PEDULI secara real-time</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <StatsCard icon={Users} value={counts?.alumni.toLocaleString() ?? "0"} label="Total Alumni" onClick={() => navigate("/alumni")} />
          <StatsCard icon={Briefcase} value={counts?.jobs.toLocaleString() ?? "0"} label="Lowongan" onClick={() => navigate("/jobs")} />
          <StatsCard icon={Building2} value={counts?.partners.toLocaleString() ?? "0"} label="Mitra" onClick={() => navigate("/partners")} />
          <StatsCard icon={GraduationCap} value={counts?.events.toLocaleString() ?? "0"} label="Event" onClick={() => navigate("/events")} />
          <StatsCard icon={HeartPulse} value={counts?.psikotes.toLocaleString() ?? "0"} label="Psikotes" onClick={() => navigate("/psikotes")} />
          <StatsCard icon={Brain} value={counts?.cbt.toLocaleString() ?? "0"} label="Tes CBT" onClick={() => navigate("/cbt")} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold">Alumni per Angkatan</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={angkatanChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} />
                <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <PieIcon className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold">Top 8 Jurusan Alumni</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={jurusanChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-heading font-semibold mb-4">Distribusi Gender</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={genderChart} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                  {genderChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-xl p-6">
            <h3 className="font-heading font-semibold mb-4">Tingkat Psikotes Santri</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={psikotesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="level" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} />
                <Bar dataKey="count" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-xl p-6">
            <h3 className="font-heading font-semibold mb-4">Hasil Tes CBT</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={cbtChart} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                  <Cell fill="#10B981" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {universitasChart.length > 0 && (
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-heading font-semibold mb-4">Top 6 Universitas Tujuan Alumni</h3>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={universitasChart}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Radar name="Alumni" dataKey="A" stroke="#10B981" fill="#10B981" fillOpacity={0.5} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
