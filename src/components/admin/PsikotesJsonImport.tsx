import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileJson, Loader2, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";

type ParsedQuestion = {
  category: string;
  question: string;
  options: { text: string; score: number }[];
};

type Preview = {
  fileName: string;
  valid: ParsedQuestion[];
  unknown: { category: string; question: string }[];
  counts: Record<string, number>;
};

const SAMPLE = {
  questions: [
    {
      category: "Kecemasan",
      question: "Saya merasa khawatir secara berlebihan.",
      options: [
        { text: "Tidak pernah", score: 0 },
        { text: "Kadang-kadang", score: 1 },
        { text: "Sering", score: 2 },
        { text: "Selalu", score: 3 },
      ],
    },
    {
      category: "Stress",
      question: "Saya merasa sulit mengendalikan tekanan sehari-hari.",
      options: [
        { text: "Tidak pernah", score: 0 },
        { text: "Kadang-kadang", score: 1 },
        { text: "Sering", score: 2 },
        { text: "Selalu", score: 3 },
      ],
    },
  ],
};

export default function PsikotesJsonImport({
  cats,
  onImported,
}: {
  cats: { id: string; name: string }[];
  onImported: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  const catByName = (name: string) =>
    cats.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      return toast.error("File harus berformat .json");
    }
    let json: any;
    try {
      json = JSON.parse(await file.text());
    } catch {
      return toast.error("File JSON tidak valid / rusak");
    }
    const list = Array.isArray(json) ? json : json?.questions;
    if (!Array.isArray(list) || list.length === 0) {
      return toast.error('Struktur JSON tidak sesuai — harus ada array "questions"');
    }

    const valid: ParsedQuestion[] = [];
    const unknown: { category: string; question: string }[] = [];
    const errors: string[] = [];

    list.forEach((raw: any, i: number) => {
      const no = i + 1;
      const category = typeof raw?.category === "string" ? raw.category.trim() : "";
      const question = typeof raw?.question === "string" ? raw.question.trim() : "";
      const options = raw?.options;
      if (!category) return errors.push(`Soal #${no}: kategori kosong`);
      if (!question) return errors.push(`Soal #${no}: pertanyaan kosong`);
      if (!Array.isArray(options) || options.length < 2)
        return errors.push(`Soal #${no}: minimal 2 opsi jawaban`);
      const opts: { text: string; score: number }[] = [];
      for (const o of options) {
        const text = typeof o?.text === "string" ? o.text.trim() : "";
        if (!text) return errors.push(`Soal #${no}: ada opsi tanpa teks`);
        if (typeof o?.score !== "number" || !Number.isFinite(o.score))
          return errors.push(`Soal #${no}: skor harus berupa angka`);
        opts.push({ text, score: Math.round(o.score) });
      }
      if (opts.length !== options.length) return;
      if (!catByName(category)) {
        unknown.push({ category, question });
        return;
      }
      valid.push({ category, question, options: opts });
    });

    if (errors.length) {
      toast.error(`JSON ditolak: ${errors.slice(0, 3).join(" · ")}${errors.length > 3 ? ` (+${errors.length - 3} lainnya)` : ""}`);
      if (ref.current) ref.current.value = "";
      return;
    }

    const counts: Record<string, number> = {};
    valid.forEach((v) => {
      const name = catByName(v.category)!.name;
      counts[name] = (counts[name] ?? 0) + 1;
    });

    setPreview({ fileName: file.name, valid, unknown, counts });
    if (ref.current) ref.current.value = "";
  };

  const doImport = async () => {
    if (!preview || preview.valid.length === 0) return;
    setBusy(true);
    try {
      // Group per kategori
      const groups = new Map<string, ParsedQuestion[]>();
      preview.valid.forEach((q) => {
        const cat = catByName(q.category)!;
        const arr = groups.get(cat.id) ?? [];
        arr.push(q);
        groups.set(cat.id, arr);
      });

      let inserted = 0;
      let skipped = 0;

      for (const [categoryId, items] of groups) {
        const catName = cats.find((c) => c.id === categoryId)!.name;

        // Cari tes yang sudah ada di kategori ini, kalau tidak ada buat baru
        const { data: existingTests, error: tErr } = await supabase
          .from("psikotes_tests")
          .select("id")
          .eq("category_id", categoryId)
          .order("created_at", { ascending: true })
          .limit(1);
        if (tErr) throw tErr;

        let testId = existingTests?.[0]?.id as string | undefined;
        if (!testId) {
          const { data: newTest, error: cErr } = await supabase
            .from("psikotes_tests")
            .insert({
              category_id: categoryId,
              title: `Screening ${catName}`,
              description: `Kumpulan soal screening ${catName}.`,
              is_active: true,
            })
            .select("id")
            .single();
          if (cErr) throw cErr;
          testId = newTest.id;
        }

        // Cegah duplikat: ambil soal yang sudah ada di tes ini
        const { data: existingQs, error: qErr } = await supabase
          .from("psikotes_questions")
          .select("question_text, order_index")
          .eq("test_id", testId);
        if (qErr) throw qErr;
        const existingSet = new Set((existingQs ?? []).map((q: any) => q.question_text.trim().toLowerCase()));
        let nextIndex = (existingQs ?? []).reduce((m: number, q: any) => Math.max(m, q.order_index + 1), 0);

        for (const item of items) {
          if (existingSet.has(item.question.toLowerCase())) {
            skipped++;
            continue;
          }
          const { data: q, error: insErr } = await supabase
            .from("psikotes_questions")
            .insert({ test_id: testId, question_text: item.question, order_index: nextIndex++ })
            .select("id")
            .single();
          if (insErr) throw insErr;
          const { error: aErr } = await supabase.from("psikotes_answers").insert(
            item.options.map((o) => ({ question_id: q.id, answer_text: o.text, score: o.score })),
          );
          if (aErr) throw aErr;
          existingSet.add(item.question.toLowerCase());
          inserted++;
        }
      }

      toast.success(`Berhasil import ${inserted} soal${skipped ? ` · ${skipped} duplikat dilewati` : ""}`);
      setPreview(null);
      onImported();
    } catch (e: any) {
      toast.error(e?.message ?? "Import gagal");
    } finally {
      setBusy(false);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([JSON.stringify(SAMPLE, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contoh-soal-screening.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Button size="sm" variant="outline" onClick={downloadSample}>
        <Download className="h-4 w-4 mr-1" />Contoh JSON
      </Button>
      <Button size="sm" variant="secondary" onClick={() => ref.current?.click()}>
        <FileJson className="h-4 w-4 mr-1" />Import Soal JSON
      </Button>

      <Dialog open={!!preview} onOpenChange={(o) => !o && !busy && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Import Soal</DialogTitle>
          </DialogHeader>

          {preview && (
            <div className="space-y-4">
              <div className="glass-card rounded-xl p-4 space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Nama file:</span>{" "}
                  <span className="font-medium break-all">{preview.fileName}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Total soal valid:</span>{" "}
                  <span className="font-semibold">{preview.valid.length}</span>
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(preview.counts).map(([name, n]) => (
                    <Badge key={name} variant="secondary">{name}: {n} soal</Badge>
                  ))}
                  {Object.keys(preview.counts).length === 0 && (
                    <span className="text-xs text-muted-foreground">Tidak ada soal yang bisa diimport.</span>
                  )}
                </div>
              </div>

              {preview.unknown.length > 0 && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                  <p className="text-sm font-medium flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {preview.unknown.length} soal dilewati — kategori tidak terdaftar
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[...new Set(preview.unknown.map((u) => u.category))].map((c) => (
                      <Badge key={c} variant="outline" className="text-destructive border-destructive/40">{c}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Buat kategori tersebut terlebih dahulu, atau perbaiki nama kategori di file JSON.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs md:text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="text-left p-2 w-10">No</th>
                      <th className="text-left p-2 w-32">Kategori</th>
                      <th className="text-left p-2">Pertanyaan</th>
                      <th className="text-left p-2 w-16">Opsi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.valid.map((q, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2">{catByName(q.category)!.name}</td>
                        <td className="p-2">{q.question}</td>
                        <td className="p-2">{q.options.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreview(null)} disabled={busy}>Batal</Button>
            <Button onClick={doImport} disabled={busy || !preview?.valid.length}>
              {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Mengimport...</> : "Import Soal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
