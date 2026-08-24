import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { detectScreeningKind } from "@/lib/psikotesScoring";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { Users, UserCircle, GraduationCap, HeartPulse, Brain, Search, FileSpreadsheet, FileDown, Activity, Target } from "lucide-react";
import { useAlumniRealtime } from "@/hooks/useAlumniRealtime";
import { fetchAllRows } from "@/lib/fetchAllRows";

const COLORS = ["#10B981", "#1E3A8A", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#94A3B8"];
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("id-ID") : "-");
const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString("id-ID") : "-");
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

const TOOLTIP_STYLE = {
  background: "hsl(var(--card) / 0.92)",
  border: "1px solid hsl(var(--primary) / 0.35)",
  borderRadius: "0.85rem",
  boxShadow: "0 18px 40px -18px hsl(var(--primary) / 0.55)",
  backdropFilter: "blur(10px)",
  fontSize: 12,
};

/** Kartu chart dengan efek glass, glow, dan animasi masuk */
function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-border/70 bg-card/80 p-4 shadow-[0_18px_45px_-28px_hsl(var(--primary)/0.45)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_30px_60px_-24px_hsl(var(--primary)/0.55)] animate-fade-in ${className}`}
    >
      <div className="pointer-events-none absolute -top-24 -right-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl transition-opacity duration-500 group-hover:opacity-90 opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-[#3B82F6]/10 blur-3xl" />
      <div className="relative mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-heading text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="h-2 w-10 rounded-full bg-gradient-to-r from-primary via-[#3B82F6] to-[#8B5CF6]" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

/** Definisi gradient & filter 3D untuk semua chart */
const ChartDefs = () => (
  <defs>
    <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#34D399" stopOpacity={1} />
      <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
    </linearGradient>
    <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#F87171" stopOpacity={1} />
      <stop offset="100%" stopColor="#DC2626" stopOpacity={0.75} />
    </linearGradient>
    <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#A78BFA" stopOpacity={1} />
      <stop offset="100%" stopColor="#6D28D9" stopOpacity={0.8} />
    </linearGradient>
    <linearGradient id="gradBlueH" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#1E3A8A" stopOpacity={0.85} />
      <stop offset="100%" stopColor="#60A5FA" stopOpacity={1} />
    </linearGradient>
    <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#10B981" stopOpacity={0.55} />
      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
    </linearGradient>
    <filter id="chart3d" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#0F172A" floodOpacity="0.28" />
    </filter>
    <filter id="chartGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);


type StatusKey = "santri" | "alumni" | "unknown";
type Filter = "all" | "santri" | "alumni";

export interface MonitorUser {
  user_id: string;
  name: string;
  status: StatusKey;
  statusLabel: string;
  education_level: string;
  school: string;
  major: string;
  university: string;
  phone: string;
  screening: any[];
  psikotes: any[];
  cbt: any[];
  counseling: any[];
  lastActivity: string | null;
}

const STATUS_LABEL: Record<StatusKey, string> = {
  santri: "SANTRI",
  alumni: "ALUMNI",
  unknown: "Belum Teridentifikasi",
};

function useMonitoringData() {
  return useQuery({
    queryKey: ["admin-monitoring"],
    queryFn: async () => {
      // fetchAllRows: lewati batas ±1.000 baris per request PostgREST agar statistik valid
      const [roles, profilesRows, alumniRows, psiAttempts, psiTests, psiCats, cbtAttempts, cbtTests, referrals] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        fetchAllRows(() => supabase.from("profiles").select("*")),
        fetchAllRows(() => supabase.from("alumni").select("*")),
        supabase.from("psikotes_attempts").select("*").order("completed_at", { ascending: false }),
        supabase.from("psikotes_tests").select("id, title, category_id"),
        supabase.from("psikotes_categories").select("id, name"),
        supabase.from("cbt_attempts").select("*").order("completed_at", { ascending: false }),
        supabase.from("cbt_tests").select("id, title"),
        supabase.from("counseling_referrals").select("*").order("created_at", { ascending: false }),
      ]);

      const catMap = new Map((psiCats.data ?? []).map((c: any) => [c.id, c.name]));
      const psiTestMap = new Map(
        (psiTests.data ?? []).map((t: any) => [t.id, { title: t.title, category: catMap.get(t.category_id) ?? "" }])
      );
      const cbtTestMap = new Map((cbtTests.data ?? []).map((t: any) => [t.id, t.title]));

      // status per user (role based, unique user id)
      const roleMap = new Map<string, StatusKey>();
      (roles.data ?? []).forEach((r: any) => {
        if (r.role === "santri" || r.role === "alumni") {
          // alumni menang jika user punya dua role
          if (r.role === "alumni" || !roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
        }
      });

      const profileMap = new Map(profilesRows.map((p: any) => [p.user_id ?? p.id, p]));
      const alumniByUser = new Map(alumniRows.filter((a: any) => a.user_id).map((a: any) => [a.user_id, a]));

      // kumpulkan semua user id yang punya jejak di sistem
      const ids = new Set<string>();
      profilesRows.forEach((p: any) => ids.add(p.user_id ?? p.id));
      (roles.data ?? []).forEach((r: any) => ids.add(r.user_id));
      [...(psiAttempts.data ?? []), ...(cbtAttempts.data ?? []), ...(referrals.data ?? [])].forEach((r: any) => r.user_id && ids.add(r.user_id));

      const users: MonitorUser[] = [...ids].map((uid) => {
        const p: any = profileMap.get(uid) ?? {};
        const al: any = alumniByUser.get(uid) ?? {};
        const status: StatusKey = roleMap.get(uid) ?? (alumniByUser.has(uid) ? "alumni" : "unknown");

        const allPsi = (psiAttempts.data ?? []).filter((a: any) => a.user_id === uid).map((a: any) => {
          const t: any = psiTestMap.get(a.test_id) ?? {};
          return { ...a, test_title: t.title ?? "-", kind: detectScreeningKind(t.title, t.category) };
        });
        const cbt = (cbtAttempts.data ?? []).filter((a: any) => a.user_id === uid).map((a: any) => ({ ...a, test_title: cbtTestMap.get(a.test_id) ?? "-" }));
        const counseling = (referrals.data ?? []).filter((r: any) => r.user_id === uid);

        const dates = [
          ...allPsi.map((a: any) => a.completed_at ?? a.created_at),
          ...cbt.map((a: any) => a.completed_at ?? a.created_at),
          ...counseling.map((c: any) => c.created_at),
        ].filter(Boolean).sort();

        return {
          user_id: uid,
          name: p.full_name || al.name || "(Tanpa Nama)",
          status,
          statusLabel: STATUS_LABEL[status],
          education_level: p.education_level || al.education_level || "-",
          school: p.school_origin || "-",
          major: p.major || al.major || "-",
          university: p.university || al.university || "-",
          phone: p.phone || "-",
          screening: allPsi.filter((a: any) => a.kind),
          psikotes: allPsi.filter((a: any) => !a.kind),
          cbt,
          counseling,
          lastActivity: dates.length ? dates[dates.length - 1] : null,
        };
      });

      return { users, alumniRecords: alumniRows };
    },
  });
}

const StatCard = ({ icon: Icon, value, label, sub }: any) => (
  <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <span className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-heading font-bold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1 truncate">{label}</div>
      </div>
    </div>
    {sub && <div className="text-[11px] text-muted-foreground mt-2">{sub}</div>}
  </div>
);

const MonitoringDashboard = () => {
  useAlumniRealtime();
  const { data, isLoading } = useMonitoringData();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [detail, setDetail] = useState<MonitorUser | null>(null);
  const [list, setList] = useState<{ title: string; rows: MonitorUser[] } | null>(null);

  const users = data?.users ?? [];
  const alumniRecords = data?.alumniRecords ?? [];

  const santri = useMemo(() => users.filter((u) => u.status === "santri"), [users]);
  const alumniUsers = useMemo(() => users.filter((u) => u.status === "alumni"), [users]);
  const unknown = useMemo(() => users.filter((u) => u.status === "unknown"), [users]);

  const scoped = useMemo(
    () => (filter === "all" ? [...santri, ...alumniUsers] : filter === "santri" ? santri : alumniUsers),
    [filter, santri, alumniUsers]
  );

  const has = {
    screening: (u: MonitorUser) => u.screening.length > 0,
    cbt: (u: MonitorUser) => u.cbt.length > 0,
    psikotes: (u: MonitorUser) => u.psikotes.length > 0,
    counseling: (u: MonitorUser) => u.counseling.length > 0,
  };

  const service = (key: keyof typeof has, pool: MonitorUser[]) => {
    const done = pool.filter(has[key]);
    const not = pool.filter((u) => !has[key](u));
    const attempts = pool.reduce((n, u) => n + (u as any)[key].length, 0);
    return { total: pool.length, done, not, attempts, percent: pct(done.length, pool.length) };
  };

  const svc = {
    screening: service("screening", scoped),
    cbt: service("cbt", scoped),
    psikotes: service("psikotes", scoped),
    counseling: service("counseling", scoped),
  };

  const openList = (title: string, rows: MonitorUser[]) => setList({ title, rows });

  // ===== Screening category distribution =====
  const screeningCats = useMemo(() => {
    const build = (kind: string) => {
      const map = new Map<string, MonitorUser[]>();
      scoped.forEach((u) => {
        const latest = u.screening.filter((a: any) => a.kind === kind)[0];
        if (!latest) return;
        const lvl = latest.level || "Belum dinilai";
        map.set(lvl, [...(map.get(lvl) ?? []), u]);
      });
      return [...map.entries()].map(([level, rows]) => ({
        level,
        rows,
        total: rows.length,
        santri: rows.filter((r) => r.status === "santri").length,
        alumni: rows.filter((r) => r.status === "alumni").length,
      }));
    };
    return { pss10: build("pss10"), brs: build("brs"), srq20: build("srq20") };
  }, [scoped]);

  // ===== Target program =====
  const smaLevels = ["sma", "ma", "smk"];
  const santriSma = santri.filter((s) => smaLevels.some((l) => (s.education_level || "").toLowerCase().includes(l)));
  const santriSmaDone = santriSma.filter(has.screening);
  const alumniActual = alumniRecords.length;

  // ===== Charts =====
  const populationChart = [
    { name: "Santri", value: santri.length },
    { name: "Alumni", value: alumniUsers.length },
    { name: "Belum Teridentifikasi", value: unknown.length },
  ].filter((d) => d.value > 0);

  const participationChart = [
    { name: "Screening", Sudah: svc.screening.done.length, Belum: svc.screening.not.length },
    { name: "CBT", Sudah: svc.cbt.done.length, Belum: svc.cbt.not.length },
    { name: "Psikotes", Sudah: svc.psikotes.done.length, Belum: svc.psikotes.not.length },
    { name: "Konseling", Sudah: svc.counseling.done.length, Belum: svc.counseling.not.length },
  ];

  const angkatanChart = useMemo(() => {
    const map = new Map<number, number>();
    alumniRecords.forEach((a: any) => a.graduation_year && map.set(a.graduation_year, (map.get(a.graduation_year) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year: String(year), count }));
  }, [alumniRecords]);

  const alumniGroup = (field: string, limit = 8) => {
    const map = new Map<string, number>();
    alumniRecords.forEach((a: any) => {
      const k = (a[field] || "Tidak diisi").toString().trim() || "Tidak diisi";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, value]) => ({ name, value }));
  };
  const jurusanChart = useMemo(() => alumniGroup("major"), [alumniRecords]);
  const genderChart = useMemo(() => alumniGroup("gender", 5), [alumniRecords]);
  const universitasChart = useMemo(
    () => alumniGroup("university", 6).map((d) => ({ subject: d.name.length > 18 ? d.name.slice(0, 18) + "…" : d.name, A: d.value })),
    [alumniRecords]
  );

  // ===== Monitoring table =====
  const tableRows = useMemo(() => {
    let rows = filter === "all" ? users : scoped;
    if (serviceFilter !== "all") {
      const [key, state] = serviceFilter.split(":") as [keyof typeof has, string];
      rows = rows.filter((u) => (state === "sudah" ? has[key](u) : !has[key](u)));
    }
    if (q) {
      const s = q.toLowerCase();
      rows = rows.filter((u) =>
        [u.name, u.school, u.major, u.university, u.statusLabel, u.education_level, u.phone]
          .some((v) => String(v ?? "").toLowerCase().includes(s))
      );
    }
    return rows.sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));
  }, [users, scoped, filter, serviceFilter, q]);

  const exportRows = tableRows.map((u, i) => ({
    No: i + 1,
    Nama: u.name,
    Status: u.statusLabel,
    Jenjang: u.education_level,
    Sekolah: u.school,
    Jurusan: u.major,
    Universitas: u.university,
    Screening: has.screening(u) ? "Sudah" : "Belum",
    CBT: has.cbt(u) ? "Sudah" : "Belum",
    Psikotes: has.psikotes(u) ? "Sudah" : "Belum",
    Konseling: has.counseling(u) ? "Sudah" : "Belum",
    "Hasil Screening": u.screening.map((a: any) => `${a.test_title}: ${a.level ?? "-"}`).join(" | ") || "-",
    "Hasil CBT": u.cbt.map((a: any) => `${a.test_title}: ${a.percentage}% ${a.passed ? "Lulus" : "Belum Lulus"}`).join(" | ") || "-",
    "Aktivitas Terakhir": fmtDate(u.lastActivity),
  }));

  // ===== Recent activity =====
  const recent = useMemo(() => {
    const items: { name: string; status: string; service: string; activity: string; date: string }[] = [];
    scoped.forEach((u) => {
      u.screening.forEach((a: any) => items.push({ name: u.name, status: u.statusLabel, service: "Screening", activity: `Mengerjakan ${a.test_title}`, date: a.completed_at ?? a.created_at }));
      u.psikotes.forEach((a: any) => items.push({ name: u.name, status: u.statusLabel, service: "Psikotes", activity: `Mengerjakan ${a.test_title}`, date: a.completed_at ?? a.created_at }));
      u.cbt.forEach((a: any) => items.push({ name: u.name, status: u.statusLabel, service: "CBT", activity: `Mengikuti ${a.test_title}`, date: a.completed_at ?? a.created_at }));
      u.counseling.forEach((c: any) => items.push({ name: u.name, status: u.statusLabel, service: "Konseling", activity: c.reason ?? "Rujukan konseling", date: c.created_at }));
    });
    return items.filter((i) => i.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  }, [scoped]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Memuat data monitoring...</div>;

  const ServiceSection = ({ title, icon: Icon, keyName }: { title: string; icon: any; keyName: keyof typeof has }) => {
    const groups: { label: string; pool: MonitorUser[] }[] = [
      { label: "Santri", pool: santri },
      { label: "Alumni", pool: alumniUsers },
    ].filter((g) => filter === "all" || filter === g.label.toLowerCase());
    return (
      <div className="rounded-2xl bg-card border border-border p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold">{title}</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {groups.map((g) => {
            const s = service(keyName, g.pool);
            return (
              <div key={g.label} className="rounded-xl bg-muted/40 p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={g.label === "Santri" ? "default" : "secondary"}>{g.label.toUpperCase()}</Badge>
                  <span className="text-xs text-muted-foreground">Total {s.total}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <button className="flex-1 rounded-lg bg-emerald-500/10 text-emerald-700 py-2 hover:bg-emerald-500/20" onClick={() => openList(`${g.label} sudah ${title}`, s.done)}>
                    Sudah <b>{s.done.length}</b>
                  </button>
                  <button className="flex-1 rounded-lg bg-destructive/10 text-destructive py-2 hover:bg-destructive/20" onClick={() => openList(`${g.label} belum ${title}`, s.not)}>
                    Belum <b>{s.not.length}</b>
                  </button>
                </div>
                <div className="mt-2">
                  <Progress value={s.percent} className="h-1.5" />
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                    <span>Partisipasi {s.percent}%</span>
                    <span>{s.done.length} peserta · {s.attempts} attempt</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Filter global */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "santri", "alumni"] as Filter[]).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="rounded-xl" onClick={() => setFilter(f)}>
            {f === "all" ? "Semua" : f === "santri" ? "Santri" : "Alumni"}
          </Button>
        ))}
        {unknown.length > 0 && (
          <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => openList("Belum Teridentifikasi", unknown)}>
            Belum Teridentifikasi: {unknown.length} orang
          </Button>
        )}
      </div>

      {/* Populasi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} value={santri.length + alumniUsers.length} label="Total Pengguna (Santri + Alumni)" />
        <StatCard icon={UserCircle} value={santri.length} label="Total Santri" />
        <StatCard icon={GraduationCap} value={alumniUsers.length} label="Total Alumni (akun)" sub={`Data alumni tercatat: ${alumniActual}`} />
        <StatCard icon={Activity} value={`${svc.screening.percent}%`} label="Partisipasi Screening" sub={`${svc.screening.done.length} dari ${svc.screening.total} orang`} />
      </div>

      {/* Ringkasan partisipasi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Screening", s: svc.screening, key: "screening" as const },
          { label: "CBT", s: svc.cbt, key: "cbt" as const },
          { label: "Psikotes", s: svc.psikotes, key: "psikotes" as const },
          { label: "Konseling", s: svc.counseling, key: "counseling" as const },
        ].map(({ label, s }) => (
          <div key={label} className="rounded-2xl bg-card border border-border p-4 shadow-sm">
            <div className="font-heading font-semibold text-sm mb-2">{label}</div>
            <div className="text-2xl font-bold">{s.percent}%</div>
            <div className="flex gap-2 mt-2 text-xs">
              <button className="flex-1 rounded-lg bg-emerald-500/10 text-emerald-700 py-1.5" onClick={() => openList(`Sudah ${label}`, s.done)}>Sudah {s.done.length}</button>
              <button className="flex-1 rounded-lg bg-destructive/10 text-destructive py-1.5" onClick={() => openList(`Belum ${label}`, s.not)}>Belum {s.not.length}</button>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">Peserta {s.done.length} orang · {s.attempts} attempt</div>
          </div>
        ))}
      </div>

      {/* Target program */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><Target className="h-4 w-4 text-primary" /><h3 className="font-heading font-semibold text-sm">Skrining Awal Santri SMA/MA/SMK (target 50%)</h3></div>
          <Progress value={Math.min(100, pct(santriSmaDone.length, santriSma.length))} className="h-2" />
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
            <span>Total santri SMA: <b className="text-foreground">{santriSma.length}</b></span>
            <span>Persentase: <b className="text-foreground">{pct(santriSmaDone.length, santriSma.length)}%</b></span>
            <button className="text-left hover:text-primary" onClick={() => openList("Santri SMA sudah screening", santriSmaDone)}>Sudah: <b className="text-foreground">{santriSmaDone.length}</b></button>
            <button className="text-left hover:text-primary" onClick={() => openList("Santri SMA belum screening", santriSma.filter((u) => !has.screening(u)))}>Belum: <b className="text-foreground">{santriSma.length - santriSmaDone.length}</b></button>
          </div>
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><Target className="h-4 w-4 text-primary" /><h3 className="font-heading font-semibold text-sm">Data Alumni menuju 400 (baseline 281)</h3></div>
          <Progress value={Math.min(100, pct(alumniActual, 400))} className="h-2" />
          <div className="text-xs text-muted-foreground mt-2">Aktual: <b className="text-foreground">{alumniActual}</b> · Target: 400 · Capaian: <b className="text-foreground">{pct(alumniActual, 400)}%</b></div>
        </div>
      </div>

      {/* Section per layanan */}
      <ServiceSection title="Screening Mental" icon={HeartPulse} keyName="screening" />
      <ServiceSection title="Tes CBT" icon={Brain} keyName="cbt" />
      <ServiceSection title="Psikotes" icon={Activity} keyName="psikotes" />
      <ServiceSection title="Konseling" icon={Users} keyName="counseling" />

      {/* Diagram */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Komposisi Populasi" subtitle="Santri, alumni, & belum teridentifikasi">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <ChartDefs />
              {/* lapisan bawah untuk efek kedalaman 3D */}
              <Pie
                data={populationChart}
                dataKey="value"
                cx="50%"
                cy="55%"
                innerRadius={52}
                outerRadius={92}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
                stroke="none"
              >
                {populationChart.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.25} />
                ))}
              </Pie>
              <Pie
                data={populationChart}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={92}
                paddingAngle={4}
                cornerRadius={8}
                startAngle={90}
                endAngle={-270}
                filter="url(#chart3d)"
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                fontSize={11}
                animationDuration={1300}
              >
                {populationChart.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={3} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Partisipasi Layanan" subtitle="Sudah vs belum mengikuti tiap layanan">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={participationChart} barGap={6}>
              <ChartDefs />
              <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--primary) / 0.08)" }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Sudah" fill="url(#gradEmerald)" radius={[10, 10, 4, 4]} filter="url(#chart3d)" animationDuration={1200} />
              <Bar dataKey="Belum" fill="url(#gradRed)" radius={[10, 10, 4, 4]} filter="url(#chart3d)" animationDuration={1400} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Hasil screening per instrumen */}
      <div className="grid lg:grid-cols-3 gap-4">
        {([["PSS-10", screeningCats.pss10], ["BRS", screeningCats.brs], ["SRQ-20", screeningCats.srq20]] as const).map(([label, cats]) => (
          <ChartCard key={label} title={`Hasil ${label}`} subtitle="Klik kategori untuk melihat daftar nama">
            {cats.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada data.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={185}>
                  <BarChart data={cats.map((c) => ({ name: c.level, total: c.total }))} barSize={26}>
                    <ChartDefs />
                    <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" fontSize={9} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} allowDecimals={false} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--primary) / 0.08)" }} />
                    <Bar dataKey="total" fill="url(#gradViolet)" radius={[10, 10, 4, 4]} filter="url(#chart3d)" animationDuration={1200} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {cats.map((c) => (
                    <button
                      key={c.level}
                      className="w-full text-left rounded-xl border border-transparent bg-muted/40 px-3 py-2 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/50"
                      onClick={() => openList(`${label} — ${c.level}`, c.rows)}
                    >
                      <div className="text-xs font-medium">{c.level}</div>
                      <div className="text-[11px] text-muted-foreground">Total {c.total} · Santri {c.santri} · Alumni {c.alumni}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </ChartCard>
        ))}
      </div>


      {/* Tabel monitoring */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm space-y-3">
        <h3 className="font-heading font-semibold">Monitoring Layanan Pengguna</h3>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama, sekolah, jurusan, universitas, jenjang..." className="pl-9 rounded-xl" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="all">Semua Layanan</option>
            <option value="screening:sudah">Sudah Screening</option>
            <option value="screening:belum">Belum Screening</option>
            <option value="cbt:sudah">Sudah CBT</option>
            <option value="cbt:belum">Belum CBT</option>
            <option value="psikotes:sudah">Sudah Psikotes</option>
            <option value="psikotes:belum">Belum Psikotes</option>
            <option value="counseling:sudah">Sudah Konseling</option>
            <option value="counseling:belum">Belum Konseling</option>
          </select>
          <Button size="sm" variant="outline" className="h-10 rounded-xl" onClick={() => exportToExcel(exportRows, "monitoring-pengguna")} disabled={!exportRows.length}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
          </Button>
          <Button size="sm" className="h-10 rounded-xl" onClick={() => exportToPDF(exportRows, "monitoring-pengguna", "Monitoring Layanan Pengguna PEDULI", { badge: "Laporan Monitoring", reportKind: "Monitoring Layanan", subtitle: "Progres layanan skrining, CBT, dan konseling per pengguna", summary: [{ label: "Total Pengguna", value: exportRows.length }] })} disabled={!exportRows.length}>
            <FileDown className="h-4 w-4 mr-1.5" /> PDF
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">Menampilkan {tableRows.length} pengguna</div>
        <div className="overflow-auto max-h-[70vh] rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left sticky top-0">
              <tr>
                <th className="p-3">Nama</th>
                <th className="p-3">Status</th>
                <th className="p-3">Jenjang</th>
                <th className="p-3">Sekolah/Institusi</th>
                <th className="p-3 text-center">Screening</th>
                <th className="p-3 text-center">CBT</th>
                <th className="p-3 text-center">Psikotes</th>
                <th className="p-3 text-center">Konseling</th>
                <th className="p-3">Hasil Screening</th>
                <th className="p-3">Hasil CBT</th>
                <th className="p-3">Aktivitas Terakhir</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr><td colSpan={12} className="p-8 text-center text-muted-foreground">Tidak ada pengguna sesuai filter.</td></tr>
              ) : tableRows.map((u) => (
                <tr key={u.user_id} className="border-t border-border/60 hover:bg-muted/20">
                  <td className="p-3">
                    <button className="font-medium hover:text-primary text-left" onClick={() => setDetail(u)}>{u.name}</button>
                  </td>
                  <td className="p-3"><Badge variant={u.status === "santri" ? "default" : u.status === "alumni" ? "secondary" : "outline"}>{u.statusLabel}</Badge></td>
                  <td className="p-3 text-xs">{u.education_level}</td>
                  <td className="p-3 text-xs">{u.school !== "-" ? u.school : u.university}</td>
                  {(["screening", "cbt", "psikotes", "counseling"] as const).map((k) => (
                    <td key={k} className="p-3 text-center">{has[k](u) ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-muted-foreground">—</span>}</td>
                  ))}
                  <td className="p-3 text-xs max-w-[180px] truncate">{u.screening[0] ? `${u.screening[0].test_title}: ${u.screening[0].level ?? "-"}` : "-"}</td>
                  <td className="p-3 text-xs max-w-[160px] truncate">{u.cbt[0] ? `${u.cbt[0].percentage}% ${u.cbt[0].passed ? "Lulus" : "Belum"}` : "-"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{fmtDate(u.lastActivity)}</td>
                  <td className="p-3"><Button size="sm" variant="ghost" onClick={() => setDetail(u)}>Detail</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aktivitas terbaru */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
        <h3 className="font-heading font-semibold mb-3">Aktivitas Terbaru</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((r, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.name} <Badge variant="outline" className="ml-1 text-[10px]">{r.status}</Badge></div>
                  <div className="text-xs text-muted-foreground truncate">{r.service} · {r.activity}</div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{fmtDate(r.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analytics alumni */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Alumni per Angkatan" subtitle="Tren jumlah alumni tiap tahun kelulusan">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={angkatanChart}>
              <ChartDefs />
              <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="year" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <YAxis fontSize={11} allowDecimals={false} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#10B981"
                strokeWidth={3}
                fill="url(#gradArea)"
                dot={{ r: 4, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 7, filter: "url(#chartGlow)" }}
                animationDuration={1400}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Top Jurusan Alumni" subtitle="Jurusan terbanyak dari data alumni">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={jurusanChart} layout="vertical" barSize={16}>
              <ChartDefs />
              <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" fontSize={11} allowDecimals={false} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={120} fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--primary) / 0.08)" }} />
              <Bar dataKey="value" fill="url(#gradBlueH)" radius={[0, 10, 10, 0]} filter="url(#chart3d)" animationDuration={1200} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Distribusi Gender Alumni" subtitle="Perbandingan gender alumni terdata">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <ChartDefs />
              <Pie
                data={genderChart}
                dataKey="value"
                cx="50%"
                cy="52%"
                innerRadius={48}
                outerRadius={88}
                paddingAngle={4}
                cornerRadius={8}
                filter="url(#chart3d)"
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                fontSize={11}
                animationDuration={1200}
              >
                {genderChart.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={3} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Universitas Tujuan Alumni" subtitle="Sebaran universitas alumni">
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={universitasChart}>
              <ChartDefs />
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <PolarRadiusAxis fontSize={9} stroke="hsl(var(--muted-foreground))" />
              <Radar
                name="Alumni"
                dataKey="A"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#gradEmerald)"
                fillOpacity={0.55}
                filter="url(#chartGlow)"
                animationDuration={1400}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>


      {/* Dialog daftar pengguna */}
      <Dialog open={!!list} onOpenChange={(o) => !o && setList(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>{list?.title} ({list?.rows.length ?? 0} orang)</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-2">
            <Button size="sm" variant="outline" onClick={() => exportToExcel((list?.rows ?? []).map((u, i) => ({ No: i + 1, Nama: u.name, Status: u.statusLabel, Jenjang: u.education_level, Sekolah: u.school, Jurusan: u.major })), "daftar-pengguna")} disabled={!list?.rows.length}>
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportToPDF((list?.rows ?? []).map((u, i) => ({ No: i + 1, Nama: u.name, Status: u.statusLabel, Jenjang: u.education_level, Sekolah: u.school, Jurusan: u.major })), "daftar-pengguna", list?.title ?? "Daftar Pengguna", { badge: "Laporan Monitoring", reportKind: "Daftar Pengguna", orientation: "portrait" })} disabled={!list?.rows.length}>
              <FileDown className="h-4 w-4 mr-1.5" /> PDF
            </Button>
          </div>
          {list?.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada pengguna.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left"><tr><th className="p-2">Nama</th><th className="p-2">Status</th><th className="p-2">Jenjang</th><th className="p-2">Sekolah</th><th className="p-2">Aksi</th></tr></thead>
              <tbody>
                {list?.rows.map((u) => (
                  <tr key={u.user_id} className="border-t border-border/60">
                    <td className="p-2">{u.name}</td>
                    <td className="p-2"><Badge variant="outline">{u.statusLabel}</Badge></td>
                    <td className="p-2 text-xs">{u.education_level}</td>
                    <td className="p-2 text-xs">{u.school}</td>
                    <td className="p-2"><Button size="sm" variant="ghost" onClick={() => { setList(null); setDetail(u); }}>Detail</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog detail pengguna */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>{detail?.name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                <span>Status: <Badge variant="outline">{detail.statusLabel}</Badge></span>
                <span>Jenjang: <b>{detail.education_level}</b></span>
                <span>Sekolah: <b>{detail.school}</b></span>
                <span>Jurusan: <b>{detail.major}</b></span>
                <span>Universitas: <b>{detail.university}</b></span>
                <span>Telepon: <b>{detail.phone}</b></span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([["Screening", "screening"], ["CBT", "cbt"], ["Psikotes", "psikotes"], ["Konseling", "counseling"]] as const).map(([label, k]) => (
                  <div key={k} className="rounded-xl bg-muted/40 p-2 text-center">
                    <div className="text-[11px] text-muted-foreground">{label}</div>
                    <div className={`font-bold text-sm ${has[k](detail) ? "text-emerald-600" : "text-muted-foreground"}`}>{has[k](detail) ? "SUDAH" : "BELUM"}</div>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-heading font-semibold mb-1">Hasil Screening</h4>
                {detail.screening.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada.</p> : (
                  <ul className="space-y-1 text-xs">
                    {detail.screening.map((a: any) => (
                      <li key={a.id} className="rounded-lg bg-muted/40 p-2">
                        <b>{a.test_title}</b> — Skor {a.total_score} · Kategori: {a.level ?? "-"} <span className="text-muted-foreground">({fmtDateTime(a.completed_at)})</span>
                        {a.conclusion && <div className="text-muted-foreground mt-1">{a.conclusion}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="font-heading font-semibold mb-1">Riwayat Psikotes Lain</h4>
                {detail.psikotes.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada.</p> : (
                  <ul className="space-y-1 text-xs">
                    {detail.psikotes.map((a: any) => (
                      <li key={a.id} className="rounded-lg bg-muted/40 p-2"><b>{a.test_title}</b> — Skor {a.total_score} · {a.level ?? "-"} <span className="text-muted-foreground">({fmtDateTime(a.completed_at)})</span></li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="font-heading font-semibold mb-1">Riwayat CBT</h4>
                {detail.cbt.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada.</p> : (
                  <ul className="space-y-1 text-xs">
                    {detail.cbt.map((a: any) => (
                      <li key={a.id} className="rounded-lg bg-muted/40 p-2"><b>{a.test_title}</b> — {a.total_score}/{a.max_score} ({a.percentage}%) · {a.passed ? "Lulus" : "Belum Lulus"} <span className="text-muted-foreground">({fmtDateTime(a.completed_at)})</span></li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="font-heading font-semibold mb-1">Riwayat Konseling ({detail.counseling.length} sesi)</h4>
                {detail.counseling.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada.</p> : (
                  <ul className="space-y-1 text-xs">
                    {detail.counseling.map((c: any) => (
                      <li key={c.id} className="rounded-lg bg-muted/40 p-2">{c.reason} · Level {c.level} · Status: {c.status} <span className="text-muted-foreground">({fmtDateTime(c.created_at)})</span></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonitoringDashboard;
