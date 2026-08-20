import { useAlumniRealtime } from "@/hooks/useAlumniRealtime";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { encodeId } from "@/lib/publicId";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AlumniEducationManager, { EDU_LEVELS, EDU_UNI_TYPES } from "@/components/shared/AlumniEducationManager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AlumniCsvImport from "@/components/AlumniCsvImport";
import AlumniAddDialog from "@/components/AlumniAddDialog";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { toast } from "sonner";
import {
  alumniStatus, alumniSummary, hasTracer, cleanVal, ALUMNI_NOT_FILLED, ALUMNI_STATUS_ORDER, getStatusLabel,
} from "@/lib/alumniStatus";

import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar as RBar, XAxis, YAxis, CartesianGrid,
  Tooltip, LabelList, AreaChart, Area,
} from "recharts";
import {
  Search, Users, Trash2, FileSpreadsheet, FileDown, SlidersHorizontal, ChevronRight,
  GraduationCap, Briefcase, Building2, MapPin, Globe2, ClipboardCheck, Pencil, X, Calendar,
  TrendingUp, FileJson, Target,
} from "lucide-react";


const DONUT_COLORS = ["#16A34A", "#3B82F6", "#8B5CF6", "#F59E0B", "#F97316", "#EF4444", "#9CA3AF"];

const CardBox = ({ title, subtitle, right, children, className = "" }: any) => (
  <div className={`rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}>
    <div className="flex items-start justify-between gap-2 mb-3">
      <div>
        <h3 className="font-heading text-[14px] font-semibold text-foreground leading-tight">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const StatCard = ({ label, value, note, noteClass = "text-muted-foreground", icon: Icon }: any) => (
  <div className="rounded-xl border border-border bg-card p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-start gap-3">
    <span className="h-10 w-10 rounded-lg bg-accent/70 flex items-center justify-center shrink-0">
      <Icon className="h-[18px] w-[18px] text-primary" strokeWidth={1.8} />
    </span>
    <div className="min-w-0">
      <p className="text-[12px] text-muted-foreground leading-tight">{label}</p>
      <p className="font-heading text-[23px] font-bold text-foreground leading-tight mt-0.5">{value}</p>
      {note && <p className={`text-[11px] mt-0.5 ${noteClass}`}>{note}</p>}
    </div>
  </div>
);

const DonutCard = ({ title, subtitle, data }: { title: string; subtitle: string; data: { name: string; value: number }[] }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <CardBox title={title} subtitle={subtitle}>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="h-[150px] w-[150px] shrink-0">
          {total === 0 ? (
            <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={1} stroke="none">
                  {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <ul className="flex-1 w-full space-y-1.5 min-w-0">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center gap-2 text-[11.5px]">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="text-foreground truncate flex-1">{d.name}</span>
              <span className="text-muted-foreground shrink-0">
                {d.value} ({total ? ((d.value / total) * 100).toFixed(1) : "0.0"}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </CardBox>
  );
};

const HBarCard = ({ title, subtitle, data }: { title: string; subtitle: string; data: { name: string; value: number }[] }) => (
  <CardBox title={title} subtitle={subtitle}>
    <div className="h-[190px]">
      {data.length === 0 ? (
        <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">Belum ada data</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 4, right: 26, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="#F1F5F9" />
            <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <RBar dataKey="value" fill="#16A34A" radius={[0, 3, 3, 0]} barSize={11}>
              <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#16A34A" }} />
            </RBar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  </CardBox>
);


export const EMPTY = "Belum diisi";
const NO_TRACER = ALUMNI_NOT_FILLED;

const val = cleanVal;
const show = (v: any, fallback = EMPTY) => val(v) ?? fallback;

export type AlumniRow = Record<string, any>;

export { hasTracer };

const workStatus = (a: AlumniRow) => alumniStatus(a);
const uniStatus = (a: AlumniRow) => val(a.university_status) ?? (val(a.university) ? "belum diidentifikasi" : EMPTY);


const uniqSorted = (rows: AlumniRow[], key: string) =>
  Array.from(new Set(rows.map((r) => val(r[key])).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

const initials = (n?: string) => (n || "A").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const FIELDS: { key: string; label: string; type?: string }[] = [
  { key: "full_name", label: "Nama Lengkap" },
  { key: "student_id", label: "NIM/ID Santri" },
  { key: "gender", label: "Jenis Kelamin" },
  { key: "graduation_year", label: "Angkatan", type: "number" },
  { key: "origin", label: "Asal" },
  { key: "education_level", label: "Jenjang Pendidikan" },
  { key: "major", label: "Jurusan" },
  { key: "university", label: "Universitas" },
  { key: "university_status", label: "Dalam/Luar Negeri" },
  { key: "status", label: "Status Pekerjaan" },
  { key: "job_field", label: "Bidang Pekerjaan" },
  { key: "company", label: "Perusahaan / Instansi" },
  { key: "position", label: "Jabatan" },
  { key: "work_city", label: "Lokasi Kerja" },
];


/* ---------- summary card (same style as existing admin cards) ---------- */
const MiniCard = ({ label, value, icon: Icon, onClick, active }: any) => (
  <button
    onClick={onClick}
    className={`text-left rounded-2xl border bg-card p-4 shadow-sm transition-all ${
      active ? "border-primary/40 bg-accent/40" : "border-border"
    } ${onClick ? "hover:-translate-y-0.5 hover:shadow-md" : "cursor-default"}`}
  >
    <div className="flex items-center gap-2 mb-1.5">
      <span className="h-8 w-8 rounded-xl bg-accent flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <span className="text-xs text-muted-foreground leading-tight">{label}</span>
    </div>
    <span className="block text-2xl font-heading font-bold text-foreground leading-none">{value}</span>
  </button>
);

const Bar = ({ label, value, total }: { label: string; value: number; total: number }) => {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-foreground truncate pr-2">{label}</span>
        <span className="text-muted-foreground shrink-0">{value} · {pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const AlumniCenter = () => {
  useAlumniRealtime();
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [fAngkatan, setFAngkatan] = useState("all");
  const [fGender, setFGender] = useState("all");
  const [fJenjang, setFJenjang] = useState("all");
  const [fUniversitas, setFUniversitas] = useState("all");
  const [fUniStatus, setFUniStatus] = useState("all");
  const [fKerja, setFKerja] = useState("all");
  const [fEduLevel, setFEduLevel] = useState("all");
  const [fEduType, setFEduType] = useState("all");
  const [fEduKampus, setFEduKampus] = useState("all");
  const [fEduProdi, setFEduProdi] = useState("all");
  const [fEduLulus, setFEduLulus] = useState("all");
  const [onlyNoTracer, setOnlyNoTracer] = useState(false);
  const [detail, setDetail] = useState<AlumniRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: alumni, isLoading } = useQuery({
    queryKey: ["admin-recent-alumni"],
    queryFn: async () =>
      (await supabase.from("alumni").select("*").order("graduation_year", { ascending: false })).data ?? [],
  });

  const { data: eduRows = [] } = useQuery({
    queryKey: ["admin-alumni-education"],
    queryFn: async () => {
      const { data, error } = await supabase.from("alumni_education").select("*");
      if (error) throw error;
      return (data ?? []) as AlumniRow[];
    },
  });

  const eduByAlumni = useMemo(() => {
    const m = new Map<string, AlumniRow[]>();
    eduRows.forEach((e) => {
      if (!e.alumni_id) return;
      m.set(e.alumni_id, [...(m.get(e.alumni_id) ?? []), e]);
    });
    return m;
  }, [eduRows]);

  const eduFilterActive = [fEduLevel, fEduType, fEduKampus, fEduProdi, fEduLulus].some((v) => v !== "all");

  const matchEdu = (a: AlumniRow) => {
    if (!eduFilterActive) return true;
    const list = eduByAlumni.get(a.id) ?? [];
    return list.some((e) => {
      const lvl = String(e.level ?? e.degree ?? "").toLowerCase();
      if (fEduLevel !== "all" && lvl !== fEduLevel) return false;
      if (fEduType !== "all" && String(e.university_type ?? "").toLowerCase() !== fEduType) return false;
      if (fEduKampus !== "all" && (e.university_name ?? "") !== fEduKampus) return false;
      if (fEduProdi !== "all" && (e.major ?? "") !== fEduProdi) return false;
      if (fEduLulus !== "all" && String(e.end_year ?? "") !== fEduLulus) return false;
      return true;
    });
  };

  const rows: AlumniRow[] = alumni ?? [];

  const summary = useMemo(() => alumniSummary(rows), [rows]);

  const stats = useMemo(
    () => ({ 
      total: summary.total, 
      tracer: summary.tracer, 
      noTracer: summary.noTracer, 
      bekerja: summary.bekerja,
      wirausaha: summary.counts['wirausaha'] || 0,
      melanjutkan: summary.counts['melanjutkan_studi'] || 0
    }),

    [summary],
  );

  const statusBreakdown = useMemo(
    () => ALUMNI_STATUS_ORDER.map((name) => ({ 
      name: getStatusLabel(name), 
      value: summary.counts[name as any] || 0 
    })),
    [summary],
  );



  const uniInfo = useMemo(() => {
    const dalam = rows.filter((a) => /dalam/i.test(a.university_status ?? "")).length;
    const luar = rows.filter((a) => /luar/i.test(a.university_status ?? "")).length;
    const m = new Map<string, number>();
    rows.forEach((a) => {
      const u = val(a.university);
      if (u) m.set(u, (m.get(u) ?? 0) + 1);
    });
    const top = Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    return { dalam, luar, top };
  }, [rows]);

  /* ---- dashboard derived data (real data) ---- */
  const topN = (key: string, n = 6) => {
    const m = new Map<string, number>();
    rows.forEach((a) => {
      const v = val(a[key]);
      if (v) m.set(v, (m.get(v) ?? 0) + 1);
    });
    const all = Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (all.length <= n) return all;
    const rest = all.slice(n - 1).reduce((s, d) => s + d.value, 0);
    return [...all.slice(0, n - 1), { name: "Lainnya", value: rest }];
  };

  const dash = useMemo(() => {
    const years = new Map<string, number>();
    rows.forEach((a) => {
      const y = val(a.graduation_year);
      if (y) years.set(y, (years.get(y) ?? 0) + 1);
    });
    return {
      bekerja: summary.bekerja,
      lanjut: summary.lanjut,
      belum: summary.counts['mencari_kerja'] || 0,
      belumMengisi: summary.belumMengisi,
      status: statusBreakdown.filter((d) => d.value > 0),
      jobField: topN("job_field"),
      workCity: topN("work_city"),
      campus: topN("university"),
      companyType: topN("company_type", 4),
      angkatan: Array.from(years, ([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name)),
    };

  }, [rows, summary, statusBreakdown]);


  const pct = (n: number) => (stats.total ? ((n / stats.total) * 100).toFixed(1) : "0.0");

  const recent = useMemo(
    () => [...rows].sort((a, b) => String(b.updated_at ?? b.created_at ?? "").localeCompare(String(a.updated_at ?? a.created_at ?? ""))).slice(0, 5),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((a) => {
      if (onlyNoTracer && hasTracer(a)) return false;
      if (fAngkatan !== "all" && String(a.graduation_year) !== fAngkatan) return false;
      if (fGender !== "all" && val(a.gender) !== fGender) return false;
      if (fJenjang !== "all" && val(a.education_level) !== fJenjang) return false;
      if (fUniversitas !== "all" && val(a.university) !== fUniversitas) return false;
      if (fUniStatus !== "all" && uniStatus(a) !== fUniStatus) return false;
      if (fKerja !== "all" && alumniStatus(a) !== fKerja) return false;
      if (!matchEdu(a)) return false;
      if (!q) return true;
      return [a.full_name, a.name, a.graduation_year, a.origin, a.major, a.university, a.status, a.position, a.company, a.job_field, a.education_level]
        .some((v: any) => String(v ?? "").toLowerCase().includes(q));

    });
  }, [rows, search, onlyNoTracer, fAngkatan, fGender, fJenjang, fUniversitas, fUniStatus, fKerja,
      fEduLevel, fEduType, fEduKampus, fEduProdi, fEduLulus, eduByAlumni]);

  const exportRows = filtered.map((a) => {
    const edu = (eduByAlumni.get(a.id) ?? [])
      .slice()
      .sort((x, y) => (y.end_year ?? y.start_year ?? 0) - (x.end_year ?? x.start_year ?? 0))[0];
    return {
      full_name: show(a.full_name || a.name, ""),
      student_id: show(a.student_id || a.nim, ""),
      gender: show(a.gender, ""),
      graduation_year: a.graduation_year ?? "",
      origin: show(a.origin, ""),
      education_level: show(a.education_level, ""),
      major: show(a.major, ""),
      university: show(a.university, ""),
      university_status: show(a.university_status, ""),
      edu_level: edu?.level ? String(edu.level).toUpperCase() : "",
      edu_university: edu?.university_name ?? "",
      edu_university_type: edu?.university_type ? String(edu.university_type).toUpperCase().replace("_", " ") : "",
      edu_major: edu?.major ?? "",
      edu_end_year: edu?.end_year ?? "",
      edu_status: edu?.status ?? "",
      status: getStatusLabel(alumniStatus(a)),
      job_field: show(a.job_field, ""),
      company: show(a.company, ""),
      position: show(a.position, ""),
      work_city: show(a.work_city, ""),
      created_at: a.created_at ? new Date(a.created_at).toLocaleDateString("id-ID") : "",
    };
  });


  const resetFilters = () => {
    setSearch(""); setFAngkatan("all"); setFGender("all"); setFJenjang("all");
    setFUniversitas("all"); setFUniStatus("all"); setFKerja("all"); setOnlyNoTracer(false);
    setFEduLevel("all"); setFEduType("all"); setFEduKampus("all"); setFEduProdi("all"); setFEduLulus("all");
  };

  const openDetail = (a: AlumniRow) => { setDetail(a); setEditing(false); setForm(a); };

  const saveEdit = async () => {
    if (!detail) return;
    const payload: Record<string, any> = {};
    FIELDS.forEach(({ key, type }) => {
      const v = form[key];
      payload[key] = type === "number" ? (v ? parseInt(String(v), 10) : null) : (val(v) ?? null);
      
      // Sync old columns
      if (key === "full_name") payload.name = payload[key];
      if (key === "student_id") payload.nim = payload[key];
    });

    if (!payload.full_name && !payload.name) return toast.error("Nama wajib diisi");
    if (!payload.graduation_year) return toast.error("Angkatan wajib diisi");

    if (!payload.status) payload.status = detail.status ?? "belum mengisi tracer";
    
    // Sync with production columns
    payload.graduation_status = payload.status;
    payload.employment_status = payload.status;

    const { error } = await supabase.from("alumni").update(payload).eq("id", detail.id);
    if (error) return toast.error(error.message);
    toast.success("Data alumni diperbarui");
    qc.invalidateQueries({ queryKey: ["admin-recent-alumni"] });
    setDetail({ ...detail, ...payload });
    setEditing(false);
  };

  const removeAlumni = async (id: string) => {
    const { error } = await supabase.from("alumni").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Alumni dihapus");
    qc.invalidateQueries({ queryKey: ["admin-recent-alumni"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
    setDetail(null);
  };

  const tracerPct = stats.total ? Math.round((stats.tracer / stats.total) * 100) : 0;

  return (
    <>
      {/* Page header */}
      <div className="mb-3">
        <h1 className="font-heading text-[22px] md:text-[24px] font-bold text-foreground leading-tight">Data Alumni</h1>
        <p className="text-[12.5px] text-muted-foreground mt-1">Kelola dan pantau data alumni serta tracer study secara real-time.</p>
      </div>

      {/* Tabs + filter */}
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border mb-4">
        <div className="flex gap-5 overflow-x-auto">
          {[
            ["dashboard", "Dashboard Alumni"],
            ["daftar", "Daftar Alumni"],
            ["tracer", "Tracer Study"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`whitespace-nowrap pb-2.5 text-[13px] border-b-2 -mb-px transition-colors ${
                tab === k ? "border-primary text-primary font-medium" : "border-transparent text-foreground/70 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={fKerja}
          onChange={(e) => setFKerja(e.target.value)}
          className="mb-2 h-[38px] rounded-lg border border-border bg-card px-3 text-[12px] text-foreground"
          aria-label="Filter alumni"
        >
          <option value="all">Seluruh Alumni</option>
          {ALUMNI_STATUS_ORDER.map((o) => (
            <option key={o} value={o}>{getStatusLabel(o)}</option>

          ))}
        </select>
      </div>

      {/* ============ TAB: DASHBOARD ============ */}
      {tab === "dashboard" && (
        <div className="space-y-3">
          {/* Statistic cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatCard label="Total Alumni" value={stats.total} note={`${rows.length} data terdaftar`} icon={Users} />
            <StatCard label="Alumni Bekerja" value={stats.bekerja} note={`${pct(stats.bekerja)}% dari total alumni`} noteClass="text-primary" icon={Briefcase} />
            <StatCard label="Alumni Melanjutkan" value={stats.melanjutkan} note={`${pct(stats.melanjutkan)}% dari total alumni`} noteClass="text-primary" icon={GraduationCap} />
            <StatCard label="Alumni Belum Bekerja" value={dash.belum} note={`${pct(dash.belum)}% dari total alumni`} icon={Users} />
            <StatCard label="Belum Mengisi Tracer" value={stats.noTracer} note={`${pct(stats.noTracer)}% belum melapor`} icon={Target} />
            <StatCard label="Tingkat Respon Tracer Study" value={`${tracerPct}%`} note={`${stats.tracer} dari ${stats.total} alumni`} noteClass="text-primary" icon={ClipboardCheck} />



          </div>


          {/* Chart row 1 */}
          <div className="grid gap-3 lg:grid-cols-3">
            <DonutCard title="Alumni Berdasarkan Status" subtitle="Perbandingan status alumni saat ini" data={dash.status} />
            <HBarCard title="Alumni Berdasarkan Bidang Pekerjaan" subtitle="Top 6 bidang pekerjaan alumni" data={dash.jobField} />
            <DonutCard title="Alumni Bekerja Dimana" subtitle="Sebaran lokasi kerja alumni" data={dash.workCity} />
          </div>

          {/* Chart row 2 */}
          <div className="grid gap-3 lg:grid-cols-3">
            <HBarCard title="Alumni Berdasarkan Kampus Alma Mater" subtitle="Top 6 kampus asal alumni" data={dash.campus} />
            <CardBox title="Alumni Berdasarkan Angkatan" subtitle="Distribusi alumni per angkatan">
              <div className="h-[190px]">
                {dash.angkatan.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">Belum ada data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dash.angkatan} margin={{ left: -18, right: 8, top: 6, bottom: 4 }}>
                      <defs>
                        <linearGradient id="alumniYear" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#16A34A" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#16A34A" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="value" stroke="#16A34A" strokeWidth={2} fill="url(#alumniYear)" dot={{ r: 3, fill: "#16A34A" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardBox>
            <HBarCard title="Jenis Perusahaan / Instansi" subtitle="Tempat kerja alumni berdasarkan jenis instansi" data={dash.companyType} />
          </div>

          {/* Bottom grid */}
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <CardBox
                title="Data Alumni Terbaru"
                right={
                  <Button size="sm" variant="outline" className="h-7 rounded-md text-[11px]" onClick={() => setTab("daftar")}>
                    Lihat Semua
                  </Button>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-[11.5px]">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        {["Nama", "Angkatan", "Status", "Pekerjaan / Kampus", "Lokasi", "Diperbarui"].map((h) => (
                          <th key={h} className="font-medium py-2 pr-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recent.length === 0 ? (
                        <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Belum ada data alumni.</td></tr>
                      ) : recent.map((a) => {
                        const st = workStatus(a);
                        const tone = /belum bekerja/i.test(st)
                          ? "bg-destructive/10 text-destructive"
                          : /studi|lanjut/i.test(st) ? "bg-blue-500/10 text-blue-600" : /kerja|wirausaha/i.test(st) ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";
                        return (
                          <tr key={a.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => openDetail(a)}>
                            <td className="py-2 pr-3 text-foreground whitespace-nowrap">{show(a.name, "-")}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{a.graduation_year ?? "-"}</td>
                            <td className="py-2 pr-3"><span className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] ${tone}`}>{st}</span></td>
                            <td className="py-2 pr-3 text-muted-foreground truncate max-w-[180px]">
                              {[val(a.position), val(a.company) ?? val(a.university)].filter(Boolean).join(" - ") || "-"}
                            </td>
                            <td className="py-2 pr-3 text-muted-foreground">{show(a.work_city, "-")}</td>
                            <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                              {a.updated_at || a.created_at ? new Date(a.updated_at ?? a.created_at).toLocaleDateString("id-ID") : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardBox>
            </div>

            <div className="lg:col-span-2">
              <CardBox title="Respon Tracer Study">
                <ul className="text-[11.5px]">
                  {[
                    ["Total Alumni", stats.total],
                    ["Sudah Mengisi", stats.tracer],
                    ["Belum Mengisi", stats.noTracer],
                    ["Tingkat Respon", `${tracerPct}%`],
                  ].map(([k, v]) => (
                    <li key={k as string} className="flex items-center justify-between py-1.5">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-semibold text-foreground">{v as any}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border mt-2 pt-2 text-center">
                  <button className="text-[11.5px] text-primary font-medium" onClick={() => setTab("tracer")}>Lihat Detail</button>
                </div>
              </CardBox>
            </div>

            <div className="lg:col-span-3">
              <CardBox title="Export Data Alumni" subtitle="Ekspor data tracer study alumni untuk analisis lebih lanjut.">
                <div className="space-y-2">
                  <button
                    onClick={() => exportToExcel(exportRows, "alumni-peduli")}
                    className="w-full h-8 rounded-md bg-primary text-primary-foreground text-[12px] font-medium flex items-center justify-center gap-1.5"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
                  </button>
                  <button
                    onClick={() => exportToPDF(exportRows, "alumni-peduli", "Data Alumni PEDULI")}
                    className="w-full h-8 rounded-md bg-destructive text-destructive-foreground text-[12px] font-medium flex items-center justify-center gap-1.5"
                  >
                    <FileDown className="h-3.5 w-3.5" /> Export PDF
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(exportRows, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = "alumni-peduli.json"; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full h-8 rounded-md bg-[#8B5CF6] text-white text-[12px] font-medium flex items-center justify-center gap-1.5"
                  >
                    <FileJson className="h-3.5 w-3.5" /> Export JSON
                  </button>
                </div>
              </CardBox>
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB: DAFTAR ALUMNI ============ */}
      {tab === "daftar" && (<>


      {/* Search + filter */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, asal, universitas, jurusan, pekerjaan..."
            className="pl-10 h-11 rounded-2xl bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl shrink-0" aria-label="Filter" onClick={() => setShowFilters((s) => !s)}>
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
          {[
            { v: fAngkatan, set: setFAngkatan, ph: "Angkatan", opts: Array.from(new Set(rows.map((r) => String(r.graduation_year)).filter((x) => x && x !== "null"))).sort((a, b) => b.localeCompare(a)) },
            { v: fGender, set: setFGender, ph: "Jenis Kelamin", opts: uniqSorted(rows, "gender") },
            { v: fJenjang, set: setFJenjang, ph: "Jenjang", opts: uniqSorted(rows, "education_level") },
            { v: fUniversitas, set: setFUniversitas, ph: "Universitas", opts: uniqSorted(rows, "university") },
            { v: fUniStatus, set: setFUniStatus, ph: "Dalam/Luar Negeri", opts: Array.from(new Set(rows.map(uniStatus))).sort() },
            { v: fKerja, set: setFKerja, ph: "Status Pekerjaan", opts: Array.from(new Set(rows.map(workStatus))).sort() },
            { v: fEduLevel, set: setFEduLevel, ph: "Jenjang Kuliah", opts: EDU_LEVELS.map((o) => o.value), labels: EDU_LEVELS },
            { v: fEduType, set: setFEduType, ph: "PTN/PTS", opts: EDU_UNI_TYPES.map((o) => o.value), labels: EDU_UNI_TYPES },
            { v: fEduKampus, set: setFEduKampus, ph: "Kampus (Pendidikan)", opts: Array.from(new Set(eduRows.map((e) => e.university_name).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)) },
            { v: fEduProdi, set: setFEduProdi, ph: "Program Studi", opts: Array.from(new Set(eduRows.map((e) => e.major).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)) },
            { v: fEduLulus, set: setFEduLulus, ph: "Tahun Lulus Kuliah", opts: Array.from(new Set(eduRows.map((e) => (e.end_year ? String(e.end_year) : "")).filter(Boolean))).sort((a, b) => b.localeCompare(a)) },
          ].map((f: any) => (
            <Select key={f.ph} value={f.v} onValueChange={f.set}>
              <SelectTrigger className="h-9 rounded-xl bg-card text-xs"><SelectValue placeholder={f.ph} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua {f.ph}</SelectItem>
                {f.opts.map((o: string) => (
                  <SelectItem key={o} value={o}>
                    {f.labels ? f.labels.find((l: any) => l.value === o)?.label ?? o : o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap mb-2">
        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => exportToExcel(exportRows, "alumni-peduli")} disabled={!exportRows.length}>
          <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => exportToPDF(exportRows, "alumni-peduli", "Data Alumni PEDULI")} disabled={!exportRows.length}>
          <FileDown className="h-4 w-4 mr-1.5" /> PDF
        </Button>
        <AlumniAddDialog />
        <AlumniCsvImport />
        {(onlyNoTracer || search || [fAngkatan, fGender, fJenjang, fUniversitas, fUniStatus, fKerja, fEduLevel, fEduType, fEduKampus, fEduProdi, fEduLulus].some((v) => v !== "all")) && (
          <Button size="sm" variant="ghost" className="rounded-xl" onClick={resetFilters}>
            <X className="h-4 w-4 mr-1.5" /> Reset filter
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground mb-2">
        Menampilkan {filtered.length} dari {rows.length} alumni terdaftar
        {onlyNoTracer && " · hanya yang belum mengisi tracer"}
      </div>

      {/* List */}
      <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-0.5">
        {isLoading ? (
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
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Belum ada data alumni.</p>
          </div>
        ) : (
          filtered.map((a) => (
            <div
              key={a.id}
              onClick={() => openDetail(a)}
              className="rounded-2xl bg-card border border-border shadow-sm p-4 flex items-start gap-3 transition-colors hover:bg-accent/30 cursor-pointer active:scale-[0.99]"
            >
              <GenderAvatar gender={a.gender} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-heading font-semibold text-foreground text-sm">{show(a.full_name || a.name, "(Tanpa Nama)")}</h4>
                  {val(a.gender) && <Badge variant="outline" className="text-[10px] rounded-full">{a.gender}</Badge>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="text-[10px] rounded-full">Alumni</Badge>
                  {a.created_at && <Badge variant="outline" className="text-[10px] rounded-full">Daftar: {new Date(a.created_at).toLocaleDateString("id-ID")}</Badge>}
                  {!hasTracer(a) && <Badge variant="outline" className="text-[10px] rounded-full text-destructive border-destructive/30">belum mengisi tracer</Badge>}
                </div>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Angkatan {a.graduation_year ?? EMPTY}</span>
                  {val(a.origin) && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {a.origin}</span>}
                  <span className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> {show(a.education_level)}{val(a.major) ? ` · ${a.major}` : ""}</span>
                  {val(a.university) && <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {a.university}</span>}
                  <span className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> {uniStatus(a)}</span>
                  <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> {getStatusLabel(alumniStatus(a))}{val(a.company) ? ` — ${a.company}` : ""}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </div>
          ))
        )}
      </div>
      </>)}

      {/* ============ TAB: TRACER STUDY ============ */}
      {tab === "tracer" && (
        <div className="grid gap-3 lg:grid-cols-3">
          <CardBox title="Progress Tracer Study" subtitle={`${stats.tracer} dari ${stats.total} alumni sudah mengisi`} className="lg:col-span-2">
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
              <div className="h-full rounded-full bg-primary" style={{ width: `${tracerPct}%` }} />
            </div>
            <div className="space-y-2.5">
              <Bar label="Sudah mengisi" value={stats.tracer} total={stats.total || 1} />
              <Bar label="Belum mengisi" value={stats.noTracer} total={stats.total || 1} />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 h-8 rounded-md text-[12px]"
              onClick={() => { resetFilters(); setOnlyNoTracer(true); setTab("daftar"); }}
            >
              Lihat alumni yang belum mengisi
            </Button>
          </CardBox>
          <CardBox title="Respon Tracer Study" subtitle="Ringkasan pengisian">
            <ul className="text-[12px] divide-y divide-border">
              {[
                ["Total Alumni", stats.total],
                ["Sudah Mengisi", stats.tracer],
                ["Belum Mengisi", stats.noTracer],
                ["Tingkat Respon", `${tracerPct}%`],
              ].map(([k, v]) => (
                <li key={k as string} className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-semibold text-foreground">{v as any}</span>
                </li>
              ))}
            </ul>
          </CardBox>
        </div>
      )}



      {/* Detail — popup card di tengah layar */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setEditing(false); } }}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">{show(detail?.full_name || detail?.name, "Detail Alumni")}</DialogTitle>
            <DialogDescription className="text-xs">
              Profil, pekerjaan, pendidikan, dan status tracer study alumni.
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="mt-4 space-y-5">
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button size="sm" className="rounded-xl" onClick={saveEdit}>Simpan</Button>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setEditing(false); setForm(detail); }}>Batal</Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setEditing(true)}>
                      <Pencil className="h-4 w-4 mr-1.5" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4 mr-1.5" /> Hapus
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus alumni ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Data alumni <strong>{show(detail.full_name || detail.name, "-")}</strong> akan dihapus permanen dan tidak dapat dikembalikan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeAlumni(detail.id)}>Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button asChild size="sm" variant="outline" className="rounded-xl">
                      <Link to={`/alumni/${encodeId(detail.id)}`}>
                        <ExternalLink className="h-4 w-4 mr-1.5" /> Halaman Detail
                      </Link>
                    </Button>
                  </>
                )}
              </div>

              {editing ? (
                <div className="grid gap-3">
                  {FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs">{f.label}</Label>
                      <Input
                        type={f.type ?? "text"}
                        className="rounded-xl"
                        value={form[f.key] ?? ""}
                        onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Profil</h4>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {[
                        ["Nama", show(detail.full_name || detail.name)],
                        ["Jenis Kelamin", show(detail.gender)],
                        ["Angkatan", detail.graduation_year ?? EMPTY],
                        ["Asal", show(detail.origin)],
                        ["Jenjang Pendidikan", show(detail.education_level)],
                        ["Jurusan", show(detail.major)],
                        ["Universitas", show(detail.university)],
                        ["Status Universitas", uniStatus(detail)],
                      ].map(([k, v]) => (
                        <div key={k as string}>
                          <dt className="text-[11px] text-muted-foreground">{k}</dt>
                          <dd className="text-foreground">{v as any}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pekerjaan</h4>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {[
                        ["Status Pekerjaan", getStatusLabel(alumniStatus(detail))],
                        ["Bidang Pekerjaan", show(detail.job_field)],
                        ["Perusahaan / Instansi", show(detail.company)],
                        ["Jabatan", show(detail.position)],
                        ["Lokasi Pekerjaan", [val(detail.work_city), val(detail.work_province), val(detail.work_country)].filter(Boolean).join(", ") || show(detail.location)],
                      ].map(([k, v]) => (
                        <div key={k as string}>
                          <dt className="text-[11px] text-muted-foreground">{k}</dt>
                          <dd className="text-foreground">{v as any}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tracer Study</h4>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <dt className="text-[11px] text-muted-foreground">Status Pengisian</dt>
                        <dd className="text-foreground">{hasTracer(detail) ? "Sudah mengisi" : "Belum mengisi tracer"}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted-foreground">Tanggal Pengisian</dt>
                        <dd className="text-foreground">{detail.tracer_filled_at ? new Date(detail.tracer_filled_at).toLocaleString("id-ID") : EMPTY}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted-foreground">Pendidikan Lanjutan</dt>
                        <dd className="text-foreground">{show(detail.further_education)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted-foreground">Target Universitas</dt>
                        <dd className="text-foreground">{show(detail.target_university)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted-foreground">Fakultas</dt>
                        <dd className="text-foreground">{show(detail.faculty)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted-foreground">Jenis Instansi</dt>
                        <dd className="text-foreground">{show(detail.company_type)}</dd>
                      </div>
                    </dl>
                  </section>

                  <AlumniEducationManager alumniId={detail.id} canEdit title="Riwayat Pendidikan Alumni" />
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AlumniCenter;
