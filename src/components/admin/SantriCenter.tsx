import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar as RBar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from "recharts";
import {
  Search, FileSpreadsheet, FileDown, SlidersHorizontal, Pencil, Eye, X, Users, UserCheck, UserX,
  GraduationCap, HeartPulse, FileText, Brain, Activity, Target, ArrowRight, Plus, School, Building2, ClipboardList,
} from "lucide-react";

const val = (v: any) => (v === null || v === undefined || String(v).trim() === "" || String(v).trim() === "-" ? null : String(v).trim());
const show = (v: any, f = "Belum diisi") => val(v) ?? f;
const isSMA = (lvl?: string | null) => /sma|ma\b|smk|aliyah/i.test(lvl ?? "");
const pctS = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1) : "0.0");
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

const DONUT_COLORS = ["#16A34A", "#3B82F6", "#8B5CF6", "#F59E0B", "#F97316", "#9CA3AF", "#EF4444"];

/* ---------- reusable pieces ---------- */

const CardBox = ({ title, right, children, className = "", icon: Icon }: any) => (
  <div className={`rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}>
    {(title || right) && (
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="h-4 w-4 text-primary shrink-0" strokeWidth={1.8} />}
          <h3 className="font-heading text-[13.5px] font-semibold text-foreground leading-tight truncate">{title}</h3>
        </div>
        {right}
      </div>
    )}
    {children}
  </div>
);

const TONE: Record<string, string> = {
  green: "bg-primary/10 text-primary",
  orange: "bg-orange-100 text-orange-600",
  purple: "bg-violet-100 text-violet-600",
  blue: "bg-blue-100 text-blue-600",
};

const StatCard = ({ label, value, note, noteClass = "text-muted-foreground", icon: Icon, tone = "green" }: any) => (
  <div className="rounded-xl border border-border bg-card p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-start gap-2.5 h-full">
    <span className={`h-9 w-9 rounded-[9px] flex items-center justify-center shrink-0 ${TONE[tone]}`}>
      <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
    </span>
    <div className="min-w-0">
      <p className="text-[11.5px] text-muted-foreground leading-tight truncate">{label}</p>
      <p className="font-heading text-[23px] font-bold text-foreground leading-tight mt-0.5">{value}</p>
      {note && <p className={`text-[10.5px] mt-0.5 leading-tight ${noteClass}`}>{note}</p>}
    </div>
  </div>
);

const Ring = ({ pct, size = 78, stroke = 8, color = "#16A34A", label, sub }: any) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * Math.min(pct, 100)) / 100}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-[13px] font-bold text-foreground leading-none">{label}</span>
        {sub && <span className="text-[9px] text-muted-foreground mt-0.5">{sub}</span>}
      </div>
    </div>
  );
};

const ServiceCard = ({ title, icon: Icon, done, total, footer, color = "#16A34A" }: any) => {
  const pct = total ? (done / total) * 100 : 0;
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-7 w-7 rounded-[8px] bg-accent/70 flex items-center justify-center">
          <Icon className="h-[15px] w-[15px] text-primary" strokeWidth={1.8} />
        </span>
        <h3 className="font-heading text-[13px] font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex items-center gap-3 flex-1">
        <Ring pct={pct} label={`${pctS(done, total)}%`} color={color} />
        <ul className="space-y-1.5 text-[11px] min-w-0 flex-1">
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span className="text-muted-foreground">Sudah</span>
            <span className="ml-auto font-semibold text-foreground tabular-nums">{done}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
            <span className="text-muted-foreground">Belum</span>
            <span className="ml-auto font-semibold text-foreground tabular-nums">{Math.max(total - done, 0)}</span>
          </li>
        </ul>
      </div>
      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-border text-[10.5px] text-muted-foreground">
        <span>Total {total} santri</span>
        <span className="text-right">{footer}</span>
      </div>
    </div>
  );
};

const YesNo = ({ ok }: { ok: boolean }) => (
  <Badge variant={ok ? "default" : "outline"} className="rounded-sm text-[10px] font-medium">{ok ? "Sudah" : "Belum"}</Badge>
);

const FIELDS = [
  { key: "full_name", label: "Nama Lengkap" },
  { key: "gender", label: "Jenis Kelamin" },
  { key: "graduation_year", label: "Angkatan", type: "number" },
  { key: "origin", label: "Asal" },
  { key: "education_level", label: "Jenjang" },
  { key: "school_origin", label: "Sekolah / Pesantren" },
  { key: "major", label: "Kelas / Jurusan" },
  { key: "phone", label: "Telepon" },
  { key: "address", label: "Alamat" },
];

const TABS = [
  { key: "dashboard", label: "Dashboard Santri" },
  { key: "list", label: "Daftar Santri" },
  { key: "layanan", label: "Monitor Layanan" },
  { key: "kelas", label: "Kelas / Sekolah" },
];

const jenjangBucket = (lvl?: string | null) => {
  const v = val(lvl);
  if (!v) return "Tidak diisi";
  if (isSMA(v)) return "SMA/MA/SMK";
  if (/smp|tsanawiyah|mts/i.test(v)) return "SMP";
  if (/sd|ibtidaiyah|mi\b/i.test(v)) return "SD/MI";
  return v;
};

const SantriCenter = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");
  const [jenjangFilter, setJenjangFilter] = useState("all");
  const [screeningTab, setScreeningTab] = useState<"pss" | "brs" | "srq">("pss");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [fGender, setFGender] = useState("all");
  const [fJenjang, setFJenjang] = useState("all");
  const [fScreening, setFScreening] = useState("all");
  const [detail, setDetail] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["santri-center"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const santriIds = new Set((roles ?? []).filter((r: any) => r.role === "santri").map((r: any) => r.user_id));
      const ids = Array.from(santriIds);
      const [profs, psi, cbt, ref] = await Promise.all([
        ids.length ? supabase.from("profiles").select("*").in("id", ids).order("created_at", { ascending: false }) : Promise.resolve({ data: [] } as any),
        supabase.from("psikotes_attempts").select("user_id, level, test_id, completed_at"),
        supabase.from("cbt_attempts").select("user_id, percentage, completed_at"),
        supabase.from("counseling_referrals").select("user_id, level, status, created_at"),
      ]);
      const { data: psiTests } = await supabase.from("psikotes_tests").select("id, title");
      return {
        profiles: profs.data ?? [],
        santriIds,
        psi: (psi.data ?? []).filter((r: any) => santriIds.has(r.user_id)),
        cbt: (cbt.data ?? []).filter((r: any) => santriIds.has(r.user_id)),
        ref: (ref.data ?? []).filter((r: any) => santriIds.has(r.user_id)),
        psiTests: psiTests ?? [],
      };
    },
  });

  const allRows: any[] = data?.profiles ?? [];
  const rows = useMemo(
    () => (jenjangFilter === "all" ? allRows : allRows.filter((r) => jenjangBucket(r.education_level) === jenjangFilter)),
    [allRows, jenjangFilter],
  );

  const psiByUser = useMemo(() => {
    const m = new Map<string, any[]>();
    (data?.psi ?? []).forEach((r: any) => m.set(r.user_id, [...(m.get(r.user_id) ?? []), r]));
    return m;
  }, [data]);
  const cbtUsers = useMemo(() => new Set((data?.cbt ?? []).map((r: any) => r.user_id)), [data]);
  const refUsers = useMemo(() => new Set((data?.ref ?? []).map((r: any) => r.user_id)), [data]);
  const testTitle = useMemo(() => new Map((data?.psiTests ?? []).map((t: any) => [t.id, t.title as string])), [data]);

  const isPsi = (uid: string, re: RegExp) => (psiByUser.get(uid) ?? []).some((a) => re.test(testTitle.get(a.test_id) ?? ""));
  const screeningUsers = useMemo(() => new Set(Array.from(psiByUser.keys())), [psiByUser]);
  const psikotesUsers = useMemo(
    () => new Set(Array.from(psiByUser.keys()).filter((u) => isPsi(u, /minat|bakat|kepribadian|psikotes/i))),
    [psiByUser, testTitle],
  );

  const inScope = useMemo(() => new Set(rows.map((r) => r.user_id)), [rows]);
  const countIn = (s: Set<string>) => Array.from(s).filter((u) => inScope.has(u)).length;

  const total = rows.length;
  const screeningDone = countIn(screeningUsers);
  const cbtDone = countIn(cbtUsers);
  const psikotesDone = countIn(psikotesUsers);
  const konselingDone = countIn(refUsers);

  const screeningAttempts = (data?.psi ?? []).filter((a: any) => inScope.has(a.user_id)).length;
  const cbtAttempts = (data?.cbt ?? []).filter((a: any) => inScope.has(a.user_id)).length;
  const psikotesAttempts = (data?.psi ?? []).filter((a: any) => inScope.has(a.user_id) && /minat|bakat|kepribadian|psikotes/i.test(testTitle.get(a.test_id) ?? "")).length;
  const konselingSesi = (data?.ref ?? []).filter((a: any) => inScope.has(a.user_id)).length;

  const aktif = rows.filter((r) => val(r.full_name)).length;
  const belumAktif = Math.max(total - aktif, 0);
  const smaRows = rows.filter((r) => isSMA(r.education_level));
  const smaScreened = smaRows.filter((r) => screeningUsers.has(r.user_id)).length;
  const smaTargetPct = smaRows.length ? (smaScreened / (smaRows.length * 0.5)) * 100 : 0;

  const lastMonth = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return rows.filter((r) => r.created_at && new Date(r.created_at) > d).length;
  }, [rows]);

  const groupBy = (key: (r: any) => string, limit = 6) => {
    const m = new Map<string, number>();
    rows.forEach((r) => { const k = key(r); m.set(k, (m.get(k) ?? 0) + 1); });
    const arr = Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (arr.length <= limit) return arr;
    const head = arr.slice(0, limit - 1);
    head.push({ name: "Lainnya", value: arr.slice(limit - 1).reduce((s, x) => s + x.value, 0) });
    return head;
  };

  const byJenjang = useMemo(() => groupBy((r) => jenjangBucket(r.education_level)), [rows]);
  const byKota = useMemo(() => groupBy((r) => show(r.origin, "Tidak diisi")), [rows]);
  const bySekolah = useMemo(() => groupBy((r) => show(r.school_origin, "Tidak diisi")), [rows]);
  const byKelas = useMemo(() => {
    const order = ["XII", "XI", "X", "IX", "VIII", "VII"];
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const raw = val(r.major);
      const k = raw ? (order.find((o) => new RegExp(`^${o}\\b`, "i").test(raw)) ?? raw) : "Tidak diisi";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => {
      const ia = order.indexOf(a.name), ib = order.indexOf(b.name);
      if (ia === -1 && ib === -1) return b.value - a.value;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }).slice(0, 8);
  }, [rows]);

  const screeningLevels = useMemo(() => {
    const bucket = (re: RegExp, labels: string[]) => {
      const counts = labels.map(() => 0);
      Array.from(psiByUser.entries()).forEach(([uid, atts]) => {
        if (!inScope.has(uid)) return;
        const a = atts.filter((x: any) => re.test(testTitle.get(x.test_id) ?? "")).slice(-1)[0];
        if (!a) return;
        const idx = labels.findIndex((l) => new RegExp(l, "i").test(a.level ?? ""));
        if (idx >= 0) counts[idx] += 1;
      });
      return labels.map((l, i) => ({ name: l, value: counts[i] }));
    };
    return {
      pss: bucket(/pss|stres/i, ["Rendah", "Sedang", "Tinggi"]),
      brs: bucket(/brs|resilien/i, ["Rendah", "Normal", "Tinggi"]),
      srq: bucket(/srq/i, ["Rendah", "Sedang", "Tinggi"]),
    };
  }, [psiByUser, testTitle, inScope]);

  const activities = useMemo(() => {
    const nameOf = (uid: string) => show(allRows.find((r) => r.user_id === uid)?.full_name, "Santri");
    const items = [
      ...(data?.psi ?? []).map((a: any) => ({ uid: a.user_id, at: a.completed_at, text: `Mengerjakan ${testTitle.get(a.test_id) ?? "Screening"}`, icon: HeartPulse })),
      ...(data?.cbt ?? []).map((a: any) => ({ uid: a.user_id, at: a.completed_at, text: "Mengerjakan Tes CBT", icon: FileText })),
      ...(data?.ref ?? []).map((a: any) => ({ uid: a.user_id, at: a.created_at, text: "Rujukan Konseling", icon: Activity })),
    ].filter((x) => x.at && inScope.has(x.uid));
    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return items.slice(0, 4).map((x) => ({ ...x, name: nameOf(x.uid) }));
  }, [data, testTitle, allRows, inScope]);

  /* ---------- list tab ---------- */
  const filtered = rows.filter((r) => {
    if (fGender !== "all" && show(r.gender, "-") !== fGender) return false;
    if (fJenjang !== "all" && show(r.education_level, "-") !== fJenjang) return false;
    if (fScreening === "sudah" && !screeningUsers.has(r.user_id)) return false;
    if (fScreening === "belum" && screeningUsers.has(r.user_id)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [r.full_name, r.origin, r.school_origin, r.major, r.education_level, r.phone].some((v: any) => v?.toLowerCase?.().includes(q));
  });

  const uniq = (key: string) => Array.from(new Set(rows.map((r) => val(r[key])).filter(Boolean) as string[])).sort();

  const exportRows = filtered.map((r) => ({
    full_name: show(r.full_name, ""),
    gender: show(r.gender, ""),
    graduation_year: r.graduation_year ?? "",
    origin: show(r.origin, ""),
    education_level: show(r.education_level, ""),
    school_origin: show(r.school_origin, ""),
    screening_status: screeningUsers.has(r.user_id) ? "Sudah" : "Belum",
    cbt_status: cbtUsers.has(r.user_id) ? "Sudah" : "Belum",
    psikotes_status: psikotesUsers.has(r.user_id) ? "Sudah" : "Belum",
    counseling_status: refUsers.has(r.user_id) ? "Sudah" : "Belum",
  }));


  const openDetail = (r: any) => { setDetail(r); setEditing(false); setForm({ ...r }); };

  const saveEdit = async () => {
    const payload: Record<string, any> = {};
    FIELDS.forEach((f) => {
      let v = form[f.key];
      if (f.type === "number") v = v === "" || v === null ? null : Number(v);
      payload[f.key] = v === "" ? null : v;
    });
    const { error } = await supabase.from("profiles").update(payload).eq("id", detail.id);
    if (error) return toast.error(error.message);
    toast.success("Data santri diperbarui");
    setEditing(false);
    setDetail({ ...detail, ...payload });
    qc.invalidateQueries({ queryKey: ["santri-center"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
  };

  const screenData = screeningLevels[screeningTab];
  const screenTotal = screenData.reduce((s, d) => s + d.value, 0);
  const SCREEN_COLORS = ["#16A34A", "#3B82F6", "#EF4444"];

  /* ---------- render ---------- */
  const Dashboard = (
    <div className="space-y-3">
      {/* summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
        <StatCard icon={Users} tone="green" label="Total Santri" value={total} note={`▲ ${lastMonth} dari bulan lalu`} noteClass="text-primary" />
        <StatCard icon={UserCheck} tone="green" label="Santri Aktif (Terdaftar)" value={aktif} note={`${pctS(aktif, total)}% dari total santri`} noteClass="text-primary" />
        <StatCard icon={UserX} tone="orange" label="Santri Belum Aktif" value={belumAktif} note={`${pctS(belumAktif, total)}% dari total santri`} noteClass="text-orange-600" />
        <StatCard icon={GraduationCap} tone="purple" label="Santri SMA/MA/SMK" value={smaRows.length} note={`${pctS(smaRows.length, total)}% dari total santri`} noteClass="text-violet-600" />
        <StatCard icon={HeartPulse} tone="blue" label="Partisipasi Screening" value={`${pctS(screeningDone, total)}%`} note={`Sudah ${screeningDone} dari ${total} santri`} />
        <StatCard icon={FileText} tone="blue" label="Sudah CBT" value={`${pctS(cbtDone, total)}%`} note={`Sudah ${cbtDone} dari ${total} santri`} />
      </div>

      {/* services + target */}
      <div className="grid gap-2.5 lg:grid-cols-3 xl:grid-cols-7">
        <div className="lg:col-span-2 xl:col-span-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <ServiceCard title="Screening Mental" icon={HeartPulse} done={screeningDone} total={total} footer={`${screeningDone} peserta • ${screeningAttempts} attempt`} />
          <ServiceCard title="Tes CBT" icon={FileText} done={cbtDone} total={total} footer={`${cbtDone} peserta • ${cbtAttempts} attempt`} />
          <ServiceCard title="Psikotes" icon={Brain} done={psikotesDone} total={total} footer={`${psikotesDone} peserta • ${psikotesAttempts} attempt`} />
          <ServiceCard title="Konseling" icon={Activity} done={konselingDone} total={total} footer={`${konselingDone} peserta • ${konselingSesi} sesi`} />
        </div>

        <CardBox title="Target Skrining Awal Santri SMA/MA/SMK" icon={Target} className="lg:col-span-1 xl:col-span-3">
          <div className="flex items-center gap-4">
            <dl className="flex-1 space-y-1.5 text-[11.5px] min-w-0">
              <div><dt className="text-muted-foreground">Target Minimal</dt><dd className="text-foreground font-medium">50% santri SMA/MA/SMK</dd></div>
              <div><dt className="text-muted-foreground">Santri SMA/MA/SMK</dt><dd className="text-foreground font-semibold">{smaRows.length}</dd></div>
              <div><dt className="text-muted-foreground">Sudah Screening</dt><dd className="text-foreground font-semibold">{smaScreened}</dd></div>
              <div><dt className="text-muted-foreground">Belum Screening</dt><dd className="text-foreground font-semibold">{smaRows.length - smaScreened}</dd></div>
            </dl>
            <Ring pct={smaTargetPct} size={104} stroke={10} label={`${smaTargetPct.toFixed(1)}%`} sub="dari target" />
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(smaTargetPct, 100)}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[10.5px] text-muted-foreground">
              <span>Progress menuju target 50%</span>
              <span className="font-semibold text-foreground">{smaTargetPct.toFixed(1)}%</span>
            </div>
          </div>
        </CardBox>
      </div>

      {/* visualisasi */}
      <div className="grid gap-2.5 lg:grid-cols-2 xl:grid-cols-4">
        <CardBox title="Santri Berdasarkan Jenjang">
          <DonutRow data={byJenjang} />
        </CardBox>

        <CardBox title="Santri Berdasarkan Kelas">
          <div className="h-[170px]">
            {byKelas.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byKelas} margin={{ top: 14, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <RBar dataKey="value" fill="#16A34A" radius={[3, 3, 0, 0]} barSize={18}>
                    <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: "#16A34A" }} />
                  </RBar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardBox>

        <CardBox title="Asal Pondok / Sekolah">
          <div className="h-[170px]">
            {bySekolah.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySekolah} layout="vertical" margin={{ left: 4, right: 26, top: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9.5, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <RBar dataKey="value" fill="#16A34A" radius={[0, 3, 3, 0]} barSize={11}>
                    <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#16A34A" }} />
                  </RBar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardBox>

        <CardBox title="Santri Berdasarkan Kota">
          <DonutRow data={byKota} />
        </CardBox>
      </div>

      {/* bottom row */}
      <div className="grid gap-2.5 lg:grid-cols-3 xl:grid-cols-7">
        <CardBox
          title="Santri Terbaru"
          className="lg:col-span-2 xl:col-span-3"
          right={<Button variant="outline" size="sm" className="h-7 rounded-md text-[11px]" onClick={() => setTab("list")}>Lihat Semua</Button>}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse min-w-[520px]">
              <thead>
                <tr className="text-left text-[10.5px] text-muted-foreground border-b border-border">
                  {["Nama", "Kelas", "Sekolah / Pondok", "Jenjang", "Status", "Tanggal Daftar"].map((h) => (
                    <th key={h} className="py-2 pr-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium text-foreground whitespace-nowrap">{show(r.full_name, "(Tanpa Nama)")}</td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{show(r.major, "-")}</td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{show(r.school_origin, "-")}</td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{jenjangBucket(r.education_level)}</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center rounded-[5px] bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium">
                        {val(r.full_name) ? "Aktif" : "Belum"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Belum ada santri.</td></tr>}
              </tbody>
            </table>
          </div>
          <button onClick={() => setTab("list")} className="w-full mt-2 pt-2 text-[11px] font-medium text-primary flex items-center justify-center gap-1">
            Lihat Semua Santri <ArrowRight className="h-3 w-3" />
          </button>
        </CardBox>

        <CardBox title="Layanan yang Belum Dikerjakan" className="lg:col-span-1 xl:col-span-2">
          <ul className="space-y-2.5">
            {[
              { label: "Belum Screening", icon: HeartPulse, v: total - screeningDone },
              { label: "Belum CBT", icon: FileText, v: total - cbtDone },
              { label: "Belum Psikotes", icon: Brain, v: total - psikotesDone },
              { label: "Belum Konseling", icon: Activity, v: total - konselingDone },
            ].map((it) => (
              <li key={it.label} className="flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-[8px] bg-accent/70 flex items-center justify-center shrink-0">
                  <it.icon className="h-[14px] w-[14px] text-primary" strokeWidth={1.8} />
                </span>
                <span className="text-[11.5px] text-foreground flex-1 truncate">{it.label}</span>
                <span className="text-[11.5px] font-semibold text-foreground tabular-nums">{Math.max(it.v, 0)} <span className="font-normal text-muted-foreground">santri</span></span>
              </li>
            ))}
          </ul>
          <button onClick={() => setTab("layanan")} className="w-full mt-3 pt-3 border-t border-border text-[11px] font-medium text-primary flex items-center justify-center gap-1">
            Lihat Daftar Detail <ArrowRight className="h-3 w-3" />
          </button>
        </CardBox>

        <CardBox title="Distribusi Hasil Screening Mental" className="lg:col-span-3 xl:col-span-2">
          <div className="flex items-center gap-3 -mt-1 mb-2 border-b border-border">
            {([["pss", "PSS-10"], ["brs", "BRS"], ["srq", "SRQ-20"]] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setScreeningTab(k)}
                className={`pb-1.5 text-[11px] border-b-2 -mb-px ${screeningTab === k ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="h-[128px] w-[128px] shrink-0">
              {screenTotal === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={screenData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={60} paddingAngle={1} stroke="none">
                      {screenData.map((_, i) => <Cell key={i} fill={SCREEN_COLORS[i % SCREEN_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <ul className="flex-1 space-y-1.5 min-w-0">
              {screenData.map((d, i) => (
                <li key={d.name} className="flex items-center gap-2 text-[11px]">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SCREEN_COLORS[i % SCREEN_COLORS.length] }} />
                  <span className="text-foreground flex-1 truncate">{d.name}</span>
                  <span className="text-muted-foreground shrink-0">{d.value} ({pctS(d.value, screenTotal)}%)</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[10.5px] text-muted-foreground mt-2.5 pt-2.5 border-t border-border">Total {screenTotal} peserta</p>
        </CardBox>
      </div>

      {/* aktivitas */}
      <CardBox
        title="Aktivitas Terbaru Santri"
        right={<button onClick={() => setTab("layanan")} className="text-[11px] font-medium text-primary flex items-center gap-1">Lihat Semua Aktivitas <ArrowRight className="h-3 w-3" /></button>}
      >
        {activities.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Belum ada aktivitas.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {activities.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 min-w-0">
                <span className="h-8 w-8 rounded-full bg-accent/70 flex items-center justify-center shrink-0">
                  <a.icon className="h-[15px] w-[15px] text-primary" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-medium text-foreground truncate">{a.name}</p>
                  <p className="text-[10.5px] text-muted-foreground truncate">{a.text}</p>
                </div>
                <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">{fmtDate(a.at)}</span>
              </div>
            ))}
          </div>
        )}
      </CardBox>
    </div>
  );

  const ListTab = (
    <CardBox
      title={`Daftar Santri — ${filtered.length} dari ${total} santri`}
      right={
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, asal, sekolah..." className="h-9 pl-8 w-[200px] rounded-md text-sm" />
          </div>
          <Button variant="outline" size="sm" className="h-9 rounded-md" onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />Filter
          </Button>
          <Button variant="outline" size="sm" className="h-9 rounded-md" disabled={!exportRows.length} onClick={() => exportToExcel(exportRows, "santri-peduli")}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Excel
          </Button>
          <Button variant="outline" size="sm" className="h-9 rounded-md" disabled={!exportRows.length} onClick={() => exportToPDF(exportRows, "santri-peduli", "Data Santri PEDULI")}>
            <FileDown className="h-3.5 w-3.5 mr-1.5" />PDF
          </Button>
        </div>
      }
    >
      {showFilters && (
        <div className="grid sm:grid-cols-3 gap-3 mb-4 pb-4 border-b border-border">
          <Select value={fGender} onValueChange={setFGender}>
            <SelectTrigger className="h-9 rounded-md text-sm"><SelectValue placeholder="Jenis Kelamin" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Semua Jenis Kelamin</SelectItem>{uniq("gender").map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fJenjang} onValueChange={setFJenjang}>
            <SelectTrigger className="h-9 rounded-md text-sm"><SelectValue placeholder="Jenjang" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Semua Jenjang</SelectItem>{uniq("education_level").map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fScreening} onValueChange={setFScreening}>
            <SelectTrigger className="h-9 rounded-md text-sm"><SelectValue placeholder="Status Screening" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status Screening</SelectItem>
              <SelectItem value="sudah">Sudah Screening</SelectItem>
              <SelectItem value="belum">Belum Screening</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px] border-collapse min-w-[900px]">
          <thead>
            <tr className="text-left text-[10.5px] uppercase tracking-wide text-muted-foreground border-b border-border">
              {["Nama", "Jenis Kelamin", "Angkatan", "Asal", "Jenjang", "Sekolah/Pesantren", "Screening", "CBT", "Psikotes", "Konseling", "Pendampingan", "Aksi"].map((h) => (
                <th key={h} className="py-2 pr-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={12} className="py-8 text-center text-muted-foreground">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={12} className="py-8 text-center text-muted-foreground">Belum ada santri terdaftar.</td></tr>
            ) : (
              filtered.map((r) => {
                const need = (psiByUser.get(r.user_id) ?? []).some((a: any) => /tinggi|berat/i.test(a.level ?? "")) || refUsers.has(r.user_id);
                return (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-accent/30">
                    <td className="py-2 pr-3 font-medium text-foreground whitespace-nowrap">{show(r.full_name, "(Tanpa Nama)")}</td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{show(r.gender, "-")}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.graduation_year ?? "-"}</td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{show(r.origin, "-")}</td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{show(r.education_level, "-")}</td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{show(r.school_origin, "-")}</td>
                    <td className="py-2 pr-3"><YesNo ok={screeningUsers.has(r.user_id)} /></td>
                    <td className="py-2 pr-3"><YesNo ok={cbtUsers.has(r.user_id)} /></td>
                    <td className="py-2 pr-3"><YesNo ok={psikotesUsers.has(r.user_id)} /></td>
                    <td className="py-2 pr-3"><YesNo ok={refUsers.has(r.user_id)} /></td>
                    <td className="py-2 pr-3">
                      <Badge variant={need ? "destructive" : "outline"} className="rounded-sm text-[10px]">{need ? "Perlu" : "Normal"}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDetail(r)} aria-label="Lihat"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { openDetail(r); setEditing(true); }} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </CardBox>
  );

  const LayananTab = (
    <div className="space-y-2.5">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <ServiceCard title="Screening Mental" icon={HeartPulse} done={screeningDone} total={total} footer={`${screeningAttempts} attempt`} />
        <ServiceCard title="Tes CBT" icon={FileText} done={cbtDone} total={total} footer={`${cbtAttempts} attempt`} />
        <ServiceCard title="Psikotes" icon={Brain} done={psikotesDone} total={total} footer={`${psikotesAttempts} attempt`} />
        <ServiceCard title="Konseling" icon={Activity} done={konselingDone} total={total} footer={`${konselingSesi} sesi`} />
      </div>
      <CardBox title="Santri Belum Mengikuti Layanan" icon={ClipboardList}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px] border-collapse min-w-[640px]">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-wide text-muted-foreground border-b border-border">
                {["Nama", "Jenjang", "Screening", "CBT", "Psikotes", "Konseling"].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.filter((r) => !screeningUsers.has(r.user_id) || !cbtUsers.has(r.user_id) || !psikotesUsers.has(r.user_id) || !refUsers.has(r.user_id)).slice(0, 50).map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium text-foreground whitespace-nowrap">{show(r.full_name, "(Tanpa Nama)")}</td>
                  <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{jenjangBucket(r.education_level)}</td>
                  <td className="py-2 pr-3"><YesNo ok={screeningUsers.has(r.user_id)} /></td>
                  <td className="py-2 pr-3"><YesNo ok={cbtUsers.has(r.user_id)} /></td>
                  <td className="py-2 pr-3"><YesNo ok={psikotesUsers.has(r.user_id)} /></td>
                  <td className="py-2 pr-3"><YesNo ok={refUsers.has(r.user_id)} /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Belum ada data.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardBox>
    </div>
  );

  const KelasTab = (
    <div className="grid gap-2.5 lg:grid-cols-2">
      <CardBox title="Santri Berdasarkan Kelas" icon={School}>
        <div className="h-[240px]">
          {byKelas.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byKelas} margin={{ top: 14, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <RBar dataKey="value" fill="#16A34A" radius={[3, 3, 0, 0]} barSize={20}>
                  <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: "#16A34A" }} />
                </RBar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardBox>
      <CardBox title="Asal Pondok / Sekolah" icon={Building2}>
        <div className="h-[240px]">
          {bySekolah.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySekolah} layout="vertical" margin={{ left: 4, right: 26, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <RBar dataKey="value" fill="#16A34A" radius={[0, 3, 3, 0]} barSize={12}>
                  <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#16A34A" }} />
                </RBar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardBox>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* page header */}
      <div className="flex items-start gap-2.5">
        <span className="h-9 w-9 rounded-[9px] bg-accent/70 flex items-center justify-center shrink-0">
          <Users className="h-[18px] w-[18px] text-primary" strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="font-heading text-[22px] font-bold text-foreground leading-tight">Data Santri</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Kelola dan pantau data santri, layanan, dan perkembangan secara real-time.</p>
        </div>
      </div>

      {/* tabs + filter */}
      <div className="flex items-center gap-3 border-b border-border">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-2 text-[12.5px] whitespace-nowrap border-b-2 -mb-px ${tab === t.key ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto pb-1.5 shrink-0">
          <Select value={jenjangFilter} onValueChange={setJenjangFilter}>
            <SelectTrigger className="h-[34px] w-[150px] rounded-lg text-[12px] bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenjang</SelectItem>
              {["SMA/MA/SMK", "SMP", "SD/MI", "Tidak diisi"].map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {tab === "dashboard" && Dashboard}
      {tab === "list" && ListTab}
      {tab === "layanan" && LayananTab}
      {tab === "kelas" && KelasTab}

      {/* FAB */}
      <button
        onClick={() => setTab("list")}
        aria-label="Tambah / kelola data santri"
        className="fixed bottom-[76px] lg:bottom-6 right-5 h-[50px] w-[50px] rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:brightness-110 z-30"
      >
        <Plus className="h-5 w-5" />
      </button>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle className="font-heading">{show(detail?.full_name, "Detail Santri")}</SheetTitle></SheetHeader>
          {detail && (
            <div className="mt-4 space-y-5">
              {editing ? (
                <div className="space-y-3">
                  {FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-xs">{f.label}</Label>
                      <Input className="h-9 rounded-md" type={f.type ?? "text"} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={saveEdit}>Simpan</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5 mr-1" />Batal</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Identitas & Pendidikan</p>
                    <dl className="grid grid-cols-2 gap-y-2 text-sm">
                      {FIELDS.map((f) => (
                        <div key={f.key} className="contents">
                          <dt className="text-muted-foreground">{f.label}</dt>
                          <dd className="text-foreground">{show(detail[f.key])}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Layanan PEDULI</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-sm">Screening: {screeningUsers.has(detail.user_id) ? "Sudah" : "Belum"}</Badge>
                      <Badge variant="outline" className="rounded-sm">CBT: {cbtUsers.has(detail.user_id) ? "Sudah" : "Belum"}</Badge>
                      <Badge variant="outline" className="rounded-sm">Psikotes: {psikotesUsers.has(detail.user_id) ? "Sudah" : "Belum"}</Badge>
                      <Badge variant="outline" className="rounded-sm">Konseling: {refUsers.has(detail.user_id) ? "Sudah" : "Belum"}</Badge>
                    </div>
                    <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {(psiByUser.get(detail.user_id) ?? []).map((a: any, i: number) => (
                        <li key={i}>{testTitle.get(a.test_id) ?? "Screening"} — {show(a.level, "tanpa level")} · {a.completed_at ? new Date(a.completed_at).toLocaleDateString("id-ID") : "-"}</li>
                      ))}
                    </ul>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit Data</Button>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const Empty = () => <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">Belum ada data</div>;

const DonutRow = ({ data }: { data: { name: string; value: number }[] }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <div className="h-[150px] w-[150px] shrink-0">
        {total === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={1} stroke="none">
                {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <ul className="flex-1 w-full space-y-1.5 min-w-0">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-foreground truncate flex-1">{d.name}</span>
            <span className="text-muted-foreground shrink-0">{d.value} ({total ? ((d.value / total) * 100).toFixed(1) : "0.0"}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SantriCenter;
