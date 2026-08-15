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

const TYPES = ["tpa", "minat_bakat", "verbal", "numerik", "logika", "kepribadian"] as const;

type Opt = { id?: string; text: string; correct: boolean; score: number };
const blankOpts = (): Opt[] => [
  { text: "", correct: true, score: 10 },
  { text: "", correct: false, score: 0 },
  { text: "", correct: false, score: 0 },
  { text: "", correct: false, score: 0 },
];

export default function CbtManager() {
  const qc = useQueryClient();
  const [selectedTest, setSelectedTest] = useState<any>(null);

  const refresh = () =>
    qc.invalidateQueries({
      predicate: (q) => {
        const k = String(q.queryKey[0] ?? "");
        return k.startsWith("admin-cbt") || k.startsWith("cbt-");
      },
    });

  const { data: cats } = useQuery({
    queryKey: ["admin-cbt-cats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cbt_categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: tests } = useQuery({
    queryKey: ["admin-cbt-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cbt_tests")
        .select("*, cbt_categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: questions } = useQuery({
    queryKey: ["admin-cbt-qs", selectedTest?.id],
    queryFn: async () => {
      if (!selectedTest) return [];
      const { data, error } = await supabase
        .from("cbt_questions")
        .select("*, cbt_answers(*)")
        .eq("test_id", selectedTest.id)
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedTest,
  });
  const { data: stats } = useQuery({
    queryKey: ["admin-cbt-stats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("cbt_attempts").select("id", { count: "exact", head: true });
      const { count: passed } = await supabase.from("cbt_attempts").select("id", { count: "exact", head: true }).eq("passed", true);
      return { total: total ?? 0, passed: passed ?? 0 };
    },
  });

  // dialog state
  const [catDlg, setCatDlg] = useState<{ open: boolean; row?: any }>({ open: false });
  const [testDlg, setTestDlg] = useState<{ open: boolean; row?: any }>({ open: false });
  const [qDlg, setQDlg] = useState<{ open: boolean; row?: any }>({ open: false });

  const removeCat = async (id: string) => {
    if (!confirm("Hapus kategori? Tes & soal terkait juga terhapus.")) return;
    const { error } = await supabase.from("cbt_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Kategori dihapus");
    if (selectedTest) setSelectedTest(null);
    refresh();
  };
  const removeTest = async (id: string) => {
    if (!confirm("Hapus tes ini beserta soalnya?")) return;
    const { error } = await supabase.from("cbt_tests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tes dihapus");
    if (selectedTest?.id === id) setSelectedTest(null);
    refresh();
  };
  const toggleActive = async (t: any) => {
    const { error } = await supabase.from("cbt_tests").update({ is_active: !t.is_active }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(!t.is_active ? "Tes diaktifkan" : "Tes dinonaktifkan");
    refresh();
  };
  const removeQuestion = async (id: string) => {
    if (!confirm("Hapus soal ini?")) return;
    const { error } = await supabase.from("cbt_questions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Soal dihapus");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Kategori</p><p className="font-heading text-2xl font-bold">{cats?.length ?? 0}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Tes</p><p className="font-heading text-2xl font-bold">{tests?.length ?? 0}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Attempt</p><p className="font-heading text-2xl font-bold">{stats?.total ?? 0}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Lulus</p><p className="font-heading text-2xl font-bold text-primary">{stats?.passed ?? 0}</p></CardContent></Card>
      </div>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold">Kategori Tes</h3>
          <Button size="sm" onClick={() => setCatDlg({ open: true })}><Plus className="h-4 w-4 mr-1" />Kategori</Button>
        </div>
        <div className="glass-card rounded-xl divide-y divide-border">
          {(cats ?? []).map((c: any) => (
            <div key={c.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm">{c.name} <Badge variant="secondary" className="ml-2 text-[10px]">{c.type}</Badge></p>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => setCatDlg({ open: true, row: c })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => removeCat(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {(cats ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada kategori.</p>}
        </div>
      </section>

      {/* Tests */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold">Tes / Paket Soal</h3>
          <Button size="sm" onClick={() => {
            if (!(cats ?? []).length) return toast.error("Buat kategori terlebih dahulu");
            setTestDlg({ open: true });
          }}><Plus className="h-4 w-4 mr-1" />Tes</Button>
        </div>
        <div className="glass-card rounded-xl divide-y divide-border">
          {(tests ?? []).map((t: any) => (
            <div key={t.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.cbt_categories?.name} · {t.duration_minutes} mnt · lulus {t.passing_score}%</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 mr-2">
                  <Switch checked={!!t.is_active} onCheckedChange={() => toggleActive(t)} />
                  <span className="text-[10px] text-muted-foreground">{t.is_active ? "Aktif" : "Nonaktif"}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelectedTest(t)}>Kelola Soal <ChevronRight className="h-3 w-3 ml-1" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setTestDlg({ open: true, row: t })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => removeTest(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {(tests ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada tes.</p>}
        </div>
      </section>

      {/* Questions */}
      {selectedTest && (
        <section>
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="font-heading font-bold text-sm md:text-base truncate">Soal — {selectedTest.title}</h3>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => setQDlg({ open: true })}><Plus className="h-4 w-4 mr-1" />Soal</Button>
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
                      <Button size="icon" variant="ghost" onClick={() => removeQuestion(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <ul className="text-xs space-y-1 ml-4">
                    {(q.cbt_answers ?? []).map((a: any) => (
                      <li key={a.id} className={a.is_correct ? "text-primary font-medium" : "text-muted-foreground"}>
                        {a.is_correct ? "✓" : "○"} {a.answer_text} <span className="opacity-60">({a.score} pts)</span>
                      </li>
                    ))}
                  </ul>
                  {q.explanation && <p className="text-xs text-muted-foreground mt-2 italic">Pembahasan: {q.explanation}</p>}
                </CardContent>
              </Card>
            ))}
            {(questions ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada soal. Klik "Soal" untuk menambah.</p>}
          </div>
        </section>
      )}

      <CategoryDialog
        key={`cat-${catDlg.row?.id ?? "new"}-${catDlg.open}`}
        state={catDlg}
        onClose={() => setCatDlg({ open: false })}
        onSaved={refresh}
      />
      <TestDialog
        key={`test-${testDlg.row?.id ?? "new"}-${testDlg.open}`}
        state={testDlg}
        cats={cats ?? []}
        onClose={() => setTestDlg({ open: false })}
        onSaved={refresh}
      />
      {selectedTest && (
        <QuestionDialog
          key={`q-${qDlg.row?.id ?? "new"}-${qDlg.open}`}
          state={qDlg}
          testId={selectedTest.id}
          nextIndex={(questions ?? []).length}
          onClose={() => setQDlg({ open: false })}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function CategoryDialog({ state, onClose, onSaved }: { state: { open: boolean; row?: any }; onClose: () => void; onSaved: () => void }) {
  const row = state.row;
  const [name, setName] = useState(row?.name ?? "");
  const [type, setType] = useState<string>(row?.type ?? "tpa");
  const [desc, setDesc] = useState(row?.description ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error("Nama kategori wajib diisi");
    setBusy(true);
    const payload = { name: name.trim(), type: type as any, description: desc || null };
    const { error } = row
      ? await supabase.from("cbt_categories").update(payload).eq("id", row.id)
      : await supabase.from("cbt_categories").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(row ? "Kategori diperbarui" : "Kategori dibuat");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Kategori</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Tipe</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Deskripsi</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestDialog({ state, cats, onClose, onSaved }: { state: { open: boolean; row?: any }; cats: any[]; onClose: () => void; onSaved: () => void }) {
  const row = state.row;
  const [title, setTitle] = useState(row?.title ?? "");
  const [desc, setDesc] = useState(row?.description ?? "");
  const [catId, setCatId] = useState(row?.category_id ?? "");
  const [duration, setDuration] = useState(row?.duration_minutes ?? 30);
  const [passing, setPassing] = useState(row?.passing_score ?? 60);
  const [totalQ, setTotalQ] = useState(row?.total_questions ?? 10);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!catId) return toast.error("Pilih kategori");
    if (!title.trim()) return toast.error("Judul wajib diisi");
    setBusy(true);
    const payload = {
      category_id: catId,
      title: title.trim(),
      description: desc || null,
      duration_minutes: Number(duration) || 30,
      passing_score: Number(passing) || 60,
      total_questions: Number(totalQ) || 10,
    };
    const { error } = row
      ? await supabase.from("cbt_tests").update(payload).eq("id", row.id)
      : await supabase.from("cbt_tests").insert({ ...payload, is_active: true });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(row ? "Tes diperbarui" : "Tes dibuat");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Tes</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Kategori</Label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Judul</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Deskripsi</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Durasi (mnt)</Label><Input type="number" value={duration} onChange={(e) => setDuration(+e.target.value)} /></div>
            <div><Label>Passing %</Label><Input type="number" value={passing} onChange={(e) => setPassing(+e.target.value)} /></div>
            <div><Label>Jml Soal</Label><Input type="number" value={totalQ} onChange={(e) => setTotalQ(+e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuestionDialog({ state, testId, nextIndex, onClose, onSaved }: { state: { open: boolean; row?: any }; testId: string; nextIndex: number; onClose: () => void; onSaved: () => void }) {
  const row = state.row;
  const [q, setQ] = useState(row?.question_text ?? "");
  const [expl, setExpl] = useState(row?.explanation ?? "");
  const [opts, setOpts] = useState<Opt[]>(
    row?.cbt_answers?.length
      ? row.cbt_answers.map((a: any) => ({ id: a.id, text: a.answer_text, correct: a.is_correct, score: a.score }))
      : blankOpts()
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const filled = opts.filter((o) => o.text.trim());
    if (!q.trim()) return toast.error("Pertanyaan wajib diisi");
    if (filled.length < 2) return toast.error("Minimal 2 pilihan jawaban");
    if (!filled.some((o) => o.correct)) return toast.error("Tandai minimal satu jawaban benar");
    setBusy(true);

    let questionId = row?.id as string | undefined;
    if (row) {
      const { error } = await supabase
        .from("cbt_questions")
        .update({ question_text: q.trim(), explanation: expl || null })
        .eq("id", row.id);
      if (error) { setBusy(false); return toast.error(error.message); }
      await supabase.from("cbt_answers").delete().eq("question_id", row.id);
    } else {
      const { data, error } = await supabase
        .from("cbt_questions")
        .insert({ test_id: testId, question_text: q.trim(), explanation: expl || null, order_index: nextIndex })
        .select("id")
        .single();
      if (error) { setBusy(false); return toast.error(error.message); }
      questionId = data.id;
    }

    const { error: aErr } = await supabase.from("cbt_answers").insert(
      filled.map((o) => ({ question_id: questionId!, answer_text: o.text.trim(), is_correct: o.correct, score: o.score }))
    );
    setBusy(false);
    if (aErr) return toast.error(aErr.message);
    toast.success(row ? "Soal diperbarui" : "Soal disimpan");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Soal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Pertanyaan</Label><Textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3} /></div>
          <div className="space-y-2">
            <Label>Pilihan Jawaban (teks · skor · benar)</Label>
            {opts.map((o, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input className="flex-1" placeholder={`Pilihan ${i + 1}`} value={o.text} onChange={(e) => { const c = [...opts]; c[i] = { ...c[i], text: e.target.value }; setOpts(c); }} />
                <Input className="w-20" type="number" value={o.score} onChange={(e) => { const c = [...opts]; c[i] = { ...c[i], score: +e.target.value }; setOpts(c); }} />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={o.correct} onChange={(e) => { const c = [...opts]; c[i] = { ...c[i], correct: e.target.checked }; setOpts(c); }} /> Benar
                </label>
                {opts.length > 2 && (
                  <Button size="icon" variant="ghost" onClick={() => setOpts(opts.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                )}
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setOpts([...opts, { text: "", correct: false, score: 0 }])}>
              <Plus className="h-3 w-3 mr-1" />Pilihan
            </Button>
          </div>
          <div><Label>Pembahasan</Label><Textarea value={expl} onChange={(e) => setExpl(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
