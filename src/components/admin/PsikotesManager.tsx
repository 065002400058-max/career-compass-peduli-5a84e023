import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import PsikotesJsonImport from "@/components/admin/PsikotesJsonImport";


type Opt = { text: string; score: number };
const defaultOpts = (): Opt[] => [
  { text: "Tidak pernah", score: 0 },
  { text: "Kadang-kadang", score: 1 },
  { text: "Sering", score: 2 },
  { text: "Selalu", score: 3 },
];

export default function PsikotesManager() {
  const qc = useQueryClient();
  const [selectedTest, setSelectedTest] = useState<any>(null);

  const refresh = () =>
    qc.invalidateQueries({
      predicate: (q) => {
        const k = String(q.queryKey[0] ?? "");
        return k.startsWith("admin-psi") || k.startsWith("psi-");
      },
    });

  const { data: cats } = useQuery({
    queryKey: ["admin-psi-cats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("psikotes_categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: tests } = useQuery({
    queryKey: ["admin-psi-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("psikotes_tests")
        .select("*, psikotes_categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: questions } = useQuery({
    queryKey: ["admin-psi-qs", selectedTest?.id],
    queryFn: async () => {
      if (!selectedTest) return [];
      const { data, error } = await supabase
        .from("psikotes_questions")
        .select("*, psikotes_answers(*)")
        .eq("test_id", selectedTest.id)
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedTest,
  });
  const { data: results } = useQuery({
    queryKey: ["admin-psi-results", selectedTest?.id],
    queryFn: async () => {
      if (!selectedTest) return [];
      const { data, error } = await supabase.from("psikotes_results").select("*").eq("test_id", selectedTest.id).order("min_score");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedTest,
  });
  const { data: stats } = useQuery({
    queryKey: ["admin-psi-stats"],
    queryFn: async () => {
      const { count } = await supabase.from("psikotes_attempts").select("id", { count: "exact", head: true });
      return { total: count ?? 0 };
    },
  });

  const [catDlg, setCatDlg] = useState<{ open: boolean; row?: any }>({ open: false });
  const [testDlg, setTestDlg] = useState<{ open: boolean; row?: any }>({ open: false });
  const [qDlg, setQDlg] = useState<{ open: boolean; row?: any }>({ open: false });
  const [resDlg, setResDlg] = useState<{ open: boolean; row?: any }>({ open: false });
  const [delAllDlg, setDelAllDlg] = useState<{ open: boolean; step: 1 | 2; confirmText: string }>({ open: false, step: 1, confirmText: "" });

  const del = async (table: "psikotes_categories" | "psikotes_tests" | "psikotes_questions" | "psikotes_results", id: string, msg: string) => {
    if (!confirm(msg)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Dihapus");
    if ((table === "psikotes_tests" && selectedTest?.id === id) || table === "psikotes_categories") setSelectedTest(null);
    refresh();
  };

  const toggleActive = async (t: any) => {
    const { error } = await supabase.from("psikotes_tests").update({ is_active: !t.is_active }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(!t.is_active ? "Tes diaktifkan" : "Tes dinonaktifkan");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Kategori</p><p className="font-heading text-2xl font-bold">{cats?.length ?? 0}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Tes</p><p className="font-heading text-2xl font-bold">{tests?.length ?? 0}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Attempt</p><p className="font-heading text-2xl font-bold">{stats?.total ?? 0}</p></CardContent></Card>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold">Kategori Screening</h3>
          <Button size="sm" onClick={() => setCatDlg({ open: true })}><Plus className="h-4 w-4 mr-1" />Kategori</Button>
        </div>
        <div className="glass-card rounded-xl divide-y divide-border">
          {(cats ?? []).map((c: any) => (
            <div key={c.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p></div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => setCatDlg({ open: true, row: c })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del("psikotes_categories", c.id, "Hapus kategori? Tes & soal terkait juga terhapus.")}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {(cats ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada kategori.</p>}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-heading font-bold">Tes Screening</h3>
          <div className="flex flex-wrap gap-2">
            <PsikotesJsonImport cats={(cats ?? []) as any} onImported={refresh} />
            <Button size="sm" onClick={() => {
              if (!(cats ?? []).length) return toast.error("Buat kategori terlebih dahulu");
              setTestDlg({ open: true });
            }}><Plus className="h-4 w-4 mr-1" />Tes</Button>
          </div>
        </div>

        <div className="glass-card rounded-xl divide-y divide-border">
          {(tests ?? []).map((t: any) => (
            <div key={t.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.psikotes_categories?.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 mr-2">
                  <Switch checked={!!t.is_active} onCheckedChange={() => toggleActive(t)} />
                  <span className="text-[10px] text-muted-foreground">{t.is_active ? "Aktif" : "Nonaktif"}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelectedTest(t)}>Kelola <ChevronRight className="h-3 w-3 ml-1" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setTestDlg({ open: true, row: t })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del("psikotes_tests", t.id, "Hapus tes beserta soal & template hasilnya?")}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {(tests ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada tes.</p>}
        </div>
      </section>

      {selectedTest && (
        <>
          <section>
            <div className="flex items-center justify-between mb-3 gap-2">
              <h3 className="font-heading font-bold text-sm md:text-base truncate">Pertanyaan — {selectedTest.title}</h3>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={() => setQDlg({ open: true })}><Plus className="h-4 w-4 mr-1" />Pertanyaan</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTest(null)}>Tutup</Button>
              </div>
            </div>
            <div className="space-y-3">
              {(questions ?? []).map((q: any, i: number) => (
                <Card key={q.id} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm"><b>{i + 1}.</b> {q.question_text}</p>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => setQDlg({ open: true, row: q })}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => del("psikotes_questions", q.id, "Hapus pertanyaan ini?")}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                    <ul className="text-xs space-y-1 ml-4">
                      {(q.psikotes_answers ?? []).map((a: any) => (
                        <li key={a.id} className="text-muted-foreground">○ {a.answer_text} <Badge variant="secondary" className="ml-1 text-[10px]">{a.score}</Badge></li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
              {(questions ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada pertanyaan.</p>}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold">Template Hasil & Saran</h3>
              <Button size="sm" onClick={() => setResDlg({ open: true })}><Plus className="h-4 w-4 mr-1" />Hasil</Button>
            </div>
            <div className="glass-card rounded-xl divide-y divide-border">
              {(results ?? []).map((r: any) => (
                <div key={r.id} className="p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Skor {r.min_score}–{r.max_score} <Badge variant="secondary" className="ml-2">{r.level}</Badge></p>
                    <p className="text-xs text-muted-foreground mt-1">{r.conclusion}</p>
                    <p className="text-xs text-primary mt-1 italic">💡 {r.recommendation}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => setResDlg({ open: true, row: r })}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del("psikotes_results", r.id, "Hapus template hasil ini?")}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              {(results ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-6 px-4">Belum ada template hasil.</p>}
            </div>
          </section>
        </>
      )}

      <PsiCatDialog key={`c-${catDlg.row?.id ?? "new"}-${catDlg.open}`} state={catDlg} onClose={() => setCatDlg({ open: false })} onSaved={refresh} />
      <PsiTestDialog key={`t-${testDlg.row?.id ?? "new"}-${testDlg.open}`} state={testDlg} cats={cats ?? []} onClose={() => setTestDlg({ open: false })} onSaved={refresh} />
      {selectedTest && (
        <>
          <PsiQuestionDialog key={`q-${qDlg.row?.id ?? "new"}-${qDlg.open}`} state={qDlg} testId={selectedTest.id} nextIndex={(questions ?? []).length} onClose={() => setQDlg({ open: false })} onSaved={refresh} />
          <PsiResultDialog key={`r-${resDlg.row?.id ?? "new"}-${resDlg.open}`} state={resDlg} testId={selectedTest.id} onClose={() => setResDlg({ open: false })} onSaved={refresh} />
        </>
      )}
    </div>
  );
}

function PsiCatDialog({ state, onClose, onSaved }: { state: { open: boolean; row?: any }; onClose: () => void; onSaved: () => void }) {
  const row = state.row;
  const [name, setName] = useState(row?.name ?? "");
  const [desc, setDesc] = useState(row?.description ?? "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) return toast.error("Nama wajib diisi");
    setBusy(true);
    const payload = { name: name.trim(), description: desc || null };
    const { error } = row
      ? await supabase.from("psikotes_categories").update(payload).eq("id", row.id)
      : await supabase.from("psikotes_categories").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Tersimpan"); onSaved(); onClose();
  };
  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Kategori</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Deskripsi</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PsiTestDialog({ state, cats, onClose, onSaved }: { state: { open: boolean; row?: any }; cats: any[]; onClose: () => void; onSaved: () => void }) {
  const row = state.row;
  const [catId, setCatId] = useState(row?.category_id ?? "");
  const [title, setTitle] = useState(row?.title ?? "");
  const [desc, setDesc] = useState(row?.description ?? "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!catId) return toast.error("Pilih kategori");
    if (!title.trim()) return toast.error("Judul wajib diisi");
    setBusy(true);
    const payload = { category_id: catId, title: title.trim(), description: desc || null };
    const { error } = row
      ? await supabase.from("psikotes_tests").update(payload).eq("id", row.id)
      : await supabase.from("psikotes_tests").insert({ ...payload, is_active: true });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Tersimpan"); onSaved(); onClose();
  };
  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Tes</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Kategori</Label>
            <Select value={catId} onValueChange={setCatId}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Judul</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Deskripsi</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PsiQuestionDialog({ state, testId, nextIndex, onClose, onSaved }: { state: { open: boolean; row?: any }; testId: string; nextIndex: number; onClose: () => void; onSaved: () => void }) {
  const row = state.row;
  const [q, setQ] = useState(row?.question_text ?? "");
  const [opts, setOpts] = useState<Opt[]>(
    row?.psikotes_answers?.length
      ? row.psikotes_answers.map((a: any) => ({ text: a.answer_text, score: a.score }))
      : defaultOpts()
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const filled = opts.filter((o) => o.text.trim());
    if (!q.trim()) return toast.error("Pertanyaan wajib diisi");
    if (filled.length < 2) return toast.error("Minimal 2 pilihan jawaban");
    setBusy(true);
    let questionId = row?.id as string | undefined;
    if (row) {
      const { error } = await supabase.from("psikotes_questions").update({ question_text: q.trim() }).eq("id", row.id);
      if (error) { setBusy(false); return toast.error(error.message); }
      await supabase.from("psikotes_answers").delete().eq("question_id", row.id);
    } else {
      const { data, error } = await supabase
        .from("psikotes_questions")
        .insert({ test_id: testId, question_text: q.trim(), order_index: nextIndex })
        .select("id")
        .single();
      if (error) { setBusy(false); return toast.error(error.message); }
      questionId = data.id;
    }
    const { error: aErr } = await supabase.from("psikotes_answers").insert(
      filled.map((o) => ({ question_id: questionId!, answer_text: o.text.trim(), score: o.score }))
    );
    setBusy(false);
    if (aErr) return toast.error(aErr.message);
    toast.success("Tersimpan"); onSaved(); onClose();
  };

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Pertanyaan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Pertanyaan</Label><Textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3} /></div>
          <div className="space-y-2"><Label>Pilihan Jawaban (skor)</Label>
            {opts.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input className="flex-1" value={o.text} onChange={(e) => { const c = [...opts]; c[i] = { ...c[i], text: e.target.value }; setOpts(c); }} />
                <Input className="w-24" type="number" value={o.score} onChange={(e) => { const c = [...opts]; c[i] = { ...c[i], score: +e.target.value }; setOpts(c); }} />
                {opts.length > 2 && <Button size="icon" variant="ghost" onClick={() => setOpts(opts.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setOpts([...opts, { text: "", score: 0 }])}><Plus className="h-3 w-3 mr-1" />Pilihan</Button>
          </div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PsiResultDialog({ state, testId, onClose, onSaved }: { state: { open: boolean; row?: any }; testId: string; onClose: () => void; onSaved: () => void }) {
  const row = state.row;
  const [min, setMin] = useState(row?.min_score ?? 0);
  const [max, setMax] = useState(row?.max_score ?? 5);
  const [level, setLevel] = useState(row?.level ?? "Ringan");
  const [concl, setConcl] = useState(row?.conclusion ?? "");
  const [rec, setRec] = useState(row?.recommendation ?? "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (Number(max) < Number(min)) return toast.error("Skor maksimum harus >= minimum");
    if (!concl.trim() || !rec.trim()) return toast.error("Kesimpulan & saran wajib diisi");
    setBusy(true);
    const payload = { test_id: testId, min_score: Number(min), max_score: Number(max), level, conclusion: concl.trim(), recommendation: rec.trim() };
    const { error } = row
      ? await supabase.from("psikotes_results").update(payload).eq("id", row.id)
      : await supabase.from("psikotes_results").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Tersimpan"); onSaved(); onClose();
  };
  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Template Hasil</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Min</Label><Input type="number" value={min} onChange={(e) => setMin(+e.target.value)} /></div>
            <div><Label>Max</Label><Input type="number" value={max} onChange={(e) => setMax(+e.target.value)} /></div>
            <div><Label>Level</Label>
              <Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Ringan", "Sedang", "Tinggi", "Rendah"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Kesimpulan</Label><Textarea value={concl} onChange={(e) => setConcl(e.target.value)} /></div>
          <div><Label>Saran Konseling</Label><Textarea value={rec} onChange={(e) => setRec(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
