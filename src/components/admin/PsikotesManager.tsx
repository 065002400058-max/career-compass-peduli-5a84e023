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
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function PsikotesManager() {
  const qc = useQueryClient();
  const [selectedTest, setSelectedTest] = useState<any>(null);

  const { data: cats } = useQuery({ queryKey: ["admin-psi-cats"], queryFn: async () => (await supabase.from("psikotes_categories").select("*").order("name")).data ?? [] });
  const { data: tests } = useQuery({ queryKey: ["admin-psi-tests"], queryFn: async () => (await supabase.from("psikotes_tests").select("*, psikotes_categories(name)").order("created_at", { ascending: false })).data ?? [] });
  const { data: questions } = useQuery({
    queryKey: ["admin-psi-qs", selectedTest?.id],
    queryFn: async () => selectedTest ? (await supabase.from("psikotes_questions").select("*, psikotes_answers(*)").eq("test_id", selectedTest.id).order("order_index")).data ?? [] : [],
    enabled: !!selectedTest,
  });
  const { data: results } = useQuery({
    queryKey: ["admin-psi-results", selectedTest?.id],
    queryFn: async () => selectedTest ? (await supabase.from("psikotes_results").select("*").eq("test_id", selectedTest.id).order("min_score")).data ?? [] : [],
    enabled: !!selectedTest,
  });
  const { data: stats } = useQuery({
    queryKey: ["admin-psi-stats"],
    queryFn: async () => {
      const { count } = await supabase.from("psikotes_attempts").select("id", { count: "exact", head: true });
      return { total: count ?? 0 };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Kategori</p><p className="font-heading text-2xl font-bold">{cats?.length ?? 0}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Tes</p><p className="font-heading text-2xl font-bold">{tests?.length ?? 0}</p></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Attempt</p><p className="font-heading text-2xl font-bold">{stats?.total ?? 0}</p></CardContent></Card>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold">Kategori Psikotes</h3>
          <PsiCatDialog onSaved={() => qc.invalidateQueries({ queryKey: ["admin-psi-cats"] })} />
        </div>
        <div className="glass-card rounded-xl divide-y divide-border">
          {(cats ?? []).map((c: any) => (
            <div key={c.id} className="p-3 flex items-center justify-between gap-3">
              <div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.description}</p></div>
              <Button size="icon" variant="ghost" onClick={async () => {
                if (!confirm("Hapus kategori?")) return;
                await supabase.from("psikotes_categories").delete().eq("id", c.id);
                qc.invalidateQueries({ queryKey: ["admin-psi-cats"] });
              }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold">Tes Psikotes</h3>
          <PsiTestDialog cats={cats ?? []} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-psi-tests"] })} />
        </div>
        <div className="glass-card rounded-xl divide-y divide-border">
          {(tests ?? []).map((t: any) => (
            <div key={t.id} className="p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.psikotes_categories?.name}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setSelectedTest(t)}>Kelola <ChevronRight className="h-3 w-3 ml-1" /></Button>
                <Button size="icon" variant="ghost" onClick={async () => {
                  if (!confirm("Hapus tes?")) return;
                  await supabase.from("psikotes_tests").delete().eq("id", t.id);
                  qc.invalidateQueries({ queryKey: ["admin-psi-tests"] });
                }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedTest && (
        <>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold">Pertanyaan — {selectedTest.title}</h3>
              <div className="flex gap-2">
                <PsiQuestionDialog testId={selectedTest.id} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-psi-qs", selectedTest.id] })} />
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
                        if (!confirm("Hapus?")) return;
                        await supabase.from("psikotes_questions").delete().eq("id", q.id);
                        qc.invalidateQueries({ queryKey: ["admin-psi-qs", selectedTest.id] });
                      }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    <ul className="text-xs space-y-1 ml-4">
                      {q.psikotes_answers.map((a: any) => <li key={a.id} className="text-muted-foreground">○ {a.answer_text} <Badge variant="secondary" className="ml-1 text-[10px]">{a.score}</Badge></li>)}
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
              <PsiResultDialog testId={selectedTest.id} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-psi-results", selectedTest.id] })} />
            </div>
            <div className="glass-card rounded-xl divide-y divide-border">
              {(results ?? []).map((r: any) => (
                <div key={r.id} className="p-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Skor {r.min_score}–{r.max_score} <Badge variant="secondary" className="ml-2">{r.level}</Badge></p>
                    <p className="text-xs text-muted-foreground mt-1">{r.conclusion}</p>
                    <p className="text-xs text-primary mt-1 italic">💡 {r.recommendation}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={async () => {
                    if (!confirm("Hapus?")) return;
                    await supabase.from("psikotes_results").delete().eq("id", r.id);
                    qc.invalidateQueries({ queryKey: ["admin-psi-results", selectedTest.id] });
                  }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              {(results ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-6 px-4">Belum ada template hasil.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function PsiCatDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false); const [name, setName] = useState(""); const [desc, setDesc] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Kategori</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Kategori</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Deskripsi</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={async () => {
          const { error } = await supabase.from("psikotes_categories").insert({ name, description: desc });
          if (error) toast.error(error.message); else { toast.success("Tersimpan"); setOpen(false); setName(""); setDesc(""); onSaved(); }
        }}>Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PsiTestDialog({ cats, onSaved }: { cats: any[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false); const [catId, setCatId] = useState(""); const [title, setTitle] = useState(""); const [desc, setDesc] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Tes</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Tes</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Kategori</Label>
            <Select value={catId} onValueChange={setCatId}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>{cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Judul</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Deskripsi</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={async () => {
          if (!catId) { toast.error("Pilih kategori"); return; }
          const { error } = await supabase.from("psikotes_tests").insert({ category_id: catId, title, description: desc });
          if (error) toast.error(error.message); else { toast.success("Tersimpan"); setOpen(false); setTitle(""); setDesc(""); onSaved(); }
        }}>Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PsiQuestionDialog({ testId, onSaved }: { testId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState("");
  const [opts, setOpts] = useState([{ text: "Tidak pernah", score: 0 }, { text: "Kadang-kadang", score: 1 }, { text: "Sering", score: 2 }, { text: "Selalu", score: 3 }]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Pertanyaan</Button></DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Tambah Pertanyaan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Pertanyaan</Label><Textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3} /></div>
          <div className="space-y-2"><Label>Pilihan Jawaban (skor)</Label>
            {opts.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input className="flex-1" value={o.text} onChange={(e) => { const c = [...opts]; c[i].text = e.target.value; setOpts(c); }} />
                <Input className="w-24" type="number" value={o.score} onChange={(e) => { const c = [...opts]; c[i].score = +e.target.value; setOpts(c); }} />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter><Button onClick={async () => {
          const { data: ins, error } = await supabase.from("psikotes_questions").insert({ test_id: testId, question_text: q, order_index: 0 }).select().single();
          if (error) { toast.error(error.message); return; }
          await supabase.from("psikotes_answers").insert(opts.filter(o => o.text.trim()).map(o => ({ question_id: ins.id, answer_text: o.text, score: o.score })));
          toast.success("Tersimpan"); setOpen(false); setQ(""); onSaved();
        }}>Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PsiResultDialog({ testId, onSaved }: { testId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(0); const [max, setMax] = useState(5); const [level, setLevel] = useState("Ringan"); const [concl, setConcl] = useState(""); const [rec, setRec] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Hasil</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Template Hasil</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Min</Label><Input type="number" value={min} onChange={(e) => setMin(+e.target.value)} /></div>
            <div><Label>Max</Label><Input type="number" value={max} onChange={(e) => setMax(+e.target.value)} /></div>
            <div><Label>Level</Label>
              <Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Ringan", "Sedang", "Tinggi", "Rendah"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Kesimpulan</Label><Textarea value={concl} onChange={(e) => setConcl(e.target.value)} /></div>
          <div><Label>Saran Konseling</Label><Textarea value={rec} onChange={(e) => setRec(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={async () => {
          const { error } = await supabase.from("psikotes_results").insert({ test_id: testId, min_score: min, max_score: max, level, conclusion: concl, recommendation: rec });
          if (error) toast.error(error.message); else { toast.success("Tersimpan"); setOpen(false); setConcl(""); setRec(""); onSaved(); }
        }}>Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
