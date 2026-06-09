import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, ChevronRight, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const TYPES = ["tpa", "minat_bakat", "verbal", "numerik", "logika", "kepribadian"] as const;

export default function CbtManager() {
  const qc = useQueryClient();
  const [selectedTest, setSelectedTest] = useState<any>(null);

  const { data: cats } = useQuery({
    queryKey: ["admin-cbt-cats"],
    queryFn: async () => (await supabase.from("cbt_categories").select("*").order("name")).data ?? [],
  });
  const { data: tests } = useQuery({
    queryKey: ["admin-cbt-tests"],
    queryFn: async () => (await supabase.from("cbt_tests").select("*, cbt_categories(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: questions } = useQuery({
    queryKey: ["admin-cbt-qs", selectedTest?.id],
    queryFn: async () => selectedTest ? (await supabase.from("cbt_questions").select("*, cbt_answers(*)").eq("test_id", selectedTest.id).order("order_index")).data ?? [] : [],
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
          <CategoryDialog onSaved={() => qc.invalidateQueries({ queryKey: ["admin-cbt-cats"] })} />
        </div>
        <div className="glass-card rounded-xl divide-y divide-border">
          {(cats ?? []).map((c: any) => (
            <div key={c.id} className="p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{c.name} <Badge variant="secondary" className="ml-2 text-[10px]">{c.type}</Badge></p>
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={async () => {
                if (!confirm("Hapus kategori? Tes terkait juga akan terhapus.")) return;
                await supabase.from("cbt_categories").delete().eq("id", c.id);
                qc.invalidateQueries({ queryKey: ["admin-cbt-cats"] });
                qc.invalidateQueries({ queryKey: ["admin-cbt-tests"] });
              }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </section>

      {/* Tests */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold">Tes / Paket Soal</h3>
          <TestDialog cats={cats ?? []} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-cbt-tests"] })} />
        </div>
        <div className="glass-card rounded-xl divide-y divide-border">
          {(tests ?? []).map((t: any) => (
            <div key={t.id} className="p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.cbt_categories?.name} · {t.duration_minutes} mnt · lulus {t.passing_score}%</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setSelectedTest(t)}>Kelola Soal <ChevronRight className="h-3 w-3 ml-1" /></Button>
                <Button size="icon" variant="ghost" onClick={async () => {
                  if (!confirm("Hapus tes ini?")) return;
                  await supabase.from("cbt_tests").delete().eq("id", t.id);
                  qc.invalidateQueries({ queryKey: ["admin-cbt-tests"] });
                }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Questions for selected test */}
      {selectedTest && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold">Soal — {selectedTest.title}</h3>
            <div className="flex gap-2">
              <QuestionDialog testId={selectedTest.id} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-cbt-qs", selectedTest.id] })} />
              <Button variant="ghost" size="sm" onClick={() => setSelectedTest(null)}>Tutup</Button>
            </div>
          </div>
          <div className="space-y-3">
            {(questions ?? []).map((q: any, i: number) => (
              <Card key={q.id} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm"><b>{i + 1}.</b> {q.question_text}</p>
                    <Button size="icon" variant="ghost" onClick={async () => {
                      if (!confirm("Hapus soal?")) return;
                      await supabase.from("cbt_questions").delete().eq("id", q.id);
                      qc.invalidateQueries({ queryKey: ["admin-cbt-qs", selectedTest.id] });
                    }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  <ul className="text-xs space-y-1 ml-4">
                    {q.cbt_answers.map((a: any) => (
                      <li key={a.id} className={a.is_correct ? "text-primary font-medium" : "text-muted-foreground"}>
                        {a.is_correct ? "✓" : "○"} {a.answer_text} <span className="opacity-60">({a.score} pts)</span>
                      </li>
                    ))}
                  </ul>
                  {q.explanation && <p className="text-xs text-muted-foreground mt-2 italic">Pembahasan: {q.explanation}</p>}
                </CardContent>
              </Card>
            ))}
            {(questions ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Belum ada soal. Klik "Tambah Soal".</p>}
          </div>
        </section>
      )}
    </div>
  );
}

function CategoryDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [type, setType] = useState<string>("tpa"); const [desc, setDesc] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Kategori</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Kategori</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Tipe</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Deskripsi</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={async () => {
            const { error } = await supabase.from("cbt_categories").insert({ name, type: type as any, description: desc });
            if (error) toast.error(error.message); else { toast.success("Kategori dibuat"); setOpen(false); setName(""); setDesc(""); onSaved(); }
          }}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestDialog({ cats, onSaved }: { cats: any[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState("");
  const [catId, setCatId] = useState(""); const [duration, setDuration] = useState(30); const [passing, setPassing] = useState(60); const [totalQ, setTotalQ] = useState(10);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Tes</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Tes</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Kategori</Label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
              <SelectContent>{cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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
        <DialogFooter>
          <Button onClick={async () => {
            if (!catId) { toast.error("Pilih kategori"); return; }
            const { error } = await supabase.from("cbt_tests").insert({ category_id: catId, title, description: desc, duration_minutes: duration, passing_score: passing, total_questions: totalQ });
            if (error) toast.error(error.message); else { toast.success("Tes dibuat"); setOpen(false); onSaved(); setTitle(""); setDesc(""); }
          }}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuestionDialog({ testId, onSaved }: { testId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(""); const [expl, setExpl] = useState("");
  const [opts, setOpts] = useState([{ text: "", correct: true, score: 10 }, { text: "", correct: false, score: 0 }, { text: "", correct: false, score: 0 }, { text: "", correct: false, score: 0 }]);

  const save = async () => {
    const { data: ins, error } = await supabase.from("cbt_questions").insert({ test_id: testId, question_text: q, explanation: expl, order_index: 0 }).select().single();
    if (error) { toast.error(error.message); return; }
    const rows = opts.filter(o => o.text.trim()).map(o => ({ question_id: ins.id, answer_text: o.text, is_correct: o.correct, score: o.score }));
    await supabase.from("cbt_answers").insert(rows);
    toast.success("Soal disimpan"); setOpen(false); setQ(""); setExpl(""); setOpts([{ text: "", correct: true, score: 10 }, { text: "", correct: false, score: 0 }, { text: "", correct: false, score: 0 }, { text: "", correct: false, score: 0 }]);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Soal</Button></DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Tambah Soal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Pertanyaan</Label><Textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3} /></div>
          <div className="space-y-2">
            <Label>Pilihan Jawaban</Label>
            {opts.map((o, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input className="flex-1" placeholder={`Pilihan ${i + 1}`} value={o.text} onChange={(e) => { const c = [...opts]; c[i].text = e.target.value; setOpts(c); }} />
                <Input className="w-20" type="number" value={o.score} onChange={(e) => { const c = [...opts]; c[i].score = +e.target.value; setOpts(c); }} />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={o.correct} onChange={(e) => { const c = [...opts]; c[i].correct = e.target.checked; setOpts(c); }} /> Benar
                </label>
              </div>
            ))}
          </div>
          <div><Label>Pembahasan</Label><Textarea value={expl} onChange={(e) => setExpl(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
