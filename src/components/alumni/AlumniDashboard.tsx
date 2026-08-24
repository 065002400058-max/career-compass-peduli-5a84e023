import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Briefcase,
  Building2,
  BarChart3,
  Target,
  PencilLine,
  RefreshCw,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GraduateStatusCard from "@/components/shared/GraduateStatusCard";
import { useAuth } from "@/contexts/AuthContext";
import {
  alumniStatus,
  alumniSummary,
  cleanVal,
  hasTracer,
  ALUMNI_NOT_FILLED,
} from "@/lib/alumniStatus";

/* ---------- helpers ---------- */

const fmtNum = (n: number) => n.toLocaleString("id-ID");
const pct = (v: number, total: number) => (total ? ((v / total) * 100).toFixed(1) : "0.0");
const fmtDateTime = (v?: string | null) =>
  v
    ? `${new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}, ${new Date(
        v,
      ).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`
    : "-";
const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";
const fmtTime = (v?: string | null) =>
  v ? new Date(v).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";

const Card = ({ className = "", children }: { className?: string; children: React.ReactNode }) => (
  <div
    className={`rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}
  >
    {children}
  </div>
);

type Tone = "green" | "purple" | "blue" | "amber";
const toneIcon: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-600",
  purple: "bg-violet-50 text-violet-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-orange-50 text-orange-500",
};

const StatCard = ({
  icon: Icon,
  tone,
  label,
  value,
  note,
  to,
}: {
  icon: typeof Users;
  tone: Tone;
  label: string;
  value: string;
  note: string;
  to: string;
}) => (
  <Card className="p-4 flex flex-col">
    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${toneIcon[tone]}`}>
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
    </span>
    <p className="mt-3 text-[12px] text-muted-foreground">{label}</p>
    <p className="text-[24px] font-bold leading-tight text-foreground">{value}</p>
    <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p>
    <Link
      to={to}
      className="mt-3 inline-flex items-center justify-center gap-1 rounded-md bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
    >
      Lihat Detail <ArrowRight className="h-3 w-3" />
    </Link>
  </Card>
);

const topN = (rows: any[], key: string, n = 6) => {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const v = cleanVal(r?.[key]);
    if (v) map.set(v, (map.get(v) ?? 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, value]) => ({ name, value }));
};

const STATUS_COLORS: Record<string, string> = {
  bekerja: "#059669",
  "melanjutkan studi": "#3b82f6",
  "mencari kerja": "#f59e0b",
  wirausaha: "#f43f5e",
  [ALUMNI_NOT_FILLED]: "#cbd5e1",
};

/* ---------- component ---------- */

const AlumniDashboard = () => {
  const { user } = useAuth();
  const uid = user?.id;
  const [tab, setTab] = useState<"lokasi" | "instansi" | "negeri">("lokasi");

  const { data: rows = [], dataUpdatedAt } = useQuery({
    queryKey: ["alumni-dashboard-agg"],
    queryFn: async () => fetchAllRows(() => supabase.rpc("alumni_directory")),
  });

  const { data: profile } = useQuery({
    queryKey: ["me-profile", uid],
    enabled: !!uid,
    queryFn: async () =>
      (await supabase.from("profiles").select("*").eq("id", uid!).maybeSingle()).data,
  });

  const { data: myAlumni } = useQuery({
    queryKey: ["me-alumni", uid],
    enabled: !!uid,
    queryFn: async () =>
      (await supabase.from("alumni").select("*").eq("user_id", uid!).maybeSingle()).data,
  });

  const s = useMemo(() => alumniSummary(rows), [rows]);

  const byYear = useMemo(() => {
    const map = new Map<number, number>();
    rows.forEach((r: any) => {
      if (r.graduation_year) map.set(r.graduation_year, (map.get(r.graduation_year) ?? 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(-6)
      .map(([name, value]) => ({ name: String(name), value }));
  }, [rows]);

  const statusData = useMemo(
    () => s.chart.map((d) => ({ ...d, color: STATUS_COLORS[d.name] ?? "#94a3b8" })),
    [s],
  );

  const jobFields = useMemo(() => {
    const src = topN(rows, "job_field", 6);
    return src.length ? src : topN(rows, "position", 6);
  }, [rows]);
  const jobTotal = jobFields.reduce((a, b) => a + b.value, 0);

  const locations = useMemo(() => {
    const src = topN(rows, "work_province", 5);
    return src.length ? src : topN(rows, "origin" as any, 5);
  }, [rows]);
  const instansi = useMemo(() => topN(rows, "company", 5), [rows]);
  const negeri = useMemo(() => {
    const dalam = rows.filter((r: any) => /dalam/i.test(r.university_status ?? "")).length;
    const luar = rows.filter((r: any) => /luar/i.test(r.university_status ?? "")).length;
    const na = rows.length - dalam - luar;
    return [
      { name: "Dalam Negeri", value: dalam },
      { name: "Luar Negeri", value: luar },
      { name: "Belum diisi", value: na },
    ].filter((d) => d.value > 0);
  }, [rows]);

  const activities = useMemo(
    () =>
      rows
        .filter((r: any) => hasTracer(r))
        .slice(0, 5)
        .map((r: any) => ({
          name: r.name as string,
          action: r.tracer_filled_at ? "Mengisi Tracer Study" : "Memperbarui informasi pekerjaan",
          at: (r.tracer_filled_at ?? r.updated_at) as string,
        })),
    [rows],
  );

  const meFilled = myAlumni ? hasTracer(myAlumni) : false;
  const meName = profile?.full_name || user?.user_metadata?.full_name || "Alumni";
  const listTabs = [
    { id: "lokasi", label: "Lokasi" },
    { id: "instansi", label: "Instansi" },
    { id: "negeri", label: "Dalam Negeri / Luar Negeri" },
  ] as const;
  const activeList = tab === "lokasi" ? locations : tab === "instansi" ? instansi : negeri;
  const activeHead = tab === "lokasi" ? "Lokasi" : tab === "instansi" ? "Instansi" : "Kategori";

  return (
    <div className="min-h-screen bg-[#FAFBFA]">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 md:px-8 md:py-6">
        {/* header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[22px] font-bold leading-tight text-foreground md:text-[26px]">
              Dashboard Alumni
            </h1>
            <p className="mt-1 text-[12px] text-muted-foreground md:text-[13px]">
              Pantau perjalanan kariermu dan terhubung dengan sesama alumni.
            </p>
          </div>
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground md:text-right">
            <RefreshCw className="mt-0.5 h-4 w-4 text-emerald-600" />
            <span>
              Data terakhir diperbarui:
              <br className="hidden md:block" /> {fmtDateTime(new Date(dataUpdatedAt || Date.now()).toISOString())}
            </span>
          </div>
        </div>

        {/* stat cards */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={Users} tone="green" label="Total Alumni" value={fmtNum(s.total)} note="Terdaftar di Tracer Alumni" to="/alumni" />
          <StatCard icon={Briefcase} tone="purple" label="Alumni Bekerja" value={fmtNum(s.bekerja)} note={`${pct(s.bekerja, s.total)}% dari total alumni`} to="/alumni" />
          <StatCard icon={Building2} tone="blue" label="Alumni Lanjut Studi" value={fmtNum(s.lanjut)} note={`${pct(s.lanjut, s.total)}% dari total alumni`} to="/alumni" />
          <StatCard icon={BarChart3} tone="amber" label="Alumni Mencari Kerja" value={fmtNum(s.belum)} note={`${pct(s.belum, s.total)}% dari total alumni`} to="/alumni" />
          <StatCard icon={Target} tone="green" label="Partisipasi Tracer Study" value={`${s.tracerRate}%`} note={`${fmtNum(s.tracer)} dari ${fmtNum(s.total)} alumni`} to="/tracer" />
          <Card className="flex flex-col p-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <PencilLine className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <p className="mt-3 text-[13px] font-semibold text-foreground">Perbarui Informasi</p>
            <p className="mt-1 flex-1 text-[11px] leading-relaxed text-muted-foreground">
              Pastikan data dirimu selalu terbaru untuk manfaat terbaik.
            </p>
            <Link
              to="/tracer"
              className="mt-3 inline-flex items-center justify-center gap-1 rounded-md bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
            >
              Update Pekerjaan
            </Link>
          </Card>
        </div>

        {/* main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {/* statistik alumni */}
            <Card className="p-4 md:p-5">
              <h2 className="text-[15px] font-semibold text-foreground">Statistik Alumni</h2>
              <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:divide-x lg:divide-border">
                <div className="lg:pr-5">
                  <p className="text-[13px] font-medium text-foreground">Alumni per Angkatan</p>
                  <div className="mt-3 h-[190px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byYear} margin={{ top: 16, right: 4, left: -18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={34}>
                          <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: "#334155" }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:px-5">
                  <p className="text-[13px] font-medium text-foreground">Alumni Berdasarkan Status</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative h-[150px] w-[150px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
                            {statusData.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[17px] font-bold text-foreground">{fmtNum(s.total)}</span>
                        <span className="text-[10px] text-muted-foreground">Total</span>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {statusData.map((d) => (
                        <li key={d.name} className="flex items-center gap-2 text-[11px]">
                          <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                          <span className="text-muted-foreground">{d.name}</span>
                          <span className="ml-auto font-medium text-foreground">
                            {pct(d.value, s.total)}% ({fmtNum(d.value)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="lg:pl-5">
                  <p className="text-[13px] font-medium text-foreground">Alumni per Bidang Pekerjaan</p>
                  <div className="mt-3 space-y-2.5">
                    {jobFields.length === 0 && (
                      <p className="text-[11px] text-muted-foreground">Belum ada data bidang pekerjaan.</p>
                    )}
                    {jobFields.map((f) => (
                      <div key={f.name} className="flex items-center gap-2">
                        <span className="w-[38%] truncate text-[11px] text-muted-foreground">{f.name}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-emerald-600"
                            style={{ width: `${jobTotal ? (f.value / jobTotal) * 100 : 0}%` }}
                          />
                        </span>
                        <span className="w-11 text-right text-[11px] font-medium text-foreground">
                          {pct(f.value, jobTotal)}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/alumni"
                    className="mt-4 flex items-center justify-center rounded-md bg-emerald-50 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    Lihat Selengkapnya
                  </Link>
                </div>
              </div>
            </Card>

            {/* bottom trio */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* sebaran */}
              <Card className="flex flex-col p-4">
                <h3 className="text-[14px] font-semibold text-foreground">Sebaran Alumni</h3>
                <div className="mt-2 flex gap-3 border-b border-border">
                  {listTabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`-mb-px border-b-2 pb-1.5 text-[11px] transition-colors ${
                        tab === t.id
                          ? "border-emerald-600 font-medium text-emerald-700"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex-1 overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="pb-2 text-left font-normal">{activeHead}</th>
                        <th className="pb-2 text-right font-normal">Jumlah Alumni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeList.length === 0 && (
                        <tr>
                          <td colSpan={2} className="py-3 text-center text-muted-foreground">
                            Belum ada data.
                          </td>
                        </tr>
                      )}
                      {activeList.map((d) => (
                        <tr key={d.name} className="border-t border-border/60">
                          <td className="py-2 pr-2 text-foreground">{d.name}</td>
                          <td className="py-2 text-right font-medium text-foreground">
                            {fmtNum(d.value)} ({pct(d.value, s.total)}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Link to="/alumni" className="mt-3 flex items-center justify-center gap-1 rounded-md bg-emerald-50 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                  Lihat Selengkapnya <ArrowRight className="h-3 w-3" />
                </Link>
              </Card>

              {/* instansi teratas */}
              <Card className="flex flex-col p-4">
                <h3 className="text-[14px] font-semibold text-foreground">Alumni di Instansi Teratas</h3>
                <div className="mt-3 flex-1">
                  <div className="flex justify-between pb-2 text-[11px] text-muted-foreground">
                    <span>Instansi</span>
                    <span>Jumlah Alumni</span>
                  </div>
                  {instansi.length === 0 && (
                    <p className="py-3 text-center text-[11px] text-muted-foreground">Belum ada data instansi.</p>
                  )}
                  {instansi.map((i) => (
                    <div key={i.name} className="flex items-center gap-2 border-t border-border/60 py-2">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1 truncate text-[11px] text-foreground">{i.name}</span>
                      <span className="text-[11px] font-medium text-foreground">{fmtNum(i.value)}</span>
                    </div>
                  ))}
                </div>
                <Link to="/alumni" className="mt-3 flex items-center justify-center gap-1 rounded-md bg-emerald-50 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                  Lihat Selengkapnya <ArrowRight className="h-3 w-3" />
                </Link>
              </Card>

              {/* aktivitas */}
              <Card className="flex flex-col p-4">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-emerald-600" /> Aktivitas Terbaru
                </h3>
                <div className="mt-3 flex-1">
                  {activities.length === 0 && (
                    <p className="py-3 text-center text-[11px] text-muted-foreground">Belum ada aktivitas.</p>
                  )}
                  {activities.map((a, idx) => (
                    <div key={idx} className="flex items-start gap-2 border-b border-border/60 py-2.5 last:border-0">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                        {a.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-medium text-foreground">{a.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{a.action}</p>
                      </div>
                      <div className="text-right text-[10px] text-muted-foreground">
                        <p>{fmtDate(a.at)}</p>
                        <p>{fmtTime(a.at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/tracer" className="mt-3 flex items-center justify-center rounded-md bg-emerald-50 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                  Lihat Semua Aktivitas
                </Link>
              </Card>
            </div>
          </div>

          {/* right column */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="text-[14px] font-semibold text-foreground">Profil Saya</h3>
              <div className="mt-3 flex flex-col items-center text-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={meName} className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[18px] font-semibold text-emerald-700">
                    {meName.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <p className="mt-2 text-[14px] font-semibold text-foreground">{meName}</p>
                <p className="text-[11px] text-muted-foreground">
                  Angkatan {myAlumni?.graduation_year ?? profile?.graduation_year ?? "-"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {[cleanVal(profile?.education_level), cleanVal(profile?.major)].filter(Boolean).join(" ") || "-"}
                  {cleanVal(profile?.university) ? ` - ${profile?.university}` : ""}
                </p>
              </div>
              <Link to="/profil" className="mt-3 flex items-center justify-center rounded-md bg-emerald-50 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                Lihat Profil Lengkap
              </Link>
            </Card>

            <Card className="p-4">
              <h3 className="text-[14px] font-semibold text-foreground">Tracer Study Saya</h3>
              <div className="mt-3 flex items-start gap-2">
                {meFilled ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 text-orange-500" />
                )}
                <div>
                  <p className="text-[12.5px] font-medium text-foreground">
                    {meFilled ? "Sudah Mengisi" : "Belum Mengisi"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {meFilled
                      ? `Terakhir diisi: ${fmtDate(myAlumni?.tracer_filled_at ?? myAlumni?.updated_at)}`
                      : "Lengkapi data kariermu agar statistik alumni akurat."}
                  </p>
                </div>
              </div>
              <Link to="/tracer" className="mt-3 flex items-center justify-center rounded-md bg-emerald-50 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                {meFilled ? "Lihat Riwayat Tracer Study" : "Isi Tracer Study"}
              </Link>
            </Card>

            <GraduateStatusCard />


            <Card className="p-4">
              <h3 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                <GraduationCap className="h-4 w-4 text-emerald-600" /> Jejaring Alumni
              </h3>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Jelajahi {fmtNum(s.total)} alumni dan temukan koneksi baru.
              </p>
              <Link to="/alumni" className="mt-3 flex items-center justify-center gap-1 rounded-md bg-emerald-50 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                Jelajahi Alumni <ArrowRight className="h-3 w-3" />
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlumniDashboard;
