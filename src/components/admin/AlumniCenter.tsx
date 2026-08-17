import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AlumniCsvImport from "@/components/AlumniCsvImport";
import AlumniAddDialog from "@/components/AlumniAddDialog";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { toast } from "sonner";
import {
  Search, Users, Trash2, FileSpreadsheet, FileDown, SlidersHorizontal, ChevronRight,
  GraduationCap, Briefcase, Building2, MapPin, Globe2, ClipboardCheck, Pencil, X, Calendar,
} from "lucide-react";

export const EMPTY = "Belum diisi";
const NO_TRACER = "Belum mengisi";

const val = (v: any) => (v === null || v === undefined || String(v).trim() === "" || String(v).trim() === "-" ? null : String(v).trim());
const show = (v: any, fallback = EMPTY) => val(v) ?? fallback;

export type AlumniRow = Record<string, any>;

export const hasTracer = (a: AlumniRow) =>
  !!a.tracer_filled_at || !!(val(a.position) || val(a.company) || val(a.job_field) || val(a.further_education) || val(a.work_city));

const workStatus = (a: AlumniRow) => (hasTracer(a) ? show(a.status, EMPTY) : NO_TRACER);
const uniStatus = (a: AlumniRow) => val(a.university_status) ?? (val(a.university) ? "Belum diidentifikasi" : EMPTY);

const uniqSorted = (rows: AlumniRow[], key: string) =>
  Array.from(new Set(rows.map((r) => val(r[key])).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

const initials = (n?: string) => (n || "A").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const FIELDS: { key: string; label: string; type?: string }[] = [
  { key: "name", label: "Nama" },
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
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [fAngkatan, setFAngkatan] = useState("all");
  const [fGender, setFGender] = useState("all");
  const [fJenjang, setFJenjang] = useState("all");
  const [fUniversitas, setFUniversitas] = useState("all");
  const [fUniStatus, setFUniStatus] = useState("all");
  const [fKerja, setFKerja] = useState("all");
  const [onlyNoTracer, setOnlyNoTracer] = useState(false);
  const [detail, setDetail] = useState<AlumniRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: alumni, isLoading } = useQuery({
    queryKey: ["admin-recent-alumni"],
    queryFn: async () =>
      (await supabase.from("alumni").select("*").order("graduation_year", { ascending: false })).data ?? [],
  });

  const rows: AlumniRow[] = alumni ?? [];

  const stats = useMemo(() => {
    const tracer = rows.filter(hasTracer).length;
    const bekerja = rows.filter((a) => hasTracer(a) && /bekerja/i.test(a.status ?? "") && !/belum/i.test(a.status ?? "")).length;
    return { total: rows.length, tracer, noTracer: rows.length - tracer, bekerja };
  }, [rows]);

  const statusBreakdown = useMemo(() => {
    const cats = ["Bekerja", "Belum Bekerja", "Wirausaha", "Melanjutkan Studi"];
    const map = new Map(cats.map((c) => [c, 0]));
    rows.forEach((a) => {
      const s = (val(a.status) ?? "").toLowerCase();
      const key =
        /wirausaha|usaha|bisnis/.test(s) ? "Wirausaha"
        : /studi|kuliah|lanjut/.test(s) ? "Melanjutkan Studi"
        : /belum/.test(s) ? "Belum Bekerja"
        : /kerja/.test(s) ? "Bekerja"
        : null;
      if (key) map.set(key, (map.get(key) ?? 0) + 1);
    });
    return cats.map((c) => ({ name: c, value: map.get(c) ?? 0 }));
  }, [rows]);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((a) => {
      if (onlyNoTracer && hasTracer(a)) return false;
      if (fAngkatan !== "all" && String(a.graduation_year) !== fAngkatan) return false;
      if (fGender !== "all" && val(a.gender) !== fGender) return false;
      if (fJenjang !== "all" && val(a.education_level) !== fJenjang) return false;
      if (fUniversitas !== "all" && val(a.university) !== fUniversitas) return false;
      if (fUniStatus !== "all" && uniStatus(a) !== fUniStatus) return false;
      if (fKerja !== "all" && workStatus(a) !== fKerja) return false;
      if (!q) return true;
      return [a.name, a.graduation_year, a.origin, a.major, a.university, a.status, a.position, a.company, a.job_field, a.education_level]
        .some((v: any) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [rows, search, onlyNoTracer, fAngkatan, fGender, fJenjang, fUniversitas, fUniStatus, fKerja]);

  const exportRows = filtered.map((a) => ({
    Nama: show(a.name, ""),
    "Jenis Kelamin": show(a.gender, ""),
    Angkatan: a.graduation_year ?? "",
    Asal: show(a.origin, ""),
    "Jenjang Pendidikan": show(a.education_level, ""),
    Jurusan: show(a.major, ""),
    Universitas: show(a.university, ""),
    "Status Universitas": show(a.university_status, ""),
    "Status Pekerjaan": show(a.status, ""),
    "Bidang Pekerjaan": show(a.job_field, ""),
    Perusahaan: show(a.company, ""),
    Jabatan: show(a.position, ""),
    "Lokasi Kerja": show(a.work_city, ""),
    Tracer: hasTracer(a) ? "Sudah" : "Belum",
  }));

  const resetFilters = () => {
    setSearch(""); setFAngkatan("all"); setFGender("all"); setFJenjang("all");
    setFUniversitas("all"); setFUniStatus("all"); setFKerja("all"); setOnlyNoTracer(false);
  };

  const openDetail = (a: AlumniRow) => { setDetail(a); setEditing(false); setForm(a); };

  const saveEdit = async () => {
    if (!detail) return;
    const payload: Record<string, any> = {};
    FIELDS.forEach(({ key, type }) => {
      const v = form[key];
      payload[key] = type === "number" ? (v ? parseInt(String(v), 10) : null) : (val(v) ?? null);
    });
    if (!payload.name) return toast.error("Nama wajib diisi");
    if (!payload.graduation_year) return toast.error("Angkatan wajib diisi");
    if (!payload.status) payload.status = detail.status ?? "Belum Bekerja";
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
      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3 mb-4">
        <MiniCard label="Total Alumni" value={stats.total} icon={Users} onClick={() => { resetFilters(); }} />
        <MiniCard label="Tracer Terisi" value={stats.tracer} icon={ClipboardCheck} onClick={() => { resetFilters(); setFKerja("all"); setOnlyNoTracer(false); }} />
        <MiniCard label="Belum Tracer" value={stats.noTracer} icon={Calendar} active={onlyNoTracer} onClick={() => { resetFilters(); setOnlyNoTracer(true); }} />
        <MiniCard label="Bekerja" value={stats.bekerja} icon={Briefcase} onClick={() => { resetFilters(); setFKerja("Bekerja"); }} />
      </div>

      {/* Tracer Study */}
      <div className="rounded-2xl bg-card border border-border p-4 mb-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-heading font-semibold text-foreground text-sm">Tracer Study Alumni</h3>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { resetFilters(); setOnlyNoTracer(true); }}>
            Lihat yang Belum Mengisi
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mb-2">
          Sudah mengisi <span className="text-foreground font-medium">{stats.tracer} alumni</span> · Belum mengisi{" "}
          <span className="text-foreground font-medium">{stats.noTracer} alumni</span> · {tracerPct}%
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${tracerPct}%` }} />
        </div>
      </div>

      {/* Status pekerjaan + Universitas */}
      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm space-y-2.5">
          <h3 className="font-heading font-semibold text-foreground text-sm mb-1">Status Pekerjaan Alumni</h3>
          {statusBreakdown.map((s) => (
            <Bar key={s.name} label={s.name} value={s.value} total={stats.total} />
          ))}
        </div>
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <h3 className="font-heading font-semibold text-foreground text-sm mb-2">Universitas Alumni</h3>
          <div className="flex gap-2 mb-3">
            <Badge variant="outline" className="rounded-full text-[11px]"><MapPin className="h-3 w-3 mr-1" />Dalam Negeri: {uniInfo.dalam}</Badge>
            <Badge variant="outline" className="rounded-full text-[11px]"><Globe2 className="h-3 w-3 mr-1" />Luar Negeri: {uniInfo.luar}</Badge>
          </div>
          {uniInfo.top.length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada data universitas.</p>
          ) : (
            <div className="space-y-2.5">
              {uniInfo.top.map((u) => <Bar key={u.name} label={u.name} value={u.value} total={uniInfo.top[0].value} />)}
            </div>
          )}
        </div>
      </div>

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
          ].map((f) => (
            <Select key={f.ph} value={f.v} onValueChange={f.set}>
              <SelectTrigger className="h-9 rounded-xl bg-card text-xs"><SelectValue placeholder={f.ph} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua {f.ph}</SelectItem>
                {f.opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
        {(onlyNoTracer || search || [fAngkatan, fGender, fJenjang, fUniversitas, fUniStatus, fKerja].some((v) => v !== "all")) && (
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
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center font-heading font-bold text-primary text-sm shrink-0">
                {initials(a.name)}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-heading font-semibold text-foreground text-sm">{show(a.name, "(Tanpa Nama)")}</h4>
                  {val(a.gender) && <Badge variant="outline" className="text-[10px] rounded-full">{a.gender}</Badge>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="text-[10px] rounded-full">Alumni</Badge>
                  {a.created_at && <Badge variant="outline" className="text-[10px] rounded-full">Daftar: {new Date(a.created_at).toLocaleDateString("id-ID")}</Badge>}
                  {!hasTracer(a) && <Badge variant="outline" className="text-[10px] rounded-full text-destructive border-destructive/30">{NO_TRACER}</Badge>}
                </div>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Angkatan {a.graduation_year ?? EMPTY}</span>
                  {val(a.origin) && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {a.origin}</span>}
                  <span className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> {show(a.education_level)}{val(a.major) ? ` · ${a.major}` : ""}</span>
                  {val(a.university) && <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {a.university}</span>}
                  <span className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> {uniStatus(a)}</span>
                  <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> {workStatus(a)}{val(a.company) ? ` — ${a.company}` : ""}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </div>
          ))
        )}
      </div>

      {/* Detail */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setEditing(false); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-heading">{show(detail?.name, "Detail Alumni")}</SheetTitle>
          </SheetHeader>
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
                            Data alumni <strong>{show(detail.name, "-")}</strong> akan dihapus permanen dan tidak dapat dikembalikan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeAlumni(detail.id)}>Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
                        ["Nama", show(detail.name)],
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
                        ["Status Pekerjaan", workStatus(detail)],
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
                        <dd className="text-foreground">{hasTracer(detail) ? "Sudah mengisi" : NO_TRACER}</dd>
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
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AlumniCenter;
