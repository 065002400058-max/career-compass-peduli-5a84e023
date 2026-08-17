import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info, HeartPulse, Users, ChevronRight, Brain } from "lucide-react";
import { detectScreeningKind, interpretScreening, formatScore, DISCLAIMER, type ScreeningKind } from "@/lib/psikotesScoring";

type StatusFilter = "all" | "santri" | "alumni";

interface Row {
  userId: string;
  name: string;
  status: string;
  score: string;
  numericScore: number;
  level: string;
  date: string;
  dateRaw: string;
  testId: string;
  testTitle: string;
  kind: ScreeningKind | null;
}

const idDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("id-ID") : "-");

const ScreeningInsights = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [listDialog, setListDialog] = useState<null | { title: string; rows: Row[] }>(null);
  const [detailUser, setDetailUser] = useState<null | { userId: string; name: string; status: string }>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-screening-insights"],
    queryFn: async () => {
      const [tests, attempts, roles, profiles, referrals, cbt] = await Promise.all([
        supabase.from("psikotes_tests").select("id,title,is_active,psikotes_categories(name)"),
        supabase.from("psikotes_attempts").select("id,user_id,test_id,total_score,level,completed_at,answers").order("completed_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("profiles").select("user_id,full_name"),
        supabase.from("counseling_referrals").select("id,user_id,created_at,status"),
        supabase.from("cbt_attempts").select("id,user_id,percentage,completed_at").order("completed_at", { ascending: false }),
      ]);
      return {
        tests: tests.data ?? [],
        attempts: attempts.data ?? [],
        roles: roles.data ?? [],
        profiles: profiles.data ?? [],
        referrals: referrals.data ?? [],
        cbt: cbt.data ?? [],
      };
    },
  });

  const roleOf = useMemo(() => {
    const m = new Map<string, string>();
    (data?.roles ?? []).forEach((r: any) => {
      if (r.role === "santri" || r.role === "alumni") m.set(r.user_id, r.role);
      else if (!m.has(r.user_id)) m.set(r.user_id, r.role);
    });
    return m;
  }, [data]);

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    (data?.profiles ?? []).forEach((p: any) => m.set(p.user_id, p.full_name || "(Tanpa Nama)"));
    return m;
  }, [data]);

  const referralUsers = useMemo(() => new Set((data?.referrals ?? []).map((r: any) => r.user_id)), [data]);
  const cbtUsers = useMemo(() => new Set((data?.cbt ?? []).map((c: any) => c.user_id)), [data]);

  const eligibleUsers = useMemo(
    () => (data?.roles ?? []).filter((r: any) => r.role === "santri" || r.role === "alumni"),
    [data]
  );
  const targetTotal = useMemo(
    () => eligibleUsers.filter((r: any) => statusFilter === "all" || r.role === statusFilter).length,
    [eligibleUsers, statusFilter]
  );

  /** Baris terbaru per user per tes, dengan skor & kategori dihitung ulang dari jenis tes */
  const rowsByTest = useMemo(() => {
    const map = new Map<string, Row[]>();
    const seen = new Set<string>();
    (data?.tests ?? []).forEach((t: any) => map.set(t.id, []));
    (data?.attempts ?? []).forEach((a: any) => {
      const key = `${a.user_id}|${a.test_id}`;
      if (seen.has(key)) return;
      seen.add(key);
      const test: any = (data?.tests ?? []).find((t: any) => t.id === a.test_id);
      if (!test) return;
      const kind = detectScreeningKind(test.title, test.psikotes_categories?.name);
      const itemCount = Array.isArray(a.answers) ? a.answers.length || 6 : 6;
      const interpreted = interpretScreening(kind, a.total_score ?? 0, itemCount);
      const status = roleOf.get(a.user_id) ?? "santri";
      map.get(a.test_id)!.push({
        userId: a.user_id,
        name: nameOf.get(a.user_id) ?? "(Tanpa Nama)",
        status: status === "alumni" ? "Alumni" : status === "santri" ? "Santri" : status,
        score: interpreted ? interpreted.displayScore : formatScore(kind, a.total_score ?? 0, itemCount),
        numericScore: a.total_score ?? 0,
        level: interpreted?.level ?? a.level ?? "Hasil Screening",
        date: idDate(a.completed_at),
        dateRaw: a.completed_at,
        testId: a.test_id,
        testTitle: test.title,
        kind,
      });
    });
    return map;
  }, [data, roleOf, nameOf]);

  const filterRows = (rows: Row[]) =>
    rows.filter((r) => statusFilter === "all" || r.status.toLowerCase() === statusFilter);

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

  const screeningTests = useMemo(
    () =>
      (data?.tests ?? [])
        .map((t: any) => ({ ...t, kind: detectScreeningKind(t.title, t.psikotes_categories?.name) }))
        .filter((t: any) => !!t.kind),
    [data]
  );

  const attentionGroups = useMemo(
    () =>
      screeningTests.map((t: any) => {
        const rows = filterRows(rowsByTest.get(t.id) ?? []).filter((r) => r.level === ATTENTION[t.kind as ScreeningKind]);
        return { test: t, label: ATTENTION[t.kind as ScreeningKind], rows };
      }),
    [screeningTests, rowsByTest, statusFilter]
  );

  const openList = (title: string, rows: Row[]) => setListDialog({ title, rows });

  const detailData = useMemo(() => {
    if (!detailUser) return null;
    const screening = screeningTests
      .map((t: any) => (rowsByTest.get(t.id) ?? []).find((r) => r.userId === detailUser.userId))
      .filter(Boolean) as Row[];
    const cbtAttempts = (data?.cbt ?? []).filter((c: any) => c.user_id === detailUser.userId);
    const refs = (data?.referrals ?? []).filter((r: any) => r.user_id === detailUser.userId);
    return { screening, cbtAttempts, refs };
  }, [detailUser, screeningTests, rowsByTest, data]);

  if (isLoading) return <div className="rounded-2xl bg-card border border-border p-8 text-center text-muted-foreground">Memuat data screening...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div>
            <h3 className="font-heading font-semibold text-foreground flex items-center gap-2"><HeartPulse className="h-4 w-4 text-primary" /> Layanan Screening</h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5"><Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {DISCLAIMER}</p>
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

      {screeningTests.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-8 text-center text-muted-foreground text-sm">Belum ada tes screening standar (PSS-10 / BRS / SRQ-20).</div>
      )}

      {screeningTests.map((t: any) => {
        const rows = filterRows(rowsByTest.get(t.id) ?? []);
        const participated = rows.length;
        const notYet = Math.max(targetTotal - participated, 0);
        const pct = targetTotal > 0 ? Math.round((participated / targetTotal) * 100) : 0;
        const cats = CATEGORIES[t.kind as ScreeningKind];
        const attentionRows = rows.filter((r) => r.level === ATTENTION[t.kind as ScreeningKind]);
        const sudahKonseling = attentionRows.filter((r) => referralUsers.has(r.userId));
        const belumKonseling = attentionRows.filter((r) => !referralUsers.has(r.userId));
        const sudahCbt = attentionRows.filter((r) => cbtUsers.has(r.userId));
        const belumCbt = attentionRows.filter((r) => !cbtUsers.has(r.userId));

        return (
          <div key={t.id} className="rounded-2xl bg-card border border-border p-4 md:p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h4 className="font-heading font-semibold text-foreground">{t.title}</h4>
                <p className="text-xs text-muted-foreground">{t.psikotes_categories?.name}</p>
              </div>
              <div className="flex gap-2 text-xs flex-wrap">
                <Badge variant="secondary" className="rounded-full">Sudah mengikuti: {participated}</Badge>
                <Badge variant="outline" className="rounded-full">Belum mengikuti: {notYet}</Badge>
                <Badge className="rounded-full">{pct}% capaian</Badge>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {cats.map((c) => {
                const catRows = rows.filter((r) => r.level === c);
                return (
                  <button
                    key={c}
                    onClick={() => openList(`${t.title} — ${c}`, catRows)}
                    className="rounded-xl border border-border bg-muted/30 p-3 text-left hover:bg-accent/40 transition-colors"
                  >
                    <p className="text-xs text-muted-foreground">{c}</p>
                    <p className="font-heading text-xl font-bold text-foreground">{catRows.length} <span className="text-xs font-normal text-muted-foreground">orang</span></p>
                    <span className="text-[11px] text-primary flex items-center gap-1 mt-1">Lihat Daftar <ChevronRight className="h-3 w-3" /></span>
                  </button>
                );
              })}
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5"><HeartPulse className="h-3.5 w-3.5 text-primary" /> Pendampingan — {ATTENTION[t.kind as ScreeningKind]} ({attentionRows.length})</p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => openList(`Sudah mengikuti konseling — ${ATTENTION[t.kind as ScreeningKind]}`, sudahKonseling)}>Sudah konseling: {sudahKonseling.length}</Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => openList(`Belum mengikuti konseling — ${ATTENTION[t.kind as ScreeningKind]}`, belumKonseling)}>Belum konseling: {belumKonseling.length}</Button>
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-primary" /> Aktivitas Tes CBT</p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => openList(`Sudah mengikuti CBT — ${ATTENTION[t.kind as ScreeningKind]}`, sudahCbt)}>Sudah CBT: {sudahCbt.length}</Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => openList(`Belum mengikuti CBT — ${ATTENTION[t.kind as ScreeningKind]}`, belumCbt)}>Belum CBT: {belumCbt.length}</Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Insight */}
      <div className="rounded-2xl bg-card border border-border p-4 md:p-5 shadow-sm">
        <h3 className="font-heading font-semibold text-foreground">Perlu Perhatian Lebih Lanjut</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-3">Pengguna dengan hasil screening yang dapat dipertimbangkan untuk mendapatkan pendampingan.</p>
        <div className="space-y-2">
          {attentionGroups.every((g: any) => g.rows.length === 0) && (
            <p className="text-sm text-muted-foreground">Belum ada pengguna pada kategori ini.</p>
          )}
          {attentionGroups.filter((g: any) => g.rows.length > 0).map((g: any) => (
            <div key={g.test.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-sm text-foreground"><b>{g.rows.length}</b> pengguna — {g.label} <span className="text-muted-foreground text-xs">({g.test.title})</span></p>
              <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs shrink-0" onClick={() => openList(`${g.test.title} — ${g.label}`, g.rows)}>Lihat Daftar</Button>
            </div>
          ))}
        </div>
      </div>

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
                    <TableHead>Skor</TableHead>
                    <TableHead>Hasil</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listDialog?.rows.map((r) => (
                    <TableRow key={`${r.userId}-${r.testId}`} className="cursor-pointer" onClick={() => { setDetailUser({ userId: r.userId, name: r.name, status: r.status }); setListDialog(null); }}>
                      <TableCell className="font-medium text-primary underline-offset-2 hover:underline">{r.name}</TableCell>
                      <TableCell><Badge variant="outline" className="rounded-full text-[10px]">{r.status}</Badge></TableCell>
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
                <p className="font-heading font-semibold text-foreground">{detailUser.name}</p>
                <Badge variant="secondary" className="rounded-full text-[10px] mt-1">{detailUser.status}</Badge>
              </div>

              <div className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-foreground mb-2">Riwayat Screening</p>
                {detailData.screening.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum mengikuti screening.</p>
                ) : (
                  <div className="space-y-2">
                    {detailData.screening.map((s) => (
                      <div key={s.testId} className="text-xs text-muted-foreground">
                        <b className="text-foreground">{s.testTitle}</b> — Skor: {s.score} · Hasil: {s.level} · {s.date}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-sm font-medium text-foreground mb-1">Tes CBT</p>
                  <p className="text-xs text-muted-foreground">
                    {detailData.cbtAttempts.length === 0 ? "Belum mengikuti" : `Pernah mengikuti · ${detailData.cbtAttempts.length} attempt · Skor terakhir: ${Number(detailData.cbtAttempts[0].percentage ?? 0).toFixed(0)}%`}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-sm font-medium text-foreground mb-1">Konseling</p>
                  <p className="text-xs text-muted-foreground">
                    {detailData.refs.length === 0 ? "Belum mengikuti konseling" : `Pernah · ${detailData.refs.length} sesi · Terakhir: ${idDate(detailData.refs[0].created_at)}`}
                  </p>
                </div>
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
