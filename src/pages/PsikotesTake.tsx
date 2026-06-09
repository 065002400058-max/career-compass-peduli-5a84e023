import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { HeartPulse, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const PsikotesTake = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<null | { score: number; level: string; conclusion: string; recommendation: string }>(null);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["psi-take", id],
    queryFn: async () => {
      const { data: test } = await supabase.from("psikotes_tests").select("*, psikotes_categories(name)").eq("id", id).single();
      const { data: qs } = await supabase.from("psikotes_questions").select("*, psikotes_answers(*)").eq("test_id", id).order("order_index");
      const { data: rs } = await supabase.from("psikotes_results").select("*").eq("test_id", id);
      return { test, questions: qs ?? [], results: rs ?? [] };
    },
    enabled: !!id && !!user,
  });

  const handleSubmit = async () => {
    if (!data?.test || !user) return;
    let total = 0;
    const answerData: any[] = [];
    for (const q of data.questions as any[]) {
      const chosen = q.psikotes_answers.find((a: any) => a.id === answers[q.id]);
      const sc = chosen?.score ?? 0;
      total += sc;
      answerData.push({ question_id: q.id, answer_id: chosen?.id, score: sc });
    }
    const matched = (data.results as any[]).find(r => total >= r.min_score && total <= r.max_score);
    const level = matched?.level ?? "Tidak diketahui";
    const conclusion = matched?.conclusion ?? "Hasil tidak dapat diinterpretasikan.";
    const recommendation = matched?.recommendation ?? "Konsultasikan ke konselor.";

    const { error } = await supabase.from("psikotes_attempts").insert({
      user_id: user.id, test_id: data.test.id, total_score: total,
      level, conclusion, recommendation, answers: answerData,
    });
    if (error) { toast.error("Gagal menyimpan"); return; }
    setResult({ score: total, level, conclusion, recommendation });
  };

  const answered = Object.keys(answers).length;
  const totalQ = data?.questions.length ?? 0;

  if (loading || isLoading || !data?.test) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;

  if (result) {
    const variant = result.level === "Tinggi" ? "destructive" : result.level === "Sedang" ? "secondary" : "default";
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
              <div className="text-center">
                <Badge variant={variant as any} className="text-base px-4 py-1">{result.level}</Badge>
                <p className="text-sm text-muted-foreground mt-2">Skor Anda: <b>{result.score}</b></p>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <h4 className="font-heading font-semibold mb-1 text-sm">📋 Kesimpulan</h4>
                <p className="text-sm text-muted-foreground">{result.conclusion}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
                <h4 className="font-heading font-semibold mb-1 text-sm">💡 Saran & Konseling</h4>
                <p className="text-sm text-foreground">{result.recommendation}</p>
              </div>
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
                  {q.psikotes_answers.map((a: any) => (
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
