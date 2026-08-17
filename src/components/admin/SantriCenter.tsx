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
import { Search, FileSpreadsheet, FileDown, SlidersHorizontal, Pencil, Eye, X } from "lucide-react";

const val = (v: any) => (v === null || v === undefined || String(v).trim() === "" || String(v).trim() === "-" ? null : String(v).trim());
const show = (v: any, f = "Belum diisi") => val(v) ?? f;
const isSMA = (lvl?: string | null) => /sma|ma\b|smk|aliyah/i.test(lvl ?? "");

const KPI = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div className="px-4 py-3 border-r border-border last:border-r-0 flex-1 min-w-[150px]">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-2xl font-heading font-semibold text-foreground leading-tight mt-0.5">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const Bar = ({ label, value, total, tone = "bg-primary" }: { label: string; value: number; total: number; tone?: string }) => {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-foreground truncate pr-2">{label}</span>
        <span className="text-muted-foreground shrink-0 tabular-nums">{value} / {total} · {pct}%</span>
      </div>
      <div className="h-2 rounded-sm bg-muted overflow-hidden">
        <div className={`h-full rounded-sm ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const Panel = ({ title, desc, children, action }: any) => (
  <section className="rounded-lg border border-border bg-card">
    <header className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
      <div>
        <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      {action}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

const YesNo = ({ ok }: { ok: boolean }) => (
  <Badge variant={ok ? "default" : "outline"} className="rounded-sm text-[10px] font-medium">
    {ok ? "Sudah" : "Belum"}
  </Badge>
);

const FIELDS = [
  { key: "full_name", label: "Nama Lengkap" },
  { key: "gender", label: "Jenis Kelamin" },
  { key: "graduation_year", label: "Angkatan", type: "number" },
  { key: "origin", label: "Asal" },
  { key: "education_level", label: "Jenjang" },
  { key: "school_origin", label: "Sekolah / Pesantren" },
  { key: "major", label: "Jurusan" },
  { key: "phone", label: "Telepon" },
  { key: "address", label: "Alamat" },
];

const SantriCenter = () => {
  const qc = useQueryClient();
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
        ids.length ? supabase.from("profiles").select("*").in("user_id", ids).order("created_at", { ascending: false }) : Promise.resolve({ data: [] } as any),
        supabase.from("psikotes_attempts").select("user_id, level, test_id, completed_at"),
        supabase.from("cbt_attempts").select("user_id, percentage, completed_at"),
        supabase.from("counseling_referrals").select("user_id, level, status"),
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

  const rows: any[] = data?.profiles ?? [];
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

  const total = rows.length;
  const attention = useMemo(
    () => rows.filter((r) => (psiByUser.get(r.user_id) ?? []).some((a: any) => /tinggi|berat|sedang/i.test(a.level ?? "")) || refUsers.has(r.user_id)).length,
    [rows, psiByUser, refUsers],
  );

  const smaRows = rows.filter((r) => isSMA(r.education_level));
  const smaScreened = smaRows.filter((r) => screeningUsers.has(r.user_id)).length;
  const smaPct = smaRows.length ? Math.round((smaScreened / smaRows.length) * 100) : 0;

  const screeningLevels = useMemo(() => {
    const bucket = (re: RegExp, labels: string[]) => {
      const counts = labels.map(() => 0);
      Array.from(psiByUser.entries()).forEach(([, atts]) => {
        const a = atts.filter((x: any) => re.test(testTitle.get(x.test_id) ?? "")).slice(-1)[0];
        if (!a) return;
        const idx = labels.findIndex((l) => new RegExp(l.split(" ").slice(-1)[0], "i").test(a.level ?? ""));
        if (idx >= 0) counts[idx] += 1;
      });
      return labels.map((l, i) => ({ label: l, value: counts[i] }));
    };
    return {
      pss: bucket(/pss|stres/i, ["Stress Rendah", "Stress Sedang", "Stress Tinggi"]),
      brs: bucket(/brs|resilien/i, ["Resiliensi Rendah", "Resiliensi Normal", "Resiliensi Tinggi"]),
      srq: bucket(/srq/i, ["Tidak Melewati Batas Interpretasi", "Ada Kemungkinan Gejala"]),
    };
  }, [psiByUser, testTitle]);

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
    Nama: show(r.full_name, ""),
    "Jenis Kelamin": show(r.gender, ""),
    Angkatan: r.graduation_year ?? "",
    Asal: show(r.origin, ""),
    Jenjang: show(r.education_level, ""),
    "Sekolah/Pesantren": show(r.school_origin, ""),
    Screening: screeningUsers.has(r.user_id) ? "Sudah" : "Belum",
    CBT: cbtUsers.has(r.user_id) ? "Sudah" : "Belum",
    Psikotes: psikotesUsers.has(r.user_id) ? "Sudah" : "Belum",
    Konseling: refUsers.has(r.user_id) ? "Sudah" : "Belum",
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl md:text-2xl font-semibold text-foreground">Data Santri</h2>
        <p className="text-sm text-muted-foreground">Kelola dan pantau data santri, layanan, screening, CBT, psikotes, dan konseling secara real-time.</p>
      </div>

      {/* KPI row */}
      <div className="rounded-lg border border-border bg-card flex flex-wrap divide-y md:divide-y-0">
        <KPI label="Total Santri" value={total} />
        <KPI label="Screening" value={`${screeningUsers.size} / ${total}`} sub={`${total ? Math.round((screeningUsers.size / total) * 100) : 0}% peserta`} />
        <KPI label="CBT" value={`${cbtUsers.size} / ${total}`} sub={`${total ? Math.round((cbtUsers.size / total) * 100) : 0}% peserta`} />
        <KPI label="Psikotes" value={`${psikotesUsers.size} / ${total}`} />
        <KPI label="Konseling" value={`${refUsers.size} / ${total}`} />
        <KPI label="Perlu Pendampingan" value={attention} />
      </div>

      {/* analytics */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Partisipasi Layanan Santri" desc="Jumlah peserta unik dibanding total santri terdaftar.">
          <div className="space-y-3">
            <Bar label="Screening" value={screeningUsers.size} total={total} />
            <Bar label="CBT" value={cbtUsers.size} total={total} />
            <Bar label="Psikotes" value={psikotesUsers.size} total={total} />
            <Bar label="Konseling" value={refUsers.size} total={total} />
          </div>
        </Panel>

        <Panel title="Hasil Screening Santri" desc="Ringkasan interpretasi terakhir per peserta (bukan diagnosis).">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { t: "PSS", d: screeningLevels.pss },
              { t: "BRS", d: screeningLevels.brs },
              { t: "SRQ-20", d: screeningLevels.srq },
            ].map((g) => {
              const sum = g.d.reduce((a, b) => a + b.value, 0);
              return (
                <div key={g.t}>
                  <p className="text-xs font-semibold text-foreground mb-2">{g.t}</p>
                  <div className="space-y-2">
                    {g.d.map((it) => (
                      <Bar key={it.label} label={it.label} value={it.value} total={sum} />
                    ))}
                    {sum === 0 && <p className="text-xs text-muted-foreground">Belum ada data.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* target */}
      <Panel title="Skrining Awal Santri SMA/MA/SMK" desc="Target program: 50% santri jenjang SMA/MA/SMK terskrining.">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-muted-foreground mb-3">
          <span>Total: <b className="text-foreground">{smaRows.length}</b></span>
          <span>Sudah screening: <b className="text-foreground">{smaScreened}</b></span>
          <span>Belum screening: <b className="text-foreground">{smaRows.length - smaScreened}</b></span>
          <span>Capaian: <b className="text-foreground">{smaPct}%</b> dari target 50%</span>
        </div>
        <div className="relative h-3 rounded-sm bg-muted overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${smaPct}%` }} />
          <div className="absolute top-0 bottom-0 w-px bg-foreground/60" style={{ left: "50%" }} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">Garis vertikal menandai target 50%.</p>
      </Panel>

      {/* table */}
      <Panel
        title="Data Santri"
        desc={`Menampilkan ${filtered.length} dari ${total} santri terdaftar.`}
        action={
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, asal, sekolah..." className="h-9 pl-8 w-[220px] rounded-md text-sm" />
            </div>
            <Button variant="outline" size="sm" className="rounded-md" onClick={() => setShowFilters((s) => !s)}>
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />Filter
            </Button>
            <Button variant="outline" size="sm" className="rounded-md" disabled={!exportRows.length} onClick={() => exportToExcel(exportRows, "santri-peduli")}>
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Excel
            </Button>
            <Button variant="outline" size="sm" className="rounded-md" disabled={!exportRows.length} onClick={() => exportToPDF(exportRows, "santri-peduli", "Data Santri PEDULI")}>
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

        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                {["Nama", "Jenis Kelamin", "Angkatan", "Asal", "Jenjang", "Sekolah/Pesantren", "Screening", "CBT", "Psikotes", "Konseling", "Pendampingan", "Aksi"].map((h) => (
                  <th key={h} className="py-2 pr-4 font-medium whitespace-nowrap">{h}</th>
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
                    <tr key={r.id} className="border-b border-border/70 hover:bg-accent/30">
                      <td className="py-2.5 pr-4 font-medium text-foreground whitespace-nowrap">{show(r.full_name, "(Tanpa Nama)")}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{show(r.gender, "-")}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{r.graduation_year ?? "-"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{show(r.origin, "-")}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{show(r.education_level, "-")}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{show(r.school_origin, "-")}</td>
                      <td className="py-2.5 pr-4"><YesNo ok={screeningUsers.has(r.user_id)} /></td>
                      <td className="py-2.5 pr-4"><YesNo ok={cbtUsers.has(r.user_id)} /></td>
                      <td className="py-2.5 pr-4"><YesNo ok={psikotesUsers.has(r.user_id)} /></td>
                      <td className="py-2.5 pr-4"><YesNo ok={refUsers.has(r.user_id)} /></td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={need ? "destructive" : "outline"} className="rounded-sm text-[10px]">{need ? "Perlu" : "Normal"}</Badge>
                      </td>
                      <td className="py-2.5 pr-4">
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
      </Panel>

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

export default SantriCenter;
