import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AlumniCsvImport from "@/components/AlumniCsvImport";
import AlumniAddDialog from "@/components/AlumniAddDialog";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { toast } from "sonner";
import {
  Search, Users, Trash2, AlertTriangle, FileSpreadsheet, FileDown, Columns3, X,
  GraduationCap, Briefcase, Building2, UserCircle, Globe2, Home, TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, LabelList,
} from "recharts";

/* ---------- constants & helpers ---------- */

export const EMPTY = "Belum diisi";
const NO_TRACER = "Belum mengisi";

const COLORS = ["hsl(160 84% 39%)", "hsl(217 91% 60%)", "hsl(258 90% 66%)", "hsl(43 96% 56%)", "hsl(25 95% 53%)", "hsl(0 84% 60%)", "hsl(215 16% 65%)"];

const val = (v: any) => (v === null || v === undefined || String(v).trim() === "" || String(v).trim() === "-" ? null : String(v).trim());
const show = (v: any, fallback = EMPTY) => val(v) ?? fallback;

export type AlumniRow = Record<string, any>;

export const hasTracer = (a: AlumniRow) =>
  !!a.tracer_filled_at || !!(val(a.position) || val(a.company) || val(a.job_field) || val(a.further_education) || val(a.work_city));

const workStatus = (a: AlumniRow) => (hasTracer(a) ? show(a.status, EMPTY) : NO_TRACER);
const uniStatus = (a: AlumniRow) => val(a.university_status) ?? (val(a.university) ? "Belum diidentifikasi" : EMPTY);

const countBy = (rows: AlumniRow[], fn: (a: AlumniRow) => string) => {
  const m = new Map<string, number>();
  rows.forEach((r) => {
    const k = fn(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  });
  return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

const uniqSorted = (rows: AlumniRow[], key: string) =>
  Array.from(new Set(rows.map((r) => val(r[key])).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

/* ---------- small UI pieces ---------- */

const Kpi = ({ label, value, sub, icon: Icon, onClick, tone = "emerald" }: any) => (
  <button
    onClick={onClick}
    className={`text-left rounded-2xl border border-border bg-card p-4 shadow-sm transition-all ${onClick ? "hover:-translate-y-0.5 hover:shadow-md cursor-pointer" : "cursor-default"}`}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {Icon && <Icon className={`h-4 w-4 ${tone === "emerald" ? "text-primary" : "text-muted-foreground"}`} />}
    </div>
    <p className="font-heading text-2xl font-bold text-foreground leading-none">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>}
  </button>
);

const ChartCard = ({ title, desc, children, className = "" }: any) => (
  <div className={`rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm ${className}`}>
    <h3 className="font-heading font-semibold text-sm text-foreground">{title}</h3>
    {desc && <p className="text-[11px] text-muted-foreground mb-3">{desc}</p>}
    <div className="mt-2">{children}</div>
  </div>
);

const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))",
    fontSize: 12,
  },
};

const Donut = ({ data, onSlice }: { data: { name: string; value: number }[]; onSlice?: (n: string) => void }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <ResponsiveContainer width="100%" height={180} className="max-w-[180px]">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2} onClick={(d: any) => onSlice?.(d?.name)}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} className={onSlice ? "cursor-pointer" : ""} />)}
          </Pie>
          <Tooltip {...tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 w-full space-y-1.5">
        {data.map((d, i) => (
          <li key={d.name}>
            <button
              onClick={() => onSlice?.(d.name)}
              className="w-full flex items-center gap-2 text-xs hover:bg-accent/40 rounded-lg px-1.5 py-1 transition-colors"
            >
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="truncate text-muted-foreground flex-1 text-left">{d.name}</span>
              <span className="font-medium text-foreground">{d.value}</span>
              <span className="text-muted-foreground w-12 text-right">{((d.value / total) * 100).toFixed(1)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const HBar = ({ data, onBar, height = 240 }: any) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
      <XAxis type="number" tick={{ fontSize: 11 }} />
      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
      <Tooltip {...tooltipStyle} cursor={{ fill: "hsl(var(--accent) / 0.4)" }} />
      <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="hsl(160 84% 39%)" onClick={(d: any) => onBar?.(d?.name)} className={onBar ? "cursor-pointer" : ""}>
        <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

/* ---------- columns ---------- */

const COLUMNS: { key: string; label: string; render: (a: AlumniRow) => any; default: boolean }[] = [
  { key: "name", label: "Nama", render: (a) => a.name, default: true },
  { key: "gender", label: "Jenis Kelamin", render: (a) => show(a.gender), default: true },
  { key: "graduation_year", label: "Angkatan", render: (a) => show(a.graduation_year), default: true },
  { key: "year_graduated", label: "Tahun Lulus", render: (a) => show(a.year_graduated), default: false },
  { key: "origin", label: "Asal", render: (a) => show(a.origin), default: true },
  { key: "education_level", label: "Jenjang", render: (a) => show(a.education_level), default: true },
  { key: "major", label: "Jurusan", render: (a) => show(a.major), default: true },
  { key: "faculty", label: "Fakultas", render: (a) => show(a.faculty), default: false },
  { key: "university", label: "Universitas", render: (a) => show(a.university), default: true },
  { key: "university_status", label: "Dalam/Luar Negeri", render: (a) => uniStatus(a), default: true },
  { key: "status", label: "Status Pekerjaan", render: (a) => workStatus(a), default: true },
  { key: "job_field", label: "Bidang Pekerjaan", render: (a) => show(a.job_field, hasTracer(a) ? EMPTY : NO_TRACER), default: true },
  { key: "company", label: "Perusahaan / Instansi", render: (a) => show(a.company, hasTracer(a) ? EMPTY : NO_TRACER), default: false },
  { key: "company_type", label: "Jenis Instansi", render: (a) => show(a.company_type, hasTracer(a) ? EMPTY : NO_TRACER), default: false },
  { key: "position", label: "Jabatan", render: (a) => show(a.position, hasTracer(a) ? EMPTY : NO_TRACER), default: false },
  { key: "work_place", label: "Tempat Kerja", render: (a) => show(a.work_city ?? a.location, hasTracer(a) ? EMPTY : NO_TRACER), default: true },
];

/* ---------- main ---------- */

const AlumniCenter = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<AlumniRow | null>(null);
  const [visible, setVisible] = useState<string[]>(COLUMNS.filter((c) => c.default).map((c) => c.key));

  const { data: alumni = [], isLoading } = useQuery({
    queryKey: ["admin-recent-alumni"],
    queryFn: async () => (await supabase.from("alumni").select("*").order("graduation_year", { ascending: false })).data ?? [],
  });

  const { data: services } = useQuery({
    queryKey: ["alumni-services"],
    queryFn: async () => {
      const [psi, cbt, ref] = await Promise.all([
        supabase.from("psikotes_attempts").select("id,user_id,level,conclusion,completed_at"),
        supabase.from("cbt_attempts").select("id,user_id,percentage,passed,completed_at"),
        supabase.from("counseling_referrals").select("id,user_id,level,status,reason,created_at"),
      ]);
      return { psi: psi.data ?? [], cbt: cbt.data ?? [], ref: ref.data ?? [] };
    },
  });

  const svcOf = (a: AlumniRow) => ({
    psi: (services?.psi ?? []).filter((r: any) => a.user_id && r.user_id === a.user_id),
    cbt: (services?.cbt ?? []).filter((r: any) => a.user_id && r.user_id === a.user_id),
    ref: (services?.ref ?? []).filter((r: any) => a.user_id && r.user_id === a.user_id),
  });

  /* filtering */
  const setF = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }));
  const clearFilters = () => { setFilters({}); setSearch(""); };
  const activeFilters = Object.entries(filters).filter(([, v]) => v && v !== "all");

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (alumni as AlumniRow[]).filter((a) => {
      if (q && ![a.name, a.university, a.major, a.position, a.company, a.origin, a.graduation_year].some((f) => String(f ?? "").toLowerCase().includes(q))) return false;
      return activeFilters.every(([k, v]) => {
        if (k === "university_status") return uniStatus(a) === v;
        if (k === "status") return workStatus(a) === v;
        return (val(a[k]) ?? EMPTY) === v;
      });
    });
  }, [alumni, search, filters]);

  /* KPIs */
  const total = rows.length;
  const male = rows.filter((a) => /laki|^l$/i.test(String(a.gender ?? ""))).length;
  const female = rows.filter((a) => /perempuan|^p$/i.test(String(a.gender ?? ""))).length;
  const topBatch = countBy(rows, (a) => show(a.graduation_year))[0];
  const topLevel = countBy(rows, (a) => show(a.education_level))[0];
  const dalam = rows.filter((a) => uniStatus(a) === "Dalam Negeri").length;
  const luar = rows.filter((a) => uniStatus(a) === "Luar Negeri").length;
  const bekerja = rows.filter((a) => workStatus(a) === "Bekerja").length;
  const studi = rows.filter((a) => /kuliah|melanjutkan/i.test(workStatus(a))).length;
  const wira = rows.filter((a) => /wirausaha/i.test(workStatus(a))).length;
  const tracerFilled = rows.filter(hasTracer).length;
  const pct = (n: number) => (total ? ((n / total) * 100).toFixed(1) + "%" : "0%");

  /* chart data */
  const genderData = [
    { name: "Laki-laki", value: male },
    { name: "Perempuan", value: female },
    { name: "Tidak diisi", value: total - male - female },
  ].filter((d) => d.value > 0);
  const batchData = countBy(rows, (a) => show(a.graduation_year)).sort((a, b) => a.name.localeCompare(b.name));
  const originData = countBy(rows, (a) => show(a.origin)).slice(0, 8);
  const levelData = countBy(rows, (a) => show(a.education_level));
  const uniData = countBy(rows, (a) => show(a.university)).slice(0, 8);
  const jobStatusData = countBy(rows, workStatus);
  const jobFieldData = countBy(rows, (a) => show(a.job_field, hasTracer(a) ? EMPTY : NO_TRACER)).slice(0, 8);
  const locationData = countBy(rows, (a) => show(a.work_city ?? a.location, hasTracer(a) ? EMPTY : NO_TRACER)).slice(0, 8);
  const companyTypeData = countBy(rows, (a) => show(a.company_type, hasTracer(a) ? EMPTY : NO_TRACER));

  /* actions */
  const deleteAlumni = async (id: string) => {
    const { error } = await supabase.from("alumni").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Data alumni dihapus");
    qc.invalidateQueries({ queryKey: ["admin-recent-alumni"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
    setDetail(null);
  };
  const deleteAll = async () => {
    const { error } = await supabase.from("alumni").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return toast.error(error.message);
    toast.success("Semua data alumni dihapus");
    qc.invalidateQueries({ queryKey: ["admin-recent-alumni"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
  };

  const exportRows = () =>
    rows.map((a) => {
      const s = svcOf(a);
      return {
        Nama: a.name,
        "Jenis Kelamin": show(a.gender),
        Angkatan: show(a.graduation_year),
        "Tahun Lulus": show(a.year_graduated),
        Asal: show(a.origin),
        "Jenjang Pendidikan": show(a.education_level),
        Jurusan: show(a.major),
        Fakultas: show(a.faculty),
        Universitas: show(a.university),
        "Dalam/Luar Negeri": uniStatus(a),
        "Status Pekerjaan": workStatus(a),
        "Bidang Pekerjaan": show(a.job_field, hasTracer(a) ? EMPTY : NO_TRACER),
        Perusahaan: show(a.company, hasTracer(a) ? EMPTY : NO_TRACER),
        "Jenis Instansi": show(a.company_type, hasTracer(a) ? EMPTY : NO_TRACER),
        Jabatan: show(a.position, hasTracer(a) ? EMPTY : NO_TRACER),
        "Lokasi Kerja": show(a.work_city ?? a.location, hasTracer(a) ? EMPTY : NO_TRACER),
        "Status Tracer": hasTracer(a) ? "Sudah mengisi" : NO_TRACER,
        "Status Screening": s.psi.length ? `Sudah (${s.psi.length}x)` : "Belum",
        "Status CBT": s.cbt.length ? `Sudah (${s.cbt.length}x)` : "Belum",
        "Status Psikotes": s.psi.length ? "Sudah" : "Belum",
        "Status Konseling": s.ref.length ? `Ada rujukan (${s.ref.length})` : "Belum",
      };
    });

  const filterFields: { key: string; label: string; options: string[] }[] = [
    { key: "gender", label: "Jenis Kelamin", options: uniqSorted(alumni as AlumniRow[], "gender") },
    { key: "graduation_year", label: "Angkatan", options: uniqSorted(alumni as AlumniRow[], "graduation_year") },
    { key: "year_graduated", label: "Tahun Lulus", options: uniqSorted(alumni as AlumniRow[], "year_graduated") },
    { key: "origin", label: "Asal", options: uniqSorted(alumni as AlumniRow[], "origin") },
    { key: "education_level", label: "Jenjang", options: uniqSorted(alumni as AlumniRow[], "education_level") },
    { key: "major", label: "Jurusan", options: uniqSorted(alumni as AlumniRow[], "major") },
    { key: "faculty", label: "Fakultas", options: uniqSorted(alumni as AlumniRow[], "faculty") },
    { key: "university", label: "Universitas", options: uniqSorted(alumni as AlumniRow[], "university") },
    { key: "university_status", label: "Dalam/Luar Negeri", options: ["Dalam Negeri", "Luar Negeri", "Belum diidentifikasi", EMPTY] },
    { key: "status", label: "Status Pekerjaan", options: Array.from(new Set([...(alumni as AlumniRow[]).map(workStatus)])).sort() },
    { key: "job_field", label: "Bidang Pekerjaan", options: uniqSorted(alumni as AlumniRow[], "job_field") },
    { key: "work_city", label: "Kota Kerja", options: uniqSorted(alumni as AlumniRow[], "work_city") },
    { key: "company", label: "Perusahaan", options: uniqSorted(alumni as AlumniRow[], "company") },
  ];

  const cols = COLUMNS.filter((c) => visible.includes(c.key));

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground">Data Alumni</h2>
          <p className="text-sm text-muted-foreground">Pusat informasi profil, pendidikan, karier, dan layanan PEDULI alumni.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="h-10 rounded-xl" onClick={() => exportToExcel(exportRows(), "data-alumni-peduli")} disabled={!rows.length}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
          </Button>
          <Button size="sm" variant="outline" className="h-10 rounded-xl" onClick={() => exportToPDF(exportRows(), "data-alumni-peduli", "Data Alumni PEDULI")} disabled={!rows.length}>
            <FileDown className="h-4 w-4 mr-1.5" /> PDF
          </Button>
          <AlumniAddDialog />
          <AlumniCsvImport />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" className="h-10 rounded-xl" disabled={!alumni.length}>
                <Trash2 className="h-4 w-4 mr-1.5" /> Hapus Semua
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Hapus semua alumni?</AlertDialogTitle>
                <AlertDialogDescription>Tindakan ini menghapus {alumni.length} data alumni secara permanen.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus Semua</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Kpi label="Total Alumni" value={total} sub={`${male} L · ${female} P`} icon={Users} />
        <Kpi label="Angkatan Terbanyak" value={topBatch?.name ?? "-"} sub={`${topBatch?.value ?? 0} alumni`} icon={TrendingUp} />
        <Kpi label="Jenjang Terbanyak" value={topLevel?.name ?? "-"} sub={`${topLevel?.value ?? 0} alumni`} icon={GraduationCap} />
        <Kpi label="Univ. Dalam Negeri" value={dalam} sub={pct(dalam)} icon={Home} onClick={() => setF("university_status", "Dalam Negeri")} />
        <Kpi label="Univ. Luar Negeri" value={luar} sub={pct(luar)} icon={Globe2} onClick={() => setF("university_status", "Luar Negeri")} />
        <Kpi label="Bekerja" value={bekerja} sub={pct(bekerja)} icon={Briefcase} onClick={() => setF("status", "Bekerja")} />
        <Kpi label="Melanjutkan Studi" value={studi} sub={pct(studi)} icon={GraduationCap} onClick={() => setF("status", "Kuliah")} />
        <Kpi label="Wirausaha" value={wira} sub={pct(wira)} icon={Building2} onClick={() => setF("status", "Wirausaha")} />
      </div>

      {/* FILTER */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama, universitas, jurusan, pekerjaan..." className="pl-10 h-10 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 rounded-xl"><Columns3 className="h-4 w-4 mr-1.5" /> Kolom</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto bg-popover z-50">
              <DropdownMenuLabel>Tampilkan kolom</DropdownMenuLabel>
              {COLUMNS.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={visible.includes(c.key)}
                  onCheckedChange={(v) => setVisible((s) => (v ? [...s, c.key] : s.filter((k) => k !== c.key)))}
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {(activeFilters.length > 0 || search) && (
            <Button variant="ghost" size="sm" className="h-10 rounded-xl" onClick={clearFilters}><X className="h-4 w-4 mr-1.5" /> Reset</Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
          {filterFields.map((f) => (
            <select
              key={f.key}
              value={filters[f.key] ?? "all"}
              onChange={(e) => setF(f.key, e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
            >
              <option value="all">{f.label}: Semua</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Menampilkan <span className="font-medium text-foreground">{rows.length}</span> dari {alumni.length} alumni
          {activeFilters.length > 0 && ` · ${activeFilters.length} filter aktif`}
        </p>
      </div>

      {/* STATUS ALUMNI + TRACER */}
      <div className="grid lg:grid-cols-3 gap-4">
        <ChartCard title="Status Pekerjaan" desc="Termasuk alumni yang belum mengisi tracer">
          <Donut data={jobStatusData} onSlice={(n) => setF("status", n)} />
        </ChartCard>
        <ChartCard title="Tracer Study" desc="Tingkat pengisian tracer study">
          <Donut data={[{ name: "Sudah mengisi", value: tracerFilled }, { name: NO_TRACER, value: total - tracerFilled }].filter((d) => d.value > 0)} />
        </ChartCard>
        <ChartCard title="Jenis Perusahaan / Instansi" desc="Tempat alumni berkarier">
          <Donut data={companyTypeData} />
        </ChartCard>
      </div>

      {/* DEMOGRAFI */}
      <div className="grid lg:grid-cols-3 gap-4">
        <ChartCard title="Distribusi Jenis Kelamin">
          <Donut data={genderData} onSlice={(n) => n !== "Tidak diisi" && setF("gender", n)} />
        </ChartCard>
        <ChartCard title="Asal Alumni" desc="Top 8 daerah asal">
          <HBar data={originData} onBar={(n: string) => setF("origin", n)} />
        </ChartCard>
        <ChartCard title="Jenjang Pendidikan">
          <Donut data={levelData} onSlice={(n) => setF("education_level", n)} />
        </ChartCard>
      </div>

      {/* PENDIDIKAN & UNIVERSITAS */}
      <div className="grid lg:grid-cols-3 gap-4">
        <ChartCard title="Universitas Alumni" desc="Top 8 universitas" className="lg:col-span-2">
          <HBar data={uniData} onBar={(n: string) => setF("university", n)} />
        </ChartCard>
        <div className="grid grid-cols-1 gap-4">
          <Kpi label="Universitas Dalam Negeri" value={`${dalam} alumni`} sub={pct(dalam)} icon={Home} onClick={() => setF("university_status", "Dalam Negeri")} />
          <Kpi label="Universitas Luar Negeri" value={`${luar} alumni`} sub={pct(luar)} icon={Globe2} onClick={() => setF("university_status", "Luar Negeri")} />
          <Kpi label="Belum Teridentifikasi" value={`${total - dalam - luar} alumni`} sub="Status universitas belum diisi" icon={AlertTriangle} onClick={() => setF("university_status", EMPTY)} />
        </div>
      </div>

      {/* PEKERJAAN & LOKASI */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Bidang Pekerjaan" desc="Urut dari terbanyak">
          <HBar data={jobFieldData} onBar={(n: string) => setF("job_field", n)} />
        </ChartCard>
        <ChartCard title="Lokasi Pekerjaan" desc="Kota / lokasi kerja alumni">
          <HBar data={locationData} onBar={(n: string) => setF("work_city", n)} />
        </ChartCard>
      </div>

      {/* ANALITIK ANGKATAN */}
      <ChartCard title="Alumni per Angkatan" desc="Distribusi jumlah alumni tiap angkatan">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={batchData}>
            <defs>
              <linearGradient id="gradBatch" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Area type="monotone" dataKey="value" stroke="hsl(160 84% 39%)" strokeWidth={2.5} fill="url(#gradBatch)" activeDot={{ r: 5, onClick: (_: any, p: any) => setF("graduation_year", p?.payload?.name) }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* LAYANAN PEDULI + BELUM MENGISI */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        {(() => {
          const withUser = rows.filter((a) => a.user_id);
          const cnt = (key: "psi" | "cbt" | "ref") => withUser.filter((a) => svcOf(a)[key].length > 0).length;
          return [
            { label: "Sudah Screening/Psikotes", v: cnt("psi"), sub: `${withUser.length - cnt("psi")} belum mengerjakan` },
            { label: "Sudah Tes CBT", v: cnt("cbt"), sub: `${withUser.length - cnt("cbt")} belum mengerjakan` },
            { label: "Punya Rujukan Konseling", v: cnt("ref"), sub: "Total alumni dengan rujukan" },
            { label: "Belum Mengisi Tracer", v: total - tracerFilled, sub: "Klik untuk melihat daftar" },
          ].map((k) => (
            <Kpi key={k.label} label={k.label} value={k.v} sub={k.sub} icon={UserCircle}
              onClick={k.label === "Belum Mengisi Tracer" ? () => setF("status", NO_TRACER) : undefined} />
          ));
        })()}
      </div>

      {/* DAFTAR ALUMNI */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm">Daftar Alumni</h3>
          <span className="text-xs text-muted-foreground">{rows.length} data</span>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Memuat data...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Tidak ada alumni yang cocok dengan filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  {cols.map((c) => <TableHead key={c.key} className="whitespace-nowrap">{c.label}</TableHead>)}
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a, i) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => setDetail(a)}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    {cols.map((c) => (
                      <TableCell key={c.key} className={`whitespace-nowrap text-xs ${c.key === "name" ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {c.render(a)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); deleteAlumni(a.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detail && (() => {
            const s = svcOf(detail);
            const Row = ({ l, v }: { l: string; v: any }) => (
              <div className="flex justify-between gap-3 py-1.5 border-b border-border/60 last:border-0">
                <span className="text-xs text-muted-foreground">{l}</span>
                <span className="text-xs font-medium text-foreground text-right">{v}</span>
              </div>
            );
            const Section = ({ t, children }: any) => (
              <div className="rounded-xl border border-border p-3">
                <p className="font-heading text-xs font-semibold text-primary mb-1.5">{t}</p>
                {children}
              </div>
            );
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="font-heading">{detail.name}</SheetTitle>
                </SheetHeader>
                <div className="space-y-3 mt-4">
                  <Section t="PROFIL ALUMNI">
                    <Row l="Nama Lengkap" v={detail.name} />
                    <Row l="Jenis Kelamin" v={show(detail.gender)} />
                    <Row l="Angkatan" v={show(detail.graduation_year)} />
                    <Row l="Tahun Lulus" v={show(detail.year_graduated)} />
                    <Row l="Asal" v={show(detail.origin)} />
                    <Row l="Jenjang Pendidikan" v={show(detail.education_level)} />
                    <Row l="Jurusan" v={show(detail.major)} />
                    <Row l="Fakultas" v={show(detail.faculty)} />
                    <Row l="Universitas" v={show(detail.university)} />
                    <Row l="Dalam/Luar Negeri" v={uniStatus(detail)} />
                  </Section>
                  <Section t="PEKERJAAN">
                    <Row l="Status Pekerjaan" v={workStatus(detail)} />
                    <Row l="Bidang Pekerjaan" v={show(detail.job_field, hasTracer(detail) ? EMPTY : NO_TRACER)} />
                    <Row l="Perusahaan / Instansi" v={show(detail.company, hasTracer(detail) ? EMPTY : NO_TRACER)} />
                    <Row l="Jenis Perusahaan" v={show(detail.company_type, hasTracer(detail) ? EMPTY : NO_TRACER)} />
                    <Row l="Jabatan" v={show(detail.position, hasTracer(detail) ? EMPTY : NO_TRACER)} />
                    <Row l="Lokasi Kerja" v={[val(detail.work_city), val(detail.work_province), val(detail.work_country), val(detail.location)].filter(Boolean).join(", ") || (hasTracer(detail) ? EMPTY : NO_TRACER)} />
                  </Section>
                  <Section t="TRACER STUDY">
                    <Row l="Status Tracer" v={hasTracer(detail) ? "Sudah mengisi" : NO_TRACER} />
                    <Row l="Tanggal Pengisian" v={detail.tracer_filled_at ? new Date(detail.tracer_filled_at).toLocaleString("id-ID") : "Tidak tersedia"} />
                    <Row l="Pendidikan Lanjutan" v={show(detail.further_education, hasTracer(detail) ? EMPTY : NO_TRACER)} />
                    <Row l="Universitas Tujuan" v={show(detail.target_university, hasTracer(detail) ? EMPTY : NO_TRACER)} />
                    <Row l="Terakhir Diperbarui" v={detail.updated_at ? new Date(detail.updated_at).toLocaleString("id-ID") : "-"} />
                  </Section>
                  <Section t="LAYANAN PEDULI">
                    {!detail.user_id ? (
                      <p className="text-xs text-muted-foreground">Alumni ini belum memiliki akun terhubung — data layanan tidak tersedia.</p>
                    ) : (
                      <>
                        <Row l="Screening / Psikotes" v={s.psi.length ? `${s.psi.length}x · ${s.psi[0].level ?? "-"}` : "Belum"} />
                        <Row l="Tes CBT" v={s.cbt.length ? `${s.cbt.length}x · ${Number(s.cbt[0].percentage ?? 0).toFixed(0)}%` : "Belum"} />
                        <Row l="Konseling / Rujukan" v={s.ref.length ? `${s.ref.length} rujukan · ${s.ref[0].status ?? "-"}` : "Belum"} />
                      </>
                    )}
                  </Section>
                  <Button variant="destructive" className="w-full rounded-xl" onClick={() => deleteAlumni(detail.id)}>
                    <Trash2 className="h-4 w-4 mr-1.5" /> Hapus Data Alumni
                  </Button>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AlumniCenter;
