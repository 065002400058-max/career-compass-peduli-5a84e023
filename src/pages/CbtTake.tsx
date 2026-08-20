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
import { Clock, Trophy, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const RECOMMEND: Record<string, string> = {
  tpa: "Cocok untuk bidang akademik, riset, dan analisis.",
  minat_bakat: "Eksplorasi karier sesuai bidang yang paling Anda minati.",
  verbal: "Cocok untuk komunikasi, jurnalistik, hukum, atau public relations.",
  numerik: "Cocok untuk akuntansi, keuangan, data analyst, atau engineering.",
  logika: "Cocok untuk programming, sistem, manajemen, dan problem solving.",
  kepribadian: "Pahami diri untuk memilih lingkungan kerja yang tepat.",
};

const CbtTake = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const submittingRef = useRef(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<null | {
    score: number; max: number; pct: number; passed: boolean; rec: string;
  }>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);


  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["cbt-take", id],
    queryFn: async () => {
      const { data: test } = await supabase.from("cbt_tests").select("*, cbt_categories(name, type)").eq("id", id).single();
      const { data: qs } = await supabase.from("cbt_questions").select("*, cbt_answers(*)").eq("test_id", id).order("order_index");
      return { test, questions: qs ?? [] };
    },
    enabled: !!id && !!user,
  });

  useEffect(() => {
    if (!data?.test || submitted) return;
    setTimeLeft(data.test.duration_minutes * 60);
  }, [data?.test, submitted]);

  useEffect(() => {
    if (!data?.test || submitted) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { handleSubmit(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [data?.test, submitted]);

  const handleSubmit = async () => {
    if (!data?.test || !user) return;
    if (submitted || submittingRef.current) return;
    submittingRef.current = true; // cegah duplikat (klik ganda / timer habis bersamaan)
    let total = 0, max = 0;
    const rows: any[] = [];
    for (const q of data.questions as any[]) {
      const maxQ = Math.max(0, ...q.cbt_answers.map((a: any) => a.score));
      max += maxQ;
      const chosenId = answers[q.id];
      const chosen = q.cbt_answers.find((a: any) => a.id === chosenId);
      const score = chosen?.score ?? 0;
      total += score;
      rows.push({ question_id: q.id, answer_id: chosenId ?? null, score });
    }
    const pct = max > 0 ? (total / max) * 100 : 0;
    const passed = pct >= (data.test.passing_score ?? 0);
    const rec = RECOMMEND[data.test.cbt_categories?.type] ?? "Pertimbangkan bidang yang sesuai minat Anda.";

    const { data: attempt, error } = await supabase.from("cbt_attempts").insert({
      user_id: user.id, test_id: data.test.id, total_score: total, max_score: max,
      percentage: pct, passed, recommendation: rec, completed_at: new Date().toISOString(),
    }).select().single();

    if (error) {
      submittingRef.current = false;
      toast.error("Gagal menyimpan hasil");
      return;
    }
    const { error: ansErr } = await supabase
      .from("cbt_attempt_answers")
      .insert(rows.map(r => ({ ...r, attempt_id: attempt.id })));
    if (ansErr) toast.error("Hasil tersimpan, tetapi detail jawaban gagal disimpan");
    setSubmitted({ score: total, max, pct, passed, rec });
    ["me-cbt", "me-psikotes", "me-referrals", "cbt-attempts", "santri-center", "monitoring"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] })
    );
  };


  const answered = Object.keys(answers).length;
  const totalQ = data?.questions.length ?? 0;
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  if (loading || isLoading || !data?.test) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat tes...</div>;

  if (submitted) {
    return (
      <div className="min-h-screen gradient-bg-subtle">
        <div className="container mx-auto section-padding max-w-2xl">
          <Card className="glass-card">
            <CardHeader className="text-center">
              {submitted.passed ? <CheckCircle2 className="h-16 w-16 mx-auto text-primary" /> : <Trophy className="h-16 w-16 mx-auto text-accent-foreground" />}
              <CardTitle className="text-3xl mt-3">Tes Selesai!</CardTitle>
              <p className="text-muted-foreground">{data.test.title}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="text-center">
                <div className="font-heading text-6xl font-bold text-primary">{submitted.pct.toFixed(0)}%</div>
                <p className="text-sm text-muted-foreground mt-1">Skor: {submitted.score} / {submitted.max}</p>
                <Badge variant={submitted.passed ? "default" : "secondary"} className="mt-3">{submitted.passed ? "LULUS" : "Selesai"}</Badge>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <h4 className="font-heading font-semibold mb-1 text-sm">💡 Rekomendasi</h4>
                <p className="text-sm text-muted-foreground">{submitted.rec}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/cbt")}>Kembali ke Daftar</Button>
                <Button className="flex-1" onClick={() => navigate("/cbt")}>Daftar Tes</Button>
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
        <Button variant="ghost" size="sm" onClick={() => navigate("/cbt")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" />Kembali</Button>

        <Card className="glass-card mb-4 sticky top-20 z-10">
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-heading font-bold">{data.test.title}</h2>
              <p className="text-xs text-muted-foreground">Terjawab {answered} / {totalQ}</p>
            </div>
            <div className="flex items-center gap-2 text-primary font-mono font-bold text-lg">
              <Clock className="h-4 w-4" />{mm}:{ss}
            </div>
          </CardContent>
          <div className="px-4 pb-3"><Progress value={(answered / Math.max(totalQ, 1)) * 100} /></div>
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
                  {q.cbt_answers.map((a: any) => (
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
          <Button variant="outline" className="flex-1" onClick={() => navigate("/cbt")}><XCircle className="h-4 w-4 mr-1" />Batal</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={answered === 0}>Submit Jawaban</Button>
        </div>
      </div>
    </div>
  );
};

export default CbtTake;
