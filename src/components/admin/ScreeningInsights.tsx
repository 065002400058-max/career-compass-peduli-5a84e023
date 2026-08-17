import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info, HeartPulse, Users, ChevronRight, Brain, TrendingUp, GraduationCap, AlertTriangle } from "lucide-react";
import { detectScreeningKind, interpretScreening, formatScore, DISCLAIMER, type ScreeningKind } from "@/lib/psikotesScoring";

type StatusFilter = "all" | "santri" | "alumni";
type UserStatus = "santri" | "alumni" | "unknown";

const STATUS_LABEL: Record<UserStatus, string> = {
  santri: "SANTRI",
  alumni: "ALUMNI",
  unknown: "Status belum teridentifikasi",
};

const ALUMNI_TARGET = 400;
const ALUMNI_BASELINE = 281;

interface Row {
  userId: string;
  name: string;
  status: UserStatus;
  meta: string;
  score: string;
  level: string;
  date: string;
  testId: string;
  testTitle: string;
  attempts: number;
}

const idDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("id-ID") : "-");

const StatusBadge = ({ status }: { status: UserStatus }) => (
  <Badge
    variant={status === "unknown" ? "outline" : status === "alumni" ? "secondary" : "default"}
    className="rounded-full text-[10px] whitespace-nowrap"
  >
    {STATUS_LABEL[status]}
  </Badge>
);

/** Kartu angka dengan pecahan Santri / Alumni yang bisa diklik */
const SplitStat = ({
  label,
  icon: Icon,
  total,
  santri,
  alumni,
  unknown,
  santriBase,
  alumniBase,
  onOpen,
}: {
  label: string;
  icon?: any;
  total: number;
  santri: Row[] | number;
  alumni: Row[] | number;
  unknown?: Row[] | number;
  santriBase?: number;
  alumniBase?: number;
  onOpen?: (which: "all" | "santri" | "alumni" | "unknown") => void;
}) => {
  const n = (v: Row[] | number | undefined) => (Array.isArray(v) ? v.length : v ?? 0);
  const pct = (v: number, base?: number) => (base && base > 0 ? ` (${Math.round((v / base) * 100)}%)` : "");
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary" />} {label}
      </p>
      <button
        type="button"
        onClick={() => onOpen?.("all")}
        className="font-heading text-xl font-bold text-foreground hover:text-primary transition-colors"
      >
        {total} <span className="text-xs font-normal text-muted-foreground">orang</span>
      </button>
      <div className="mt-1.5 space-y-1">
        <button
          type="button"
          onClick={() => onOpen?.("santri")}
          className="w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          <span>Santri</span>
          <span className="font-medium">{n(santri)}{pct(n(santri), santriBase)} <ChevronRight className="inline h-3 w-3" /></span>
        </button>
        <button
          type="button"
          onClick={() => onOpen?.("alumni")}
          className="w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          <span>Alumni</span>
          <span className="font-medium">{n(alumni)}{pct(n(alumni), alumniBase)} <ChevronRight className="inline h-3 w-3" /></span>
        </button>
        {n(unknown) > 0 && (
          <button
            type="button"
            onClick={() => onOpen?.("unknown")}
            className="w-full flex items-center justify-between text-[11px] text-amber-600 hover:underline"
          >
            <span>Belum teridentifikasi</span>
            <span className="font-medium">{n(unknown)}</span>
          </button>
        )}
      </div>
    </div>
  );
};

const ScreeningInsights = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [listDialog, setListDialog] = useState<null | { title: string; rows: Row[]; kind?: "screening" | "cbt" | "counseling" }>(null);
  const [detailUser, setDetailUser] = useState<null | { userId: string; name: string; status: UserStatus }>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-screening-insights"],
    queryFn: async () => {
      const [tests, attempts, roles, profiles, referrals, cbt, cbtTests] = await Promise.all([
        supabase.from("psikotes_tests").select("id,title,is_active,psikotes_categories(name)"),
        supabase.from("psikotes_attempts").select("id,user_id,test_id,total_score,level,completed_at,answers").order("completed_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("profiles").select("user_id,full_name,education_level,school_origin,university,major,graduation_year"),
        supabase.from("counseling_referrals").select("id,user_id,user_name,created_at,status,level").order("created_at", { ascending: false }),
        supabase.from("cbt_attempts").select("id,user_id,test_id,total_score,max_score,percentage,passed,completed_at").order("completed_at", { ascending: false }),
        supabase.from("cbt_tests").select("id,title"),
      ]);
      return {
        tests: tests.data ?? [],
        attempts: attempts.data ?? [],
        roles: roles.data ?? [],
        profiles: profiles.data ?? [],
        referrals: referrals.data ?? [],
        cbt: cbt.data ?? [],
        cbtTests: cbtTests.data ?? [],
      };
    },
  });

  /** Status pengguna berdasarkan relasi user_roles (bukan nama) */
  const statusOf = useMemo(() => {
    const m = new Map<string, UserStatus>();
    (data?.roles ?? []).forEach((r: any) => {
      if (r.role === "santri" || r.role === "alumni") m.set(r.user_id, r.role);
    });
    return (userId: string): UserStatus => m.get(userId) ?? "unknown";
  }, [data]);

  const profileOf = useMemo(() => {
    const m = new Map<string, any>();
    (data?.profiles ?? []).forEach((p: any) => m.set(p.user_id, p));
    return m;
  }, [data]);

  const nameOf = (userId: string, fallback?: string) =>
    profileOf.get(userId)?.full_name || fallback || "(Tanpa Nama)";

  const metaOf = (userId: string) => {
    const p = profileOf.get(userId);
    if (!p) return "-";
    return [p.education_level, p.major, p.university || p.school_origin, p.graduation_year ? `Angkatan ${p.graduation_year}` : null]
      .filter(Boolean)
      .join(" · ") || "-";
  };

  const isSma = (userId: string) => {
    const lvl = String(profileOf.get(userId)?.education_level ?? "").toLowerCase();
    return lvl.includes("sma") || lvl.includes("ma ") || lvl === "ma" || lvl.includes("aliyah") || lvl.includes("smk");
  };

  const byStatus = (rows: Row[], s: UserStatus) => rows.filter((r) => r.status === s);
  const applyFilter = (rows: Row[]) => (statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter));

  /** Populasi pengguna terdaftar */
  const population = useMemo(() => {
    const santri: string[] = [];
    const alumni: string[] = [];
    (data?.roles ?? []).forEach((r: any) => {
      if (r.role === "santri") santri.push(r.user_id);
      else if (r.role === "alumni") alumni.push(r.user_id);
    });
    return {
      santri: [...new Set(santri)],
      alumni: [...new Set(alumni)],
      santriSma: [...new Set(santri)].filter(isSma),
    };
  }, [data, profileOf]);

  /** Screening: baris terbaru per user per tes + jumlah attempt */
  const rowsByTest = useMemo(() => {
    const map = new Map<string, Row[]>();
    const attemptCount = new Map<string, number>();
    (data?.tests ?? []).forEach((t: any) => map.set(t.id, []));
    (data?.attempts ?? []).forEach((a: any) => {
      const key = `${a.user_id}|${a.test_id}`;
      attemptCount.set(key, (attemptCount.get(key) ?? 0) + 1);
    });
    const seen = new Set<string>();
    (data?.attempts ?? []).forEach((a: any) => {
      const key = `${a.user_id}|${a.test_id}`;
      if (seen.has(key)) return;
      seen.add(key);
      const test: any = (data?.tests ?? []).find((t: any) => t.id === a.test_id);
      if (!test) return;
      const kind = detectScreeningKind(test.title, test.psikotes_categories?.name);
      const itemCount = Array.isArray(a.answers) ? a.answers.length || 6 : 6;
      const interpreted = interpretScreening(kind, a.total_score ?? 0, itemCount);
      map.get(a.test_id)!.push({
        userId: a.user_id,
        name: nameOf(a.user_id),
        status: statusOf(a.user_id),
        meta: metaOf(a.user_id),
        score: interpreted ? interpreted.displayScore : formatScore(kind, a.total_score ?? 0, itemCount),
        level: interpreted?.level ?? a.level ?? "Hasil Screening",
        date: idDate(a.completed_at),
        testId: a.test_id,
        testTitle: test.title,
        attempts: attemptCount.get(key) ?? 1,
      });
    });
    return map;
  }, [data, statusOf, profileOf]);

  const screeningTests = useMemo(
    () =>
      (data?.tests ?? [])
        .map((t: any) => ({ ...t, kind: detectScreeningKind(t.title, t.psikotes_categories?.name) }))
        .filter((t: any) => !!t.kind),
    [data]
  );

  const CATEGORIES: Record<ScreeningKind, string[]> = {
    pss10: ["Tingkat Stres Rendah", "Tingkat Stres Sedang", "Tingkat Stres Tinggi"],
    brs: ["Resiliensi Rendah", "Resiliensi Normal", "Resiliensi Tinggi"],
    srq20: ["Tidak melewati batas interpretasi", "Ada kemungkinan gejala cemas/depresi"],
  };

  const ATTENTION: Record<ScreeningKind, string> = {
    pss10: "Tingkat Stres Tinggi",
    brs: "Resiliensi Rendah",
    srq20: "Ada kemungkinan gejala cemas/depresi",
  };

  /** Semua baris screening (untuk ringkasan lintas tes) */
  const allScreeningRows = useMemo(() => {
    const out: Row[] = [];
    screeningTests.forEach((t: any) => out.push(...(rowsByTest.get(t.id) ?? [])));
    return out;
  }, [screeningTests, rowsByTest]);

  const uniqueUsers = (rows: Row[]) => {
    const seen = new Set<string>();
    return rows.filter((r) => (seen.has(r.userId) ? false : (seen.add(r.userId), true)));
  };

  /** CBT rows: terbaru per user per tes */
  const cbtRows = useMemo(() => {
    const titleOf = new Map((data?.cbtTests ?? []).map((t: any) => [t.id, t.title]));
    const attemptCount = new Map<string, number>();
    (data?.cbt ?? []).forEach((c: any) => {
      const k = `${c.user_id}|${c.test_id}`;
      attemptCount.set(k, (attemptCount.get(k) ?? 0) + 1);
    });
    const seen = new Set<string>();
    const rows: Row[] = [];
    (data?.cbt ?? []).forEach((c: any) => {
      const k = `${c.user_id}|${c.test_id}`;
      if (seen.has(k)) return;
      seen.add(k);
      rows.push({
        userId: c.user_id,
        name: nameOf(c.user_id),
        status: statusOf(c.user_id),
        meta: metaOf(c.user_id),
        score: `${c.total_score ?? 0}/${c.max_score ?? 0} (${Number(c.percentage ?? 0).toFixed(0)}%)`,
        level: c.passed ? "Lulus" : "Belum Lulus",
        date: idDate(c.completed_at),
        testId: c.test_id,
        testTitle: (titleOf.get(c.test_id) as string) ?? "Tes CBT",
        attempts: attemptCount.get(k) ?? 1,
      });
    });
    return rows;
  }, [data, statusOf, profileOf]);

  /** Konseling: agregasi per user */
  const counselingRows = useMemo(() => {
    const grouped = new Map<string, any[]>();
    (data?.referrals ?? []).forEach((r: any) => {
      if (!grouped.has(r.user_id)) grouped.set(r.user_id, []);
      grouped.get(r.user_id)!.push(r);
    });
    const rows: Row[] = [];
    grouped.forEach((refs, userId) => {
      rows.push({
        userId,
        name: nameOf(userId, refs[0]?.user_name),
        status: statusOf(userId),
        meta: metaOf(userId),
        score: `${refs.length} sesi`,
        level: refs[0]?.status ?? "-",
        date: idDate(refs[0]?.created_at),
        testId: "counseling",
        testTitle: "Konseling",
        attempts: refs.length,
      });
    });
    return rows;
  }, [data, statusOf, profileOf]);

  const referralUsers = useMemo(() => new Set(counselingRows.map((r) => r.userId)), [counselingRows]);
  const cbtUsers = useMemo(() => new Set(cbtRows.map((r) => r.userId)), [cbtRows]);

  const openList = (title: string, rows: Row[], kind: "screening" | "cbt" | "counseling" = "screening") =>
    setListDialog({ title, rows: applyFilter(rows), kind });

  const openSplit = (title: string, rows: Row[], which: "all" | "santri" | "alumni" | "unknown", kind: "screening" | "cbt" | "counseling" = "screening") => {
    const sel = which === "all" ? rows : rows.filter((r) => r.status === which);
    setListDialog({ title: `${title}${which === "all" ? "" : ` — ${STATUS_LABEL[which as UserStatus]}`}`, rows: applyFilter(sel), kind });
  };

  const detailData = useMemo(() => {
    if (!detailUser) return null;
    const screening = allScreeningRows.filter((r) => r.userId === detailUser.userId);
    const cbt = cbtRows.filter((r) => r.userId === detailUser.userId);
    const refs = (data?.referrals ?? []).filter((r: any) => r.user_id === detailUser.userId);
    return { screening, cbt, refs, profile: profileOf.get(detailUser.userId) };
  }, [detailUser, allScreeningRows, cbtRows, data, profileOf]);

  if (isLoading)
    return <div className="rounded-2xl bg-card border border-border p-8 text-center text-muted-foreground">Memuat data screening...</div>;

  const screeningUnique = applyFilter(uniqueUsers(allScreeningRows));
  const cbtUnique = applyFilter(uniqueUsers(cbtRows));
  const counselingUnique = applyFilter(counselingRows);
  const totalAttemptsScreening = (data?.attempts ?? []).filter((a: any) => applyFilter([{ status: statusOf(a.user_id) } as Row]).length > 0).length;
  const totalAttemptsCbt = (data?.cbt ?? []).filter((c: any) => applyFilter([{ status: statusOf(c.user_id) } as Row]).length > 0).length;

  // Indikator capaian program
  const smaScreened = [...new Set(allScreeningRows.filter((r) => r.status === "santri" && isSma(r.userId)).map((r) => r.userId))];
  const smaPct = population.santriSma.length > 0 ? Math.round((smaScreened.length / population.santriSma.length) * 100) : 0;
  const alumniCount = population.alumni.length;
  const alumniPct = Math.round((Math.max(alumniCount, ALUMNI_BASELINE) / ALUMNI_TARGET) * 100);

  return (
    <div className="space-y-4">
      {/* Filter global */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div>
            <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-primary" /> Layanan & Hasil Pengguna
            </h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {DISCLAIMER}
            </p>
          </div>
          <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
            {([["all", "Semua"], ["santri", "Santri"], ["alumni", "Alumni"]] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setStatusFilter(v as StatusFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === v ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ringkasan lintas layanan */}
      <div className="rounded-2xl bg-card border border-border p-4 md:p-5 shadow-sm space-y-3">
        <h4 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Ringkasan Pengguna & Layanan
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Jumlah pengguna dihitung unik per User ID. Jumlah attempt ditampilkan terpisah.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" /> Total Pengguna Terdaftar</p>
            <p className="font-heading text-xl font-bold text-foreground">{population.santri.length + population.alumni.length}</p>
            <div className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
              <div className="flex justify-between"><span>Santri</span><span className="font-medium">{population.santri.length}</span></div>
              <div className="flex justify-between"><span>Alumni</span><span className="font-medium">{population.alumni.length}</span></div>
            </div>
          </div>
          <SplitStat
            label="Screening (Mental)"
            icon={HeartPulse}
            total={screeningUnique.length}
            santri={byStatus(screeningUnique, "santri")}
            alumni={byStatus(screeningUnique, "alumni")}
            unknown={byStatus(screeningUnique, "unknown")}
            santriBase={population.santri.length}
            alumniBase={population.alumni.length}
            onOpen={(w) => openSplit("Peserta Screening", uniqueUsers(allScreeningRows), w)}
          />
          <SplitStat
            label="Tes CBT"
            icon={Brain}
            total={cbtUnique.length}
            santri={byStatus(cbtUnique, "santri")}
            alumni={byStatus(cbtUnique, "alumni")}
            unknown={byStatus(cbtUnique, "unknown")}
            santriBase={population.santri.length}
            alumniBase={population.alumni.length}
            onOpen={(w) => openSplit("Peserta Tes CBT", uniqueUsers(cbtRows), w, "cbt")}
          />
          <SplitStat
            label="Konseling"
            icon={Users}
            total={counselingUnique.length}
            santri={byStatus(counselingUnique, "santri")}
            alumni={byStatus(counselingUnique, "alumni")}
            unknown={byStatus(counselingUnique, "unknown")}
            santriBase={population.santri.length}
            alumniBase={population.alumni.length}
            onOpen={(w) => openSplit("Peserta Konseling", counselingRows, w, "counseling")}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-border p-3 text-muted-foreground">
            Peserta Screening: <b className="text-foreground">{screeningUnique.length} orang</b> · Total Attempt: <b className="text-foreground">{totalAttemptsScreening} kali</b>
          </div>
          <div className="rounded-xl border border-border p-3 text-muted-foreground">
            Peserta CBT: <b className="text-foreground">{cbtUnique.length} orang</b> · Total Attempt: <b className="text-foreground">{totalAttemptsCbt} kali</b>
          </div>
        </div>
      </div>

      {/* Indikator capaian program */}
      <div className="rounded-2xl bg-card border border-border p-4 md:p-5 shadow-sm space-y-3">
        <h4 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" /> Indikator Capaian Program
        </h4>
        <div className="grid sm:grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Skrining Awal Santri SMA (hanya status Santri, jenjang SMA/MA/SMK)</p>
            <p className="font-heading text-xl font-bold text-foreground">{smaPct}%</p>
            <button
              type="button"
              onClick={() => setListDialog({ title: "Santri SMA yang sudah screening", rows: allScreeningRows.filter((r) => r.status === "santri" && isSma(r.userId)), kind: "screening" })}
              className="text-[11px] text-primary hover:underline"
            >
              {smaScreened.length} / {population.santriSma.length} santri SMA · Lihat Daftar
            </button>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Data Alumni (hanya status Alumni) — target {ALUMNI_TARGET}</p>
            <p className="font-heading text-xl font-bold text-foreground">{alumniPct}%</p>
            <p className="text-[11px] text-muted-foreground">Data awal {ALUMNI_BASELINE} · alumni terdaftar {alumniCount}</p>
          </div>
        </div>
      </div>

      {screeningTests.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">
          Belum ada tes screening standar (PSS-10 / BRS / SRQ-20).
        </div>
      )}

      {/* Per tes screening */}
      {screeningTests.map((t: any) => {
        const all = rowsByTest.get(t.id) ?? [];
        const rows = applyFilter(all);
        const cats = CATEGORIES[t.kind as ScreeningKind];
        const attentionRows = rows.filter((r) => r.level === ATTENTION[t.kind as ScreeningKind]);
        const sudahKonseling = attentionRows.filter((r) => referralUsers.has(r.userId));
        const belumKonseling = attentionRows.filter((r) => !referralUsers.has(r.userId));
        const sudahCbt = attentionRows.filter((r) => cbtUsers.has(r.userId));
        const belumCbt = attentionRows.filter((r) => !cbtUsers.has(r.userId));
        const attemptTotal = (data?.attempts ?? []).filter(
          (a: any) => a.test_id === t.id && (statusFilter === "all" || statusOf(a.user_id) === statusFilter)
        ).length;

        return (
          <div key={t.id} className="rounded-2xl bg-card border border-border p-4 md:p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h4 className="font-heading font-semibold text-foreground">{t.title}</h4>
                <p className="text-xs text-muted-foreground">{t.psikotes_categories?.name}</p>
              </div>
              <div className="flex gap-2 text-xs flex-wrap">
                <Badge variant="secondary" className="rounded-full">Peserta: {rows.length} orang</Badge>
                <Badge variant="outline" className="rounded-full">Total attempt: {attemptTotal} kali</Badge>
                <Badge className="rounded-full">Santri {byStatus(rows, "santri").length} · Alumni {byStatus(rows, "alumni").length}</Badge>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {cats.map((c) => {
                const catAll = all.filter((r) => r.level === c);
                const catRows = applyFilter(catAll);
                const santriBase = byStatus(applyFilter(all), "santri").length;
                const alumniBase = byStatus(applyFilter(all), "alumni").length;
                return (
                  <SplitStat
                    key={c}
                    label={c}
                    total={catRows.length}
                    santri={byStatus(catRows, "santri")}
                    alumni={byStatus(catRows, "alumni")}
                    unknown={byStatus(catRows, "unknown")}
                    santriBase={santriBase}
                    alumniBase={alumniBase}
                    onOpen={(w) => openSplit(`${t.title} — ${c}`, catAll, w)}
                  />
                );
              })}
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <HeartPulse className="h-3.5 w-3.5 text-primary" /> Pendampingan — {ATTENTION[t.kind as ScreeningKind]} ({attentionRows.length})
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => openList(`Sudah mengikuti konseling — ${ATTENTION[t.kind as ScreeningKind]}`, sudahKonseling)}>Sudah konseling: {sudahKonseling.length}</Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => openList(`Belum mengikuti konseling — ${ATTENTION[t.kind as ScreeningKind]}`, belumKonseling)}>Belum konseling: {belumKonseling.length}</Button>
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-primary" /> Aktivitas Tes CBT</p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => openList(`Sudah mengikuti CBT — ${ATTENTION[t.kind as ScreeningKind]}`, sudahCbt, "cbt")}>Sudah CBT: {sudahCbt.length}</Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => openList(`Belum mengikuti CBT — ${ATTENTION[t.kind as ScreeningKind]}`, belumCbt)}>Belum CBT: {belumCbt.length}</Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Hasil CBT */}
      <div className="rounded-2xl bg-card border border-border p-4 md:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="font-heading font-semibold text-foreground flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Hasil Tes CBT</h4>
          <Badge variant="outline" className="rounded-full text-xs">Santri {byStatus(cbtUnique, "santri").length} · Alumni {byStatus(cbtUnique, "alumni").length}</Badge>
        </div>
        {applyFilter(cbtRows).length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada hasil CBT untuk filter ini.</p>
        ) : (
          <div className="max-h-[45vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tes CBT</TableHead>
                  <TableHead>Skor</TableHead>
                  <TableHead>Hasil</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applyFilter(cbtRows).map((r) => (
                  <TableRow key={`${r.userId}-${r.testId}`} className="cursor-pointer" onClick={() => setDetailUser({ userId: r.userId, name: r.name, status: r.status })}>
                    <TableCell className="font-medium text-primary underline-offset-2 hover:underline">{r.name}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-xs">{r.testTitle}</TableCell>
                    <TableCell className="text-xs">{r.score}</TableCell>
                    <TableCell className="text-xs">{r.level}</TableCell>
                    <TableCell className="text-xs">{r.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Data Konseling */}
      <div className="rounded-2xl bg-card border border-border p-4 md:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="font-heading font-semibold text-foreground flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Data Konseling</h4>
          <Badge variant="outline" className="rounded-full text-xs">Santri {byStatus(counselingUnique, "santri").length} · Alumni {byStatus(counselingUnique, "alumni").length}</Badge>
        </div>
        {counselingUnique.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data konseling untuk filter ini.</p>
        ) : (
          <div className="max-h-[45vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Layanan</TableHead>
                  <TableHead>Jumlah Sesi</TableHead>
                  <TableHead>Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counselingUnique.map((r) => (
                  <TableRow key={r.userId} className="cursor-pointer" onClick={() => setDetailUser({ userId: r.userId, name: r.name, status: r.status })}>
                    <TableCell className="font-medium text-primary underline-offset-2 hover:underline">{r.name}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-xs">Konseling</TableCell>
                    <TableCell className="text-xs">{r.attempts}</TableCell>
                    <TableCell className="text-xs">{r.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Validasi data */}
      {(() => {
        const unknownRows = uniqueUsers([...allScreeningRows, ...cbtRows, ...counselingRows]).filter((r) => r.status === "unknown");
        if (unknownRows.length === 0) return null;
        return (
          <div className="rounded-2xl bg-card border border-amber-500/40 p-4 shadow-sm">
            <h4 className="font-heading font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Status Belum Teridentifikasi
            </h4>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              {unknownRows.length} pengguna belum memiliki relasi status (Santri/Alumni) sehingga tidak dihitung pada statistik Santri/Alumni.
            </p>
            <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => setListDialog({ title: "Status belum teridentifikasi", rows: unknownRows })}>
              Lihat Daftar
            </Button>
          </div>
        );
      })()}

      {/* Dialog daftar */}
      <Dialog open={!!listDialog} onOpenChange={(o) => !o && setListDialog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base pr-6">{listDialog?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5"><Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {DISCLAIMER}</p>
          <div className="max-h-[60vh] overflow-auto">
            {(listDialog?.rows.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Tidak ada pengguna pada kategori ini.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Akademik</TableHead>
                    <TableHead>Skor</TableHead>
                    <TableHead>Hasil</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listDialog?.rows.map((r) => (
                    <TableRow key={`${r.userId}-${r.testId}`} className="cursor-pointer" onClick={() => { setDetailUser({ userId: r.userId, name: r.name, status: r.status }); setListDialog(null); }}>
                      <TableCell className="font-medium text-primary underline-offset-2 hover:underline">{r.name}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">{r.meta}</TableCell>
                      <TableCell>{r.score}</TableCell>
                      <TableCell className="text-xs">{r.level}</TableCell>
                      <TableCell className="text-xs">{r.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog detail pengguna */}
      <Dialog open={!!detailUser} onOpenChange={(o) => !o && setDetailUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base pr-6">Detail Pengguna</DialogTitle>
          </DialogHeader>
          {detailUser && detailData && (
            <div className="space-y-4 max-h-[65vh] overflow-auto">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Profil</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-heading font-semibold text-foreground">{detailUser.name}</p>
                  <StatusBadge status={detailUser.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{metaOf(detailUser.userId)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">User ID: {detailUser.userId}</p>
              </div>

              <div className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-foreground mb-2">Riwayat Screening</p>
                {detailData.screening.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum mengikuti screening.</p>
                ) : (
                  <div className="space-y-2">
                    {detailData.screening.map((s) => (
                      <div key={s.testId} className="text-xs text-muted-foreground">
                        <b className="text-foreground">{s.testTitle}</b> — Skor: {s.score} · Hasil: {s.level} · {s.attempts} attempt · {s.date}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-foreground mb-2">Riwayat Tes CBT</p>
                {detailData.cbt.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum mengikuti tes CBT.</p>
                ) : (
                  <div className="space-y-2">
                    {detailData.cbt.map((c) => (
                      <div key={c.testId} className="text-xs text-muted-foreground">
                        <b className="text-foreground">{c.testTitle}</b> — Skor: {c.score} · {c.level} · {c.attempts} attempt · {c.date}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-foreground mb-2">Konseling</p>
                {detailData.refs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum mengikuti konseling.</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{detailData.refs.length} sesi · Terakhir: {idDate(detailData.refs[0].created_at)}</p>
                    {detailData.refs.map((r: any) => (
                      <div key={r.id} className="text-xs text-muted-foreground">• {idDate(r.created_at)} — {r.level ?? "-"} · status: {r.status}</div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground flex items-start gap-1.5"><Users className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {DISCLAIMER}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScreeningInsights;
