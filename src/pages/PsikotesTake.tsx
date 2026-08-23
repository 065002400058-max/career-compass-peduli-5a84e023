import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { HeartPulse, ArrowLeft, Info } from "lucide-react";
import { toast } from "sonner";
import { decodeId } from "@/lib/publicId";
import { POSITIVE_MESSAGE, DISCLAIMER } from "@/lib/psikotesScoring";

const PsikotesTake = () => {
  const { id: rawId } = useParams();
  const id = decodeId(rawId);
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const submittingRef = useRef(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<null | { score: string; level: string; conclusion: string; recommendation: string }>(null);


  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["psi-take", id],
    queryFn: async () => {
      // Opsi jawaban lewat fungsi sanitasi (tanpa kolom score) agar bobot
      // jawaban tidak pernah dikirim ke browser. Skor dihitung di server.
      const { data: test } = await supabase.from("psikotes_tests").select("*, psikotes_categories(name)").eq("id", id).single();
      const { data: qs } = await supabase.from("psikotes_questions").select("*").eq("test_id", id).order("order_index");
      const { data: opts } = await supabase.rpc("psikotes_answer_options", { _test_id: id as string });
      const byQuestion: Record<string, { id: string; answer_text: string }[]> = {};
      (opts ?? []).forEach((o) => { (byQuestion[o.question_id] ??= []).push({ id: o.id, answer_text: o.answer_text }); });
      const questions = (qs ?? []).map((q: any) => ({ ...q, options: byQuestion[q.id] ?? [] }));
      return { test, questions };
    },
    enabled: !!id && !!user,
  });

  const handleSubmit = async () => {
    if (!data?.test || !user) return;
    if (result || submittingRef.current) return;
    submittingRef.current = true; // cegah simpan ganda saat tombol ditekan berkali-kali
    // Skor & interpretasi dihitung di server (submit_psikotes_attempt) —
    // bobot jawaban tidak pernah dikirim ke browser.
    const { data: res, error } = await supabase.rpc("submit_psikotes_attempt", {
      _test_id: data.test.id,
      _answers: answers,
    });
    if (error) {
      submittingRef.current = false;
      toast.error("Gagal menyimpan");
      return;
    }
    const r = res as { display_score: number; level: string; conclusion: string; recommendation: string };
    setResult({ score: String(r.display_score), level: r.level, conclusion: r.conclusion, recommendation: r.recommendation });
    ["me-psikotes", "me-cbt", "me-referrals", "santri-center", "screening-insights", "monitoring"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] })
    );
  };



  const answered = Object.keys(answers).length;
  const totalQ = data?.questions.length ?? 0;

  if (loading || isLoading || !data?.test) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;

  if (result) {
    const l = result.level.toLowerCase();
    const variant = l.includes("tinggi") && !l.includes("resiliensi tinggi") ? "destructive"
      : l.includes("kemungkinan gejala") ? "destructive"
      : l.includes("rendah") && l.includes("resiliensi") ? "destructive"
      : l.includes("sedang") ? "secondary" : "default";
    return (
      <div className="min-h-screen gradient-bg-subtle">
        <div className="container mx-auto section-padding max-w-2xl">
          <Card className="glass-card">
            <CardHeader className="text-center">
              <HeartPulse className="h-16 w-16 mx-auto text-primary" />
              <CardTitle className="text-3xl mt-3">Hasil Tes</CardTitle>
              <p className="text-muted-foreground">{data.test.title}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-card/60 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Kategori Hasil</p>
                  <Badge variant={variant as any} className="text-sm px-3 py-1 whitespace-normal">{result.level}</Badge>
                </div>
                <div className="rounded-lg border border-border bg-card/60 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Skor Anda</p>
                  <p className="font-heading text-3xl font-bold text-primary">{result.score}</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <h4 className="font-heading font-semibold mb-1 text-sm">📋 Kesimpulan</h4>
                <p className="text-sm text-muted-foreground">{result.conclusion}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
                <h4 className="font-heading font-semibold mb-1 text-sm">💡 Saran & Konseling</h4>
                <p className="text-sm text-foreground">{result.recommendation}</p>
              </div>
              <div className="rounded-lg bg-accent/40 p-4 border border-border">
                <h4 className="font-heading font-semibold mb-1 text-sm">🌱 Pesan Positif</h4>
                <p className="text-sm text-muted-foreground">{POSITIVE_MESSAGE}</p>
              </div>
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {DISCLAIMER}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/psikotes")}>Selesai</Button>
                <Button className="flex-1" onClick={() => navigate("/chat")}>Tanya AI Konselor</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/psikotes")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" />Kembali</Button>

        <Card className="glass-card mb-4 sticky top-20 z-10">
          <CardContent className="p-4">
            <h2 className="font-heading font-bold">{data.test.title}</h2>
            <p className="text-xs text-muted-foreground mb-2">Terjawab {answered} / {totalQ}</p>
            <Progress value={(answered / Math.max(totalQ, 1)) * 100} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {(data.questions as any[]).map((q, i) => (
            <Card key={q.id} className="glass-card">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Badge variant="secondary" className="shrink-0">{i + 1}</Badge>
                  <CardTitle className="text-base leading-relaxed">{q.question_text}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup value={answers[q.id] ?? ""} onValueChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}>
                  {q.options.map((a: any) => (
                    <Label key={a.id} htmlFor={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors">
                      <RadioGroupItem value={a.id} id={a.id} />
                      <span className="text-sm">{a.answer_text}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/psikotes")}>Batal</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={answered < totalQ}>Submit Jawaban</Button>
        </div>
      </div>
    </div>
  );
};

export default PsikotesTake;
